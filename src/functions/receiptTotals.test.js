import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  appliedDiscountAmount,
  taxableSubtotalAfterDiscount,
  receiptGrandTotal,
} from './receiptTotals.js';

describe('receiptTotals', () => {
  it('caps discount at subtotal', () => {
    assert.strictEqual(appliedDiscountAmount(100, 150), 100);
    assert.strictEqual(taxableSubtotalAfterDiscount(100, 150), 0);
  });
  it('discount before tax and tip in total', () => {
    const t = receiptGrandTotal(100, 10, 8, 5);
    assert.strictEqual(t, 100 - 10 + 8 + 5);
  });
  it('inclusive tax: line total matches grand total without adding tax again', () => {
    const sub = 10.8;
    const tax = 0.61;
    const grandExclusive = receiptGrandTotal(sub, 0, tax, 0, 'exclusive');
    const grandInclusive = receiptGrandTotal(sub, 0, tax, 0, 'inclusive');
    assert.ok(Math.abs(grandExclusive - (sub + tax)) < 0.01);
    assert.ok(Math.abs(grandInclusive - sub) < 0.01);
  });
});
