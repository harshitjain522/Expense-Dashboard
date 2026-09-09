import assert from 'node:assert/strict';

import { parseInbox, parseSms } from '@/utils/smsParser';
import type { SmsMessage } from '@/modules/sms-inbox';

/**
 * Run with `npm run test:parser`. Bank SMS is the one input this app cannot
 * control the shape of, so the formats that have to keep working live here as
 * literal strings - if a regex tweak breaks one, this says which.
 */

// 2026-09-05, local midday, so the ISO date is the same in every timezone.
const SENT_AT = new Date(2026, 8, 5, 12, 0, 0).getTime();

function sms(body: string, address = 'AD-HDFCBK'): SmsMessage {
  return { id: `sms-${body.length}-${address}`, address, body, date: SENT_AT };
}

const KEEP: [string, { type: string; amount: number; method: string; category?: string }][] = [
  [
    'Rs.450.00 debited from A/c XX1234 on 05-09-26 to VPA swiggy@okicici (UPI Ref 123456789). -HDFC Bank',
    { type: 'expense', amount: 450, method: 'UPI', category: 'food' },
  ],
  [
    'INR 1,250.00 spent on your HDFC Bank Credit Card xx1234 at AMAZON on 05-09-26.',
    { type: 'expense', amount: 1250, method: 'Card', category: 'shopping' },
  ],
  [
    'Your A/c XX5678 is credited with Rs 50000.00 on 01-09-26 by SALARY AUG. -SBI',
    { type: 'income', amount: 50000, method: 'Other', category: 'salary' },
  ],
  [
    'A/C X1234 debited by 199.0 on date 05Sep26 trf to NETFLIX Refno 998877 -Axis Bank',
    { type: 'expense', amount: 199, method: 'Bank Transfer', category: 'subscriptions' },
  ],
  [
    'Rs 2000 withdrawn from ATM at KORAMANGALA on 05-09-26. A/c XX9012 -ICICI',
    { type: 'expense', amount: 2000, method: 'Cash' },
  ],
  [
    'Rs 340 debited from your account for UBER INDIA on 05-09-26 via UPI. Ref 445566',
    { type: 'expense', amount: 340, method: 'UPI', category: 'transport' },
  ],
  [
    'Your Kotak Bank A/c is credited with INR 1,499.00 refund from FLIPKART on 05-09-26.',
    { type: 'income', amount: 1499, method: 'Other', category: 'refund' },
  ],
];

const DROP: string[] = [
  '723418 is your OTP for a transaction of Rs 5000 on your card. Do not share it with anyone.',
  'Your credit card bill of Rs 12,340 is due on 15-09-26. Pay from your A/c to avoid charges.',
  'Transaction of Rs 899 on your card was declined due to insufficient balance in A/c XX1234.',
  'Get a personal loan of upto Rs 5,00,000 at 10.5%. Apply now from your ICICI Bank account!',
  'Avl balance in A/c XX1234 is Rs 18,240.50 as on 05-09-26. -HDFC Bank',
  'Hey, I paid Rs 500 for the cab from my account, send it over when you can',
];

let failures = 0;

for (const [body, expected] of KEEP) {
  const parsed = parseSms(sms(body));
  if (!parsed) {
    console.error(`DROPPED but should parse:\n  ${body}`);
    failures += 1;
    continue;
  }
  try {
    assert.equal(parsed.type, expected.type, 'type');
    assert.equal(parsed.amount, expected.amount, 'amount');
    assert.equal(parsed.paymentMethod, expected.method, 'paymentMethod');
    assert.equal(parsed.date, '2026-09-05', 'date');
    if (expected.category) assert.equal(parsed.categoryId, expected.category, 'categoryId');
  } catch (error) {
    console.error(`WRONG for:\n  ${body}\n  got ${JSON.stringify(parsed)}\n  ${error}`);
    failures += 1;
  }
}

for (const body of DROP) {
  // The last one is from a person, not a shortcode - the sender alone rules it out.
  const address = body.startsWith('Hey') ? '+919876543210' : 'VM-ICICIB';
  const parsed = parseSms(sms(body, address));
  if (parsed) {
    console.error(`PARSED but should drop:\n  ${body}\n  got ${JSON.stringify(parsed)}`);
    failures += 1;
  }
}

// Already-imported messages and repeats within one batch are both skipped.
const batch = [sms(KEEP[0][0]), sms(KEEP[0][0]), sms(KEEP[1][0])];
assert.equal(parseInbox(batch, new Set()).length, 2, 'duplicate ids collapse');
assert.equal(parseInbox(batch, new Set([batch[0].id])).length, 1, 'imported ids are skipped');

if (failures) {
  console.error(`\n${failures} case(s) failed`);
  process.exit(1);
}
console.log(`smsParser: ${KEEP.length} parsed, ${DROP.length} rejected, dedupe ok`);
