import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { expenseShares } from './balances.js';
import { roundMoney } from './settlement.js';

describe('expenseShares units', () => {
  it('splits $300 by quantities 2,1,3', () => {
    const ids = ['a', 'b', 'c'];
    const e = {
      id: '1',
      description: 'margaritas',
      amount: 300,
      paidById: 'a',
      splitMode: 'units',
      splitParticipantIds: ids,
      unitQuantities: { a: 2, b: 1, c: 3 },
      createdAt: '',
    };
    const s = expenseShares(e, ids);
    assert.equal(roundMoney(s.a + s.b + s.c), 300);
    assert.equal(s.a, 100);
    assert.equal(s.b, 50);
    assert.equal(s.c, 150);
  });

  it('allows zero quantity (no share)', () => {
    const ids = ['a', 'b'];
    const e = {
      id: '1',
      amount: 100,
      paidById: 'a',
      splitMode: 'units',
      splitParticipantIds: ids,
      unitQuantities: { a: 2, b: 0 },
      createdAt: '',
    };
    const s = expenseShares(e, ids);
    assert.equal(s.a, 100);
    assert.equal(s.b, 0);
  });
});
