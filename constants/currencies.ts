export interface Currency {
  code: string;
  symbol: string;
  /** Drives digit grouping, e.g. Indian lakh/crore vs thousands. */
  locale: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'INR', symbol: '₹', locale: 'en-IN' },
  { code: 'USD', symbol: '$', locale: 'en-US' },
  { code: 'EUR', symbol: '€', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', locale: 'en-GB' },
  { code: 'JPY', symbol: '¥', locale: 'ja-JP' },
  { code: 'AUD', symbol: 'A$', locale: 'en-AU' },
  { code: 'CAD', symbol: 'C$', locale: 'en-CA' },
  { code: 'AED', symbol: 'د.إ', locale: 'ar-AE' },
];

export const DEFAULT_CURRENCY_CODE = 'INR';

export function getCurrency(code: string): Currency {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}
