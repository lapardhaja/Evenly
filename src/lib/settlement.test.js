import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { minimizeTransactions, roundMoney } from './settlement.js';

describe('minimizeTransactions', () => {
  it('settles simple three-person case with two transfers max', () => {
    const b = { a: 30, b: -10, c: -20 };
    const t = minimizeTransactions(b);
    const sum = t.reduce((s, x) => s + x.amount, 0);
    assert.equal(roundMoney(sum), 30);
    assert.ok(t.length <= 2);
  });

  it('produces at most n-1 edges when balances sum to zero', () => {
    const b = { a: 100, b: -40, c: -35, d: -25 };
    const t = minimizeTransactions(b);
    assert.ok(t.length <= 3);
    let net = { ...b };
    for (const { from, to, amount } of t) {
      // Debtor pays creditor: debtor net rises, creditor net falls.
      net[from] = roundMoney(net[from] + amount);
      net[to] = roundMoney(net[to] - amount);
    }
    for (const v of Object.values(net)) {
      assert.ok(Math.abs(v) < 0.02);
    }
  });
});
