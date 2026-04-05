import { roundMoney } from './settlement.js';

/**
 * @typedef {{ id: string, name: string, unitPrice: number, quantity: number, allocations: Record<string, number> }} ReceiptLine
 */

/**
 * Per-person food subtotal, tax, tip, and total for a receipt expense.
 * Each line's total cost is split across people by their unit allocations (Rece-style).
 *
 * @param {import('../types.js').Expense} e
 * @param {string[]} participantIds - people in scope for this expense
 * @returns {{ foodByPerson: Record<string, number>, taxByPerson: Record<string, number>, tipByPerson: Record<string, number>, lineSubtotal: number, tax: number, tip: number }}
 */
export function computeReceiptBreakdown(e, participantIds) {
  const lines = e.receiptLines || [];
  const tax = roundMoney(Number(e.taxAmount) || 0);
  const tip = roundMoney(Number(e.tipAmount) || 0);

  /** @type {Record<string, number>} */
  const foodByPerson = Object.fromEntries(participantIds.map((id) => [id, 0]));

  let lineSubtotal = 0;

  for (const line of lines) {
    const unitPrice = roundMoney(Number(line.unitPrice) || 0);
    const qty = Math.max(0, Number(line.quantity) || 0);
    const lineTotal = roundMoney(unitPrice * qty);
    lineSubtotal = roundMoney(lineSubtotal + lineTotal);

    const alloc = line.allocations || {};
    let sumAlloc = 0;
    for (const id of participantIds) {
      sumAlloc += Math.max(0, Number(alloc[id]) || 0);
    }
    if (sumAlloc <= 0 || lineTotal <= 0) continue;

    let allocated = 0;
    const withUnits = participantIds.filter(
      (id) => (Number(alloc[id]) || 0) > 0
    );
    for (let i = 0; i < withUnits.length - 1; i++) {
      const id = withUnits[i];
      const u = Number(alloc[id]) || 0;
      const share = roundMoney((lineTotal * u) / sumAlloc);
      foodByPerson[id] = roundMoney(foodByPerson[id] + share);
      allocated = roundMoney(allocated + share);
    }
    if (withUnits.length > 0) {
      const last = withUnits[withUnits.length - 1];
      foodByPerson[last] = roundMoney(
        foodByPerson[last] + (lineTotal - allocated)
      );
    }
  }

  const totalFood = roundMoney(
    participantIds.reduce((s, id) => s + foodByPerson[id], 0)
  );

  /** @type {Record<string, number>} */
  const taxByPerson = Object.fromEntries(participantIds.map((id) => [id, 0]));
  /** @type {Record<string, number>} */
  const tipByPerson = Object.fromEntries(participantIds.map((id) => [id, 0]));

  if (totalFood > 0.001 && (tax > 0 || tip > 0)) {
    let taxAlloc = 0;
    let tipAlloc = 0;
    const positives = participantIds.filter((id) => foodByPerson[id] > 0.001);
    const lastP = positives[positives.length - 1];

    for (const id of participantIds) {
      if (foodByPerson[id] <= 0.001) continue;
      if (id === lastP) continue;
      const t = roundMoney((tax * foodByPerson[id]) / totalFood);
      const p = roundMoney((tip * foodByPerson[id]) / totalFood);
      taxByPerson[id] = t;
      tipByPerson[id] = p;
      taxAlloc = roundMoney(taxAlloc + t);
      tipAlloc = roundMoney(tipAlloc + p);
    }
    if (lastP) {
      taxByPerson[lastP] = roundMoney(tax - taxAlloc);
      tipByPerson[lastP] = roundMoney(tip - tipAlloc);
    }
  } else if (participantIds.length > 0 && (tax > 0 || tip > 0)) {
    equalCharges(tax, taxByPerson, participantIds);
    equalCharges(tip, tipByPerson, participantIds);
  }

  return {
    foodByPerson,
    taxByPerson,
    tipByPerson,
    lineSubtotal,
    tax,
    tip,
  };
}

function equalCharges(amount, out, ids) {
  if (ids.length === 0 || amount <= 0) return;
  const each = roundMoney(amount / ids.length);
  let a = 0;
  for (let i = 0; i < ids.length - 1; i++) {
    out[ids[i]] = each;
    a = roundMoney(a + each);
  }
  out[ids[ids.length - 1]] = roundMoney(amount - a);
}

/**
 * Open Venmo to send money to this user (debtor pays creditor).
 * @param {string} recipientVenmo - creditor's @handle, without @ ok
 * @param {number} amount
 * @param {string} note
 */
export function venmoPayUrl(recipientVenmo, amount, note) {
  const u = recipientVenmo.replace(/^@/, '').trim();
  if (!u) return '';
  const amt = roundMoney(amount).toFixed(2);
  const params = new URLSearchParams({
    txn: 'pay',
    recipients: u,
    amount: amt,
    note: note.slice(0, 280),
  });
  return `venmo://paycharge?${params.toString()}`;
}
