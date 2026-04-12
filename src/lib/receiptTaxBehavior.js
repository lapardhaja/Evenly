/**
 * VAT included in line prices vs tax added on top (US-style).
 * Used by /api/scan (Vercel) and client scan fallback.
 */

function money(val) {
  if (val == null || val === '') return 0;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  if (!Number.isFinite(n) || n < 0 || n > 100_000) return 0;
  return n;
}

function taxableBaseAfterDiscount(subTotal, discountCost) {
  const st = money(subTotal);
  const d = money(discountCost);
  const applied = Math.min(Math.max(0, d), st);
  return st - applied;
}

/**
 * @param {Array<{cost?: number, price?: number}>} items
 * @returns {{ taxBehavior: 'inclusive'|'exclusive', taxCost: number }}
 */
export function classifyTaxBehaviorFromTotals(items, tax, tip, discount, grandTotal) {
  const subItems = (items || []).reduce((s, row) => s + money(row?.cost ?? row?.price), 0);
  const base = taxableBaseAfterDiscount(subItems, discount);
  const t = money(tax);
  const tp = money(tip);
  const g = money(grandTotal);
  if (g <= 0 || t <= 0) return { taxBehavior: 'exclusive', taxCost: t };
  const expectedExclusive = base + t + tp;
  const expectedInclusive = base + tp;
  const diffExc = Math.abs(expectedExclusive - g);
  const diffInc = Math.abs(expectedInclusive - g);
  if (diffInc <= 0.02 && diffExc > 0.02) {
    return { taxBehavior: 'inclusive', taxCost: t };
  }
  return { taxBehavior: 'exclusive', taxCost: t };
}
