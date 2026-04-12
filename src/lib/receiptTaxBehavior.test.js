import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyTaxBehaviorFromTotals } from './receiptTaxBehavior.js';

test('EU-style Maison Antoine receipt: inclusive', () => {
  const items = [
    { cost: 4.6, quantity: 1 },
    { cost: 3.1, quantity: 1 },
    { cost: 3.1, quantity: 1 },
  ];
  const r = classifyTaxBehaviorFromTotals(items, 0.61, 0, 0, 10.8);
  assert.equal(r.taxBehavior, 'inclusive');
});

test('US-style: tax on top', () => {
  const items = [{ cost: 100, quantity: 1 }];
  const r = classifyTaxBehaviorFromTotals(items, 8, 0, 0, 108);
  assert.equal(r.taxBehavior, 'exclusive');
});
