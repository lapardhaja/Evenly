import currency from 'currency.js';
import { idMapToList } from './utils.js';
import { receiptGrandTotal } from './receiptTotals.js';

/**
 * Split `amount` dollars across weighted ids so shares sum to the amount in cents.
 * Remainder cents go to the largest fractional parts (stable by id).
 */
export function splitDollarsByWeight(amount, weightById) {
  const ids = Object.keys(weightById || {}).filter((id) => (Number(weightById[id]) || 0) > 0);
  const totalW = ids.reduce((s, id) => s + Number(weightById[id]), 0);
  if (ids.length === 0 || !(totalW > 0)) return {};

  const cents = Math.round(currency(amount).multiply(100).value);
  const rows = ids.map((id) => {
    const exact = (cents * Number(weightById[id])) / totalW;
    const floor = Math.floor(exact);
    return { id, floor, frac: exact - floor };
  });
  let leftover = cents - rows.reduce((s, r) => s + r.floor, 0);
  const byFrac = [...rows].sort((a, b) => b.frac - a.frac || a.id.localeCompare(b.id));
  const extra = new Set();
  for (let i = 0; i < leftover; i += 1) extra.add(byFrac[i].id);

  const out = {};
  for (const r of rows) {
    out[r.id] = (r.floor + (extra.has(r.id) ? 1 : 0)) / 100;
  }
  return out;
}

function itemShareWeight(receipt, personId, item) {
  const qty = receipt.personToItemQuantityMap?.[personId]?.[item.id] || 0;
  if (qty <= 0) return 0;
  const totalShares = Object.values(receipt.itemToPersonQuantityMap?.[item.id] || {}).reduce(
    (s, v) => s + (v || 0),
    0,
  );
  if (totalShares <= 0) return 0;
  return (Number(item.cost) || 0) * (qty / totalShares);
}

/**
 * Compute net balances across all receipts in a group.
 * Positive = owed money (creditor), negative = owes money (debtor).
 *
 * For each receipt:
 *   - The payer paid the full total
 *   - Each person's share is their proportional item cost + tax + tip
 *   - Shares are allocated in integer cents so they sum to the receipt total
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
    const tb = receipt.taxBehavior === 'inclusive' ? 'inclusive' : 'exclusive';
    const total = receiptGrandTotal(
      subTotal,
      receipt.discountCost,
      receipt.taxCost,
      receipt.tipCost,
      tb,
    );

    if (receipt.paidById && balances[receipt.paidById] !== undefined) {
      balances[receipt.paidById] = currency(balances[receipt.paidById]).add(total).value;
    }

    const weights = {};
    people.forEach((person) => {
      weights[person.id] = items.reduce((s, item) => s + itemShareWeight(receipt, person.id, item), 0);
    });
    const shares = splitDollarsByWeight(total, weights);
    people.forEach((person) => {
      const personTotal = shares[person.id] || 0;
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
