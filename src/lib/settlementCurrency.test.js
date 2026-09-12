import test from 'node:test';
import assert from 'node:assert/strict';
import { receiptFxFactorsFromTables, scaleGroupMoneyForDisplay } from './settlementCurrency.js';

test('receiptFxFactorsFromTables uses that day’s table', () => {
  const d1 = new Date(2024, 5, 1, 12).getTime();
  const d2 = new Date(2024, 6, 1, 12).getTime();
  const tables = new Map([
    ['2024-06-01', { USD: 1, EUR: 0.9 }],
    ['2024-07-01', { USD: 1, EUR: 0.8 }],
  ]);
  const { factors, failed, ratesAvailable } = receiptFxFactorsFromTables(
    [
      { id: 'a', currencyCode: 'EUR', date: d1 },
      { id: 'b', currencyCode: 'EUR', date: d2 },
    ],
    tables,
    'USD',
  );
  assert.equal(ratesAvailable, true);
  assert.deepEqual(failed, []);
  assert.ok(Math.abs(factors.a - 1 / 0.9) < 1e-9);
  assert.ok(Math.abs(factors.b - 1 / 0.8) < 1e-9);
});

test('receiptFxFactorsFromTables: missing day fails that receipt', () => {
  const d1 = new Date(2024, 5, 1, 12).getTime();
  const tables = new Map([['2024-06-01', null]]);
  const { factors, failed, ratesAvailable } = receiptFxFactorsFromTables(
    [{ id: 'a', currencyCode: 'EUR', date: d1 }],
    tables,
    'USD',
  );
  assert.equal(ratesAvailable, false);
  assert.deepEqual(failed, ['a']);
  assert.equal(factors.a, 1);
});

test('scaleGroupMoneyForDisplay multiplies money fields', () => {
  const group = {
    receipts: {
      a: {
        items: { i1: { cost: 10 } },
        taxCost: 1,
        tipCost: 2,
        discountCost: 0.5,
      },
    },
  };
  const scaled = scaleGroupMoneyForDisplay(group, { a: 2 });
  assert.equal(scaled.receipts.a.items.i1.cost, 20);
  assert.equal(scaled.receipts.a.taxCost, 2);
  assert.equal(scaled.receipts.a.tipCost, 4);
  assert.equal(scaled.receipts.a.discountCost, 1);
});
