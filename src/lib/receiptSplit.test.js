import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeReceiptBreakdown, venmoPayUrl } from './receiptSplit.js';
import { roundMoney } from './settlement.js';

describe('computeReceiptBreakdown', () => {
  it('allocates line cost by units like Rece', () => {
    const e = {
      splitMode: 'receipt',
      receiptLines: [
        {
          id: 'l1',
          name: 'Drinks',
          unitPrice: 50,
          quantity: 6,
          allocations: { a: 2, b: 1, c: 3 },
        },
      ],
      taxAmount: 0,
      tipAmount: 0,
    };
    const ids = ['a', 'b', 'c'];
    const { foodByPerson } = computeReceiptBreakdown(e, ids);
    assert.equal(foodByPerson.a, 100);
    assert.equal(foodByPerson.b, 50);
    assert.equal(foodByPerson.c, 150);
  });

  it('splits tax proportional to food', () => {
    const e = {
      splitMode: 'receipt',
      receiptLines: [
        {
          id: 'l1',
          name: 'Food',
          unitPrice: 10,
          quantity: 2,
          allocations: { a: 1, b: 1 },
        },
      ],
      taxAmount: 10,
      tipAmount: 0,
    };
    const { foodByPerson, taxByPerson } = computeReceiptBreakdown(e, [
      'a',
      'b',
    ]);
    assert.equal(foodByPerson.a, 10);
    assert.equal(foodByPerson.b, 10);
    assert.equal(roundMoney(taxByPerson.a + taxByPerson.b), 10);
    assert.ok(Math.abs(taxByPerson.a - taxByPerson.b) < 0.02);
  });
});

describe('venmoPayUrl', () => {
  it('builds venmo deep link', () => {
    const u = venmoPayUrl('@alice', 12.5, 'test note');
    assert.ok(u.startsWith('venmo://paycharge?'));
    assert.ok(u.includes('recipients=alice'));
    assert.ok(u.includes('amount=12.5'));
  });
});
