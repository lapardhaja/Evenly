/**
 * Greedy settlement: pair largest creditor with largest debtor repeatedly.
 * For balances that sum to ~0, this produces at most (n-1) transfers and
 * is optimal for minimizing transaction count (standard cash-flow reduction).
 *
 * @param {Record<string, number>} balances - net balance per person id (+ = owed to them)
 * @param {number} [epsilon=0.01] - treat |x| < epsilon as zero
 * @returns {{ from: string, to: string, amount: number }[]}
 */
export function minimizeTransactions(balances, epsilon = 0.01) {
  const entries = Object.entries(balances).filter(
    ([, v]) => Math.abs(v) >= epsilon
  );

  /** @type {{ id: string, amount: number }[]} */
  const creditors = [];
  /** @type {{ id: string, amount: number }[]} */
  const debtors = [];

  for (const [id, raw] of entries) {
    const amount = roundMoney(raw);
    if (amount > epsilon) creditors.push({ id, amount });
    else if (amount < -epsilon) debtors.push({ id, amount: -amount });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  /** @type {{ from: string, to: string, amount: number }[]} */
  const out = [];
  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const c = creditors[i];
    const d = debtors[j];
    const pay = roundMoney(Math.min(c.amount, d.amount));
    if (pay <= epsilon) {
      if (c.amount <= d.amount) i++;
      else j++;
      continue;
    }
    out.push({ from: d.id, to: c.id, amount: pay });
    c.amount = roundMoney(c.amount - pay);
    d.amount = roundMoney(d.amount - pay);
    if (c.amount <= epsilon) i++;
    if (d.amount <= epsilon) j++;
  }

  return out;
}

export function roundMoney(n) {
  return Math.round(n * 100) / 100;
}
