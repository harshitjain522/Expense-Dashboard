import assert from 'node:assert/strict';

import { getCurrency } from '@/constants/currencies';
import { advanceDate, alignToDay, convertAmount, formatCurrency } from '@/utils/format';
import type { RecurrenceFrequency } from '@/types';

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

// Recurring dates keep their day across short months. One step from the 31st
// always looked right; the drift only showed from the second step on.
function occurrences(start: string, frequency: RecurrenceFrequency, steps: number, anchorDay?: number) {
  const dates = [start];
  for (let i = 0; i < steps; i += 1) {
    dates.push(advanceDate(dates[dates.length - 1], frequency, anchorDay));
  }
  return dates;
}
assert.deepEqual(occurrences('2026-01-31', 'monthly', 4, 31), [
  '2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31',
]);
assert.deepEqual(occurrences('2028-02-29', 'yearly', 4, 29), [
  '2028-02-29', '2029-02-28', '2030-02-28', '2031-02-28', '2032-02-29',
]);
assert.deepEqual(occurrences('2026-09-10', 'weekly', 2), ['2026-09-10', '2026-09-17', '2026-09-24']);
assert.equal(alignToDay('2026-05-28', 31), '2026-05-31'); // a drifted pending date moves back
assert.equal(alignToDay('2026-02-28', 31), '2026-02-28'); // ...but never past the month's end

console.log('format: all assertions passed');
