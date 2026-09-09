import { toISODate } from '@/utils/format';
import type { PaymentMethod, TransactionType } from '@/types';
import type { SmsMessage } from '@/modules/sms-inbox';

/**
 * Turns bank and UPI alert SMS into transaction candidates.
 *
 * Every bank writes these differently and none of them promise a format, so
 * this is a heuristic and is treated as one: nothing it produces is saved
 * without the person seeing it first, on the import screen. When it is unsure
 * it drops the message rather than guessing - a missed transaction is a
 * nuisance, an invented one corrupts the ledger.
 */

export interface ParsedSms {
  smsId: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  date: string;
  note: string;
  paymentMethod: PaymentMethod;
  /** Kept so the import screen can show what it read this out of. */
  sender: string;
  body: string;
}

const MONEY_OUT = /\b(debited|debit|spent|withdrawn|withdrawal|paid|purchased?|deducted|sent)\b/i;
// `credit` on its own is money in; "credit card" is the instrument a payment
// went out on, and matching it here would make every card spend ambiguous.
const MONEY_IN = /\b(?:credited|received|deposited|refunded)\b|\bcredit\b(?!\s*card)/i;

/** A real alert names the instrument the money moved through. */
const INSTRUMENT = /\b(a\/c|ac|acct|account|card|upi|vpa|wallet|bank)\b/i;

/**
 * Anything here means the message is not a completed transaction: one-time
 * passwords, reminders about money that has not moved yet, failures, and the
 * marketing that shares the same senders.
 */
const NOT_A_TRANSACTION = [
  /\b(otp|one[\s-]?time\s?password|verification code|do not share)\b/i,
  /\b(will be|would be|shall be|is due|due on|due by|reminder|requested|requesting|request for)\b/i,
  /\b(failed|declined|unsuccessful|reversed|cancelled|canceled|pending)\b/i,
  /\b(offer|cashback|discount|congratulations|apply now|click here|loan)\b/i,
  /\b(avl|available)\s(bal|balance)\b.*\bas on\b/i,
];

/**
 * Ordered: the first hit wins, so keep the specific patterns above the loose
 * ones. `1,250.00` and `1250` both have to parse, and `A/c XX1234` must not.
 */
const AMOUNT_PATTERNS = [
  /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
  /([\d,]+(?:\.\d{1,2})?)\s*(?:rs\.?|inr|₹)/i,
  /\b(?:debited|credited|spent|paid|received|deducted)\s*(?:by|with|for|of|amount)?\s*([\d,]+(?:\.\d{1,2})?)/i,
];

/** Sanity ceiling. Above this it is far likelier a card or reference number. */
const MAX_AMOUNT = 10_000_000;

const PAYMENT_PATTERNS: [RegExp, PaymentMethod][] = [
  [/\b(upi|vpa)\b|@[a-z]{2,}/i, 'UPI'],
  [/\b(card|pos|swipe)\b/i, 'Card'],
  [/\b(neft|imps|rtgs|transfer|trf|netbanking)\b/i, 'Bank Transfer'],
  [/\b(atm|cash)\b/i, 'Cash'],
];

/**
 * Merchant keywords to categories. Deliberately short: it covers the handful of
 * places most people spend most weeks, and everything else falls to "Other",
 * which is one tap to fix on the import screen.
 */
const CATEGORY_PATTERNS: [RegExp, string][] = [
  [/\b(swiggy|zomato|dominos|mcdonald|starbucks|cafe|restaurant|eatery|dineout|kfc)\b/i, 'food'],
  [/\b(bigbasket|blinkit|zepto|instamart|dmart|grocer|supermarket|reliance fresh)\b/i, 'groceries'],
  [/\b(uber|ola|rapido|irctc|metro|petrol|fuel|hpcl|bpcl|iocl|shell|parking|toll|fastag)\b/i, 'transport'],
  [/\b(amazon|flipkart|myntra|ajio|meesho|nykaa|shop|store|mall|decathlon|ikea)\b/i, 'shopping'],
  [/\b(electricity|water bill|gas|recharge|airtel|jio|vodafone|bsnl|broadband|tata power|bescom|postpaid|prepaid|bill payment)\b/i, 'bills'],
  [/\b(rent|landlord|housing|maintenance|society|nobroker)\b/i, 'rent'],
  [/\b(pharma|pharmacy|apollo|medplus|hospital|clinic|doctor|diagnostic|1mg|pharmeasy|gym|fitness|cult)\b/i, 'health'],
  [/\b(bookmyshow|pvr|inox|cinema|movie|gaming|steam|playstation)\b/i, 'entertainment'],
  [/\b(school|college|university|tuition|course|udemy|coursera|byju|unacademy|exam fee)\b/i, 'education'],
  [/\b(makemytrip|goibibo|yatra|cleartrip|airbnb|oyo|hotel|indigo|vistara|spicejet|airlines|flight)\b/i, 'travel'],
  [/\b(netflix|spotify|prime video|hotstar|youtube premium|subscription|icloud|google one|adobe|renewal)\b/i, 'subscriptions'],
];

