import currency from 'currency.js';

/** Discount applied to items (cannot exceed subtotal). */
export function appliedDiscountAmount(subTotal, discountCost) {
  const st = currency(subTotal || 0).value;
  const d = currency(discountCost || 0).value;
  if (st <= 0) return 0;
  return Math.min(Math.max(0, d), st);
}

/** Subtotal after discount; tax and tip apply to this base. */
export function taxableSubtotalAfterDiscount(subTotal, discountCost) {
  const st = currency(subTotal || 0).value;
  return currency(st).subtract(appliedDiscountAmount(st, discountCost)).value;
}

/** Receipt total: (subtotal − discount) + tax + tip */
export function receiptGrandTotal(subTotal, discountCost, taxCost, tipCost) {
  const base = taxableSubtotalAfterDiscount(subTotal, discountCost);
  return currency(base)
    .add(taxCost || 0)
    .add(tipCost || 0).value;
}
