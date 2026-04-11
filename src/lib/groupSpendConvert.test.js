import test from 'node:test';
import assert from 'node:assert/strict';
import { sumGroupReceiptsInDisplayCurrency } from './groupSpendConvert.js';

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