const INCOME_CATEGORY_PATTERNS: [RegExp, string][] = [
  [/\b(salary|payroll|wages|stipend)\b/i, 'salary'],
  [/\b(refund|cashback)\b/i, 'refund'],
  [/\b(interest|dividend|maturity|redemption|mutual fund)\b/i, 'investments'],
  [/\b(freelance|invoice|consulting)\b/i, 'freelance'],
];

/**
 * A shortcode like "AD-HDFCBK" is a business sender; a plain phone number is a
 * person, and a person texting about money is not a bank alert.
 */
function isBusinessSender(address: string): boolean {
  const cleaned = address.replace(/[\s()-]/g, '');
  return cleaned.length > 0 && !/^\+?\d{6,}$/.test(cleaned);
}

function matchFirst<T>(text: string, patterns: [RegExp, T][]): T | undefined {
  return patterns.find(([pattern]) => pattern.test(text))?.[1];
}

function parseAmount(body: string): number | null {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = body.match(pattern);
    if (!match) continue;
    const value = Number(match[1].replace(/,/g, ''));
    if (Number.isFinite(value) && value > 0 && value < MAX_AMOUNT) return value;
  }
  return null;
}

/**
 * Pulls the counterparty out of the "... to VPA raju@okhdfc ..." /
 * "... at AMAZON on ..." shapes, stopping at the next clause so reference
 * numbers and balances do not get swept into the note.
 */
const MERCHANT_PATTERN =
  /\b(?:trf to|transferred to|to vpa|to|at|towards|from)\s+([A-Za-z][A-Za-z0-9@._&'*\- ]{1,39}?)(?=\s+(?:on|ref|refno|upi|txn|info|avl|bal|dated|via|your|the|a\/c)\b|[.,;!()\n]|$)/i;

function parseMerchant(body: string): string {
  const raw = body.match(MERCHANT_PATTERN)?.[1]?.trim();
  if (!raw) return '';
  // Account masks ("XX1234", "X5678") match the shape but name nothing.
  if (/^x+\d+$/i.test(raw)) return '';
  return raw.replace(/\s+/g, ' ');
}

/** Returns null for anything that is not confidently a completed transaction. */
export function parseSms(message: SmsMessage): ParsedSms | null {
  const body = message.body ?? '';
  if (!body || !isBusinessSender(message.address ?? '')) return null;
  if (NOT_A_TRANSACTION.some((pattern) => pattern.test(body))) return null;
  if (!INSTRUMENT.test(body)) return null;

  const out = MONEY_OUT.test(body);
  const inbound = MONEY_IN.test(body);
  // Both or neither means the message is describing something else - a
  // statement, a transfer summary - and which way the money went is a guess.
  if (out === inbound) return null;

  const amount = parseAmount(body);
  if (amount === null) return null;

  const type: TransactionType = out ? 'expense' : 'income';
  const merchant = parseMerchant(body);
  const haystack = `${merchant} ${body}`;

  return {
    smsId: message.id,
    type,
    amount,
    categoryId:
      type === 'income'
        ? matchFirst(haystack, INCOME_CATEGORY_PATTERNS) ?? 'income-other'
        : matchFirst(haystack, CATEGORY_PATTERNS) ?? 'other',
    date: toISODate(new Date(message.date)),
    note: merchant || message.address,
    paymentMethod: matchFirst(body, PAYMENT_PATTERNS) ?? 'Other',
    sender: message.address,
    body,
  };
}

/** Parses a batch, dropping the misses and anything already imported. */
export function parseInbox(messages: SmsMessage[], importedIds: Set<string>): ParsedSms[] {
  const seen = new Set<string>();
  const parsed: ParsedSms[] = [];
  for (const message of messages) {
    if (importedIds.has(message.id) || seen.has(message.id)) continue;
    const candidate = parseSms(message);
    if (!candidate) continue;
    seen.add(message.id);
    parsed.push(candidate);
  }
  return parsed;
}
