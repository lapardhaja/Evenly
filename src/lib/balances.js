import { roundMoney } from './settlement.js';

/**
 * Net balance per participant: positive = world owes them (they should receive).
 * @param {import('../types.js').Expense[]} expenses
 * @param {string[]} participantIds - all ids in group
 * @returns {Record<string, number>}
 */
export function computeBalances(expenses, participantIds) {
  const bal = Object.fromEntries(participantIds.map((id) => [id, 0]));

  for (const e of expenses) {
    if (!e.paidById || !participantIds.includes(e.paidById)) continue;
    const amount = roundMoney(Number(e.amount) || 0);
    if (amount <= 0) continue;

    bal[e.paidById] = roundMoney(bal[e.paidById] + amount);

    const shares = expenseShares(e, participantIds);
    for (const [pid, share] of Object.entries(shares)) {
      if (!participantIds.includes(pid)) continue;
      bal[pid] = roundMoney(bal[pid] - share);
    }
  }

  return bal;
}

/**
 * @param {import('../types.js').Expense} e
 * @param {string[]} participantIds
 * @returns {Record<string, number>}
 */
export function expenseShares(e, participantIds) {
  const amount = roundMoney(Number(e.amount) || 0);
  const ids = (e.splitParticipantIds || []).filter((id) =>
    participantIds.includes(id)
  );
  if (ids.length === 0 || amount <= 0) return {};

  if (e.splitMode === 'custom') {
    const raw = e.customAmounts || {};
    const out = {};
    for (const id of ids) {
      out[id] = roundMoney(Number(raw[id]) || 0);
    }
    return out;
  }

  if (e.splitMode === 'percent') {
    const raw = e.percents || {};
    let sumP = 0;
    for (const id of ids) sumP += Number(raw[id]) || 0;
    if (sumP <= 0) return equalSplit(amount, ids);
    const out = {};
    for (const id of ids) {
      const p = Number(raw[id]) || 0;
      out[id] = roundMoney((amount * p) / sumP);
    }
    return fixRoundingDrift(out, amount);
  }

  return equalSplit(amount, ids);
}

function equalSplit(amount, ids) {
  const n = ids.length;
  const each = roundMoney(amount / n);
  const out = {};
  let allocated = 0;
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (i === ids.length - 1) {
      out[id] = roundMoney(amount - allocated);
    } else {
      out[id] = each;
      allocated = roundMoney(allocated + each);
    }
  }
  return out;
}

/** Adjust last key so shares sum exactly to amount (pennies). */
function fixRoundingDrift(shares, target) {
  const ids = Object.keys(shares);
  if (ids.length === 0) return shares;
  let s = 0;
  for (const id of ids) s = roundMoney(s + shares[id]);
  const drift = roundMoney(target - s);
  const last = ids[ids.length - 1];
  shares[last] = roundMoney(shares[last] + drift);
  return shares;
}
