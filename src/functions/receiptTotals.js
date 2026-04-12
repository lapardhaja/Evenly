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

/**
 * Tax on top of line items (US-style sales tax).
 * When false, line prices already include VAT; `taxCost` is informational only (still shown).
 */
export function isTaxInclusive(taxBehavior) {
  return taxBehavior === 'inclusive';
}

/** Amount of tax added to the running total (0 when tax is already in item prices). */
export function additiveTaxAmount(taxBehavior, taxCost) {
  if (isTaxInclusive(taxBehavior)) return 0;
  return currency(taxCost || 0).value;
}

/**
 * Receipt total: (subtotal − discount) + [tax if exclusive] + tip
 * European VAT-included receipts: items + grand total already match; tax line is breakdown only.
 */
export function receiptGrandTotal(subTotal, discountCost, taxCost, tipCost, taxBehavior = 'exclusive') {
  const base = taxableSubtotalAfterDiscount(subTotal, discountCost);
  return currency(base)
    .add(additiveTaxAmount(taxBehavior, taxCost))
    .add(tipCost || 0).value;
}
