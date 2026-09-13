import assert from 'node:assert/strict';

import { getCurrency } from '@/constants/currencies';
import { convertAmount, formatCurrency } from '@/utils/format';

// Run with `npm run test:format`.

assert.equal(convertAmount(100, 83.12), 8312);
assert.equal(convertAmount(0, 75), 0);
assert.equal(convertAmount(-50, 2), -100);
assert.equal(convertAmount(10, 1.005), 10.05); // guards against 10 * 1.005 float noise

// Converted currencies keep 2 decimals; the INR base stays whole.
assert.equal(formatCurrency(12.3, getCurrency('USD')), '$12.30');
assert.equal(formatCurrency(-0.5, getCurrency('GBP')), '-£0.50');
assert.equal(formatCurrency(1234.56, getCurrency('INR')), '₹1,235');

// Entered amounts survive the trip through unrounded INR storage, even for a
// currency worth less than a rupee.
for (let cents = 1; cents <= 200000; cents += 7) {
  const entered = cents / 100;
  assert.equal(convertAmount(entered / 1.72, 1.72), entered, `JPY ${entered}`);
}

console.log('format: all assertions passed');
