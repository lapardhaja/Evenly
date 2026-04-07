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
});
