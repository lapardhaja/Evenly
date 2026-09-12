import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectReceiptDatesFromGroups,
  sumGroupReceiptsInDisplayCurrency,
} from './groupSpendConvert.js';

test('sumGroupReceiptsInDisplayCurrency: EUR receipt to USD', () => {
  const rates = { USD: 1, EUR: 0.9, GBP: 0.8 };
  const group = {
    receipts: {
      a: {
        items: { i1: { name: 'x', cost: 100, quantity: 1 } },
        discountCost: 0,
        taxCost: 0,
        tipCost: 0,
        currencyCode: 'EUR',
      },
    },
  };
  const usd = sumGroupReceiptsInDisplayCurrency(group, rates, 'USD');
  assert.ok(usd != null);
  assert.ok(Math.abs(usd - 100 / 0.9) < 0.02);
});

test('sumGroupReceiptsInDisplayCurrency: returns null on missing rate', () => {
  const rates = { USD: 1, EUR: 0.9 };
  const group = {
    receipts: {
      a: {
        items: { i1: { name: 'x', cost: 10, quantity: 1 } },
        discountCost: 0,
        taxCost: 0,
        tipCost: 0,
        currencyCode: 'XXX',
      },
    },
  };
  assert.equal(sumGroupReceiptsInDisplayCurrency(group, rates, 'USD'), null);
});

test('sumGroupReceiptsInDisplayCurrency: per-receipt date tables', () => {
  const d1 = new Date(2024, 5, 1, 12).getTime();
  const d2 = new Date(2024, 6, 1, 12).getTime();
  const group = {
    receipts: {
      a: {
        date: d1,
        items: { i1: { name: 'x', cost: 90, quantity: 1 } },
        discountCost: 0,
        taxCost: 0,
        tipCost: 0,
        currencyCode: 'EUR',
      },
      b: {
        date: d2,
        items: { i1: { name: 'y', cost: 80, quantity: 1 } },
        discountCost: 0,
        taxCost: 0,
        tipCost: 0,
        currencyCode: 'EUR',
      },
    },
  };
  const ratesByYmd = {
    '2024-06-01': { USD: 1, EUR: 0.9 },
    '2024-07-01': { USD: 1, EUR: 0.8 },
  };
  const usd = sumGroupReceiptsInDisplayCurrency(group, ratesByYmd, 'USD');
  assert.ok(usd != null);
  assert.ok(Math.abs(usd - (90 / 0.9 + 80 / 0.8)) < 0.02);
});

test('collectReceiptDatesFromGroups flattens receipt dates', () => {
  const d1 = 111;
  const d2 = 222;
  assert.deepEqual(
    collectReceiptDatesFromGroups({
      g1: { receipts: { a: { date: d1 } } },
      g2: { receipts: { b: { date: d2 }, c: { date: d1 } } },
    }).sort(),
    [d1, d1, d2],
  );
});
