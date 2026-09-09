import test from 'node:test';
import assert from 'node:assert/strict';
import { computeNetBalances, minimizeTransfers, splitDollarsByWeight } from './settlement.js';

test('splitDollarsByWeight 50/50 odd cents sums to the total', () => {
  const parts = splitDollarsByWeight(29.81, { a: 1, s: 1 });
  const cents = (n) => Math.round(n * 100);
  assert.equal(cents(parts.a) + cents(parts.s), 2981);
  assert.equal(Math.abs(cents(parts.a) - cents(parts.s)), 1);
});

test('splitDollarsByWeight even split stays even', () => {
  const parts = splitDollarsByWeight(10, { a: 1, b: 1 });
  assert.equal(parts.a, 5);
  assert.equal(parts.b, 5);
});

function twoPersonReceipt({ id, cost, paidById }) {
  return {
    id,
    title: id,
    paidById,
    taxBehavior: 'exclusive',
    taxCost: 0,
    tipCost: 0,
    discountCost: 0,
    items: { i: { name: 'x', cost, quantity: 1 } },
    personToItemQuantityMap: { a: { i: 1 }, s: { i: 1 } },
    itemToPersonQuantityMap: { i: { a: 1, s: 1 } },
  };
}

test('50/50 odd-cent receipts: nets are equal-and-opposite (Maine hotel + gas)', () => {
  const group = {
    people: { a: { name: 'Amanda' }, s: { name: 'Servet' } },
    receipts: {
      gas: twoPersonReceipt({ id: 'gas', cost: 29.81, paidById: 's' }),
      hotel: twoPersonReceipt({ id: 'hotel', cost: 468.55, paidById: 'a' }),
    },
  };
  const bal = computeNetBalances(group);
  const sum = Math.round((bal.a + bal.s) * 100);
  assert.equal(sum, 0);
  assert.equal(Math.round(Math.abs(bal.a) * 100), Math.round(Math.abs(bal.s) * 100));
  const [t] = minimizeTransfers(bal);
  assert.equal(t.from, 's');
  assert.equal(t.to, 'a');
  assert.equal(Math.round(t.amount * 100), Math.round(Math.abs(bal.a) * 100));
});
