import currency from 'currency.js';
import { idMapToList } from '../functions/utils.js';

/**
 * Clone group with all receipt money fields scaled by per-receipt factor (for FX display).
 */
export function scaleGroupMoneyForDisplay(group, receiptIdToFactor) {
  if (!group?.receipts) return group;
  const receipts = {};
  for (const [rid, r] of Object.entries(group.receipts)) {
    const f = receiptIdToFactor[rid] ?? 1;
    const items = {};
    for (const [iid, it] of Object.entries(r.items || {})) {
      items[iid] = {
        ...it,
        cost: currency(it.cost || 0).multiply(f).value,
      };
    }
    receipts[rid] = {
      ...r,
      items,
      taxCost: currency(r.taxCost || 0).multiply(f).value,
      tipCost: currency(r.tipCost || 0).multiply(f).value,
      discountCost: currency(r.discountCost || 0).multiply(f).value,
    };
  }
  return { ...group, receipts };
}

/** Receipt meta for fetching rates: id, currencyCode, date ms */
export function listReceiptsCurrencyMeta(group) {
  return idMapToList(group?.receipts).map((r) => ({
    id: r.id,
    currencyCode: r.currencyCode || 'USD',
    date: r.date,
  }));
}
