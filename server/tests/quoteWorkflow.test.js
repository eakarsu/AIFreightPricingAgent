const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateQuote, validateTransition } = require('../domain/quoteWorkflow');

test('calculates cost, sell price, and margin deterministically', () => assert.deepEqual(calculateQuote({ distance: 100, linehaul_rate: 2, fuel_surcharge: 20, accessorials: [{ amount: 30 }], margin_percent: 20 }), { cost: 250, price: 312.5, margin_amount: 62.5 }));
test('rejects invalid units and margins', () => assert.throws(() => calculateQuote({ distance: 0, linehaul_rate: 2, margin_percent: 10 }), /distance/));
test('approval requires authority, current rates, and evidence', () => {
  const future = new Date(Date.now() + 60_000).toISOString();
  assert.throws(() => validateTransition('review', 'approved', { role: 'user', rateValidUntil: future, evidenceCount: 1 }), /authority/);
  assert.equal(validateTransition('review', 'approved', { role: 'pricing_manager', rateValidUntil: future, evidenceCount: 1 }), true);
});
