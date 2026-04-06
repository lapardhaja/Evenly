import currency from 'currency.js';
import { idMapToList } from './utils.js';

/**
 * Compute net balances across all receipts in a group.
 * Positive = owed money (creditor), negative = owes money (debtor).
 *
 * For each receipt:
 *   - The payer paid the full total
 *   - Each person's share is their proportional item cost + tax + tip
 *   - Net = sum of (what they paid) - (what they consumed)
 */
export function computeNetBalances(group) {
  const people = idMapToList(group.people);
  const receipts = idMapToList(group.receipts);
  const balances = {};

  people.forEach((p) => {
    balances[p.id] = 0;
  });

  receipts.forEach((receipt) => {
    const items = idMapToList(receipt.items);
    const subTotal = items.reduce((s, i) => currency(s).add(i.cost).value, 0);
    const total = currency(subTotal).add(receipt.taxCost || 0).add(receipt.tipCost || 0).value;

    if (receipt.paidById && balances[receipt.paidById] !== undefined) {
      balances[receipt.paidById] = currency(balances[receipt.paidById]).add(total).value;
    }

    people.forEach((person) => {
      let personSub = 0;
      items.forEach((item) => {
        const qty = receipt.personToItemQuantityMap?.[person.id]?.[item.id] || 0;
        if (qty <= 0) return;
        const totalShares = Object.values(
          receipt.itemToPersonQuantityMap?.[item.id] || {},
        ).reduce((s, v) => s + (v || 0), 0);
        if (totalShares <= 0) return;
        personSub = currency(personSub).add(
          currency(item.cost).multiply(qty).divide(totalShares),
        ).value;
      });

      let personTotal = personSub;
      if (subTotal > 0) {
        const ratio = personSub / subTotal;
        personTotal = currency(personSub)
          .add(currency(receipt.taxCost || 0).multiply(ratio))
          .add(currency(receipt.tipCost || 0).multiply(ratio)).value;
      }

      balances[person.id] = currency(balances[person.id] || 0).subtract(personTotal).value;
    });
  });

  return balances;
}

/**
 * Greedy algorithm to minimize number of transfers.
 * Returns array of { from, to, amount } objects.
 */
export function minimizeTransfers(balancesMap) {
  const entries = Object.entries(balancesMap)
    .map(([id, amount]) => ({ id, amount: currency(amount).value }))
    .filter((e) => Math.abs(e.amount) >= 0.01);

  const creditors = entries.filter((e) => e.amount > 0).sort((a, b) => b.amount - a.amount);
  const debtors = entries.filter((e) => e.amount < 0).sort((a, b) => a.amount - b.amount);

  const transfers = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const amount = Math.min(creditor.amount, -debtor.amount);

    if (amount >= 0.01) {
      transfers.push({
        from: debtor.id,
        to: creditor.id,
        amount: currency(amount, { precision: 2 }).value,
      });
    }

    creditor.amount = currency(creditor.amount).subtract(amount).value;
    debtor.amount = currency(debtor.amount).add(amount).value;

    if (Math.abs(creditor.amount) < 0.01) ci++;
    if (Math.abs(debtor.amount) < 0.01) di++;
  }

  return transfers;
}
