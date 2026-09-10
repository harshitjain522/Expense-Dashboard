import assert from 'node:assert/strict';

import { parseBackupPayload } from '@/utils/backup';

// Run with `npm run test:backup`.

let failures = 0;

const VALID = {
  version: 1,
  exportedAt: '2026-09-05T12:00:00.000Z',
  transactions: [],
  recurringRules: [],
  totalBudget: 5000,
  currencyCode: 'INR',
};

const KEEP: [string, unknown][] = [
  ['well-formed payload', VALID],
  ['unknown extra top-level keys ignored', { ...VALID, extra: 'ignore me' }],
  ['missing exportedAt defaults to now', (() => {
    const { exportedAt, ...rest } = VALID;
    return rest;
  })()],
  ['non-object row filtered out of transactions', { ...VALID, transactions: [null, 'x', 42] }],
];

for (const [label, input] of KEEP) {
  const parsed = parseBackupPayload(input);
  if (!parsed) {
    console.error(`REJECTED but should parse: ${label}`);
    failures += 1;
  }
}

const REJECT: [string, unknown][] = [
  ['wrong version', { ...VALID, version: 2 }],
  ['missing version', (() => {
    const { version, ...rest } = VALID;
    return rest;
  })()],
  ['transactions not an array', { ...VALID, transactions: {} }],
  ['recurringRules not an array', { ...VALID, recurringRules: {} }],
  ['totalBudget as a string', { ...VALID, totalBudget: '5000' }],
  ['totalBudget is NaN', { ...VALID, totalBudget: NaN }],
  ['totalBudget is Infinity', { ...VALID, totalBudget: Infinity }],
  ['currencyCode missing', { ...VALID, currencyCode: undefined }],
  ['currencyCode empty', { ...VALID, currencyCode: '  ' }],
  ['top-level null', null],
  ['top-level string', 'not json'],
  ['top-level array', []],
];

for (const [label, input] of REJECT) {
  const parsed = parseBackupPayload(input);
  if (parsed) {
    console.error(`PARSED but should reject: ${label}\n  got ${JSON.stringify(parsed)}`);
    failures += 1;
  }
}

// Amount coercion: a row with a stringy/missing amount still comes back numeric.
const coerced = parseBackupPayload({
  ...VALID,
  transactions: [{ id: 't1', amount: '250' }, { id: 't2' }],
});
try {
  assert.equal(coerced?.transactions[0]?.amount, 250, 'stringy amount coerced');
  assert.equal(coerced?.transactions[1]?.amount, 0, 'missing amount defaults to 0');
} catch (error) {
  console.error(String(error));
  failures += 1;
}

if (failures) {
  console.error(`\n${failures} case(s) failed`);
  process.exit(1);
}
console.log(`backup: ${KEEP.length} kept, ${REJECT.length} rejected, amount coercion ok`);
