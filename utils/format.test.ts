import assert from 'node:assert/strict';

import { convertAmount } from '@/utils/format';

// Run with `npm run test:format`.

assert.equal(convertAmount(100, 83.12), 8312);
assert.equal(convertAmount(0, 75), 0);
assert.equal(convertAmount(-50, 2), -100);
assert.equal(convertAmount(10, 1.005), 10.05); // guards against 10 * 1.005 float noise

console.log('format: all assertions passed');
