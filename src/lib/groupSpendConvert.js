import currency from 'currency.js';
import { idMapToList } from '../functions/utils.js';
import { receiptGrandTotal } from '../functions/receiptTotals.js';
import { conversionFactorFromUsdRates, normalizeCurrencyCode } from './currencies.js';

/**
 * Sum each receipt’s grand total, converted into target currency via USD-quoted rates.
 * @returns {number | null} null if any receipt currency cannot convert
 */
export function sumGroupReceiptsInDisplayCurrency(group, rates, displayCurrencyRaw) {
  if (!group?.receipts || !rates) return null;
  const target = normalizeCurrencyCode(displayCurrencyRaw || 'USD');
  const receipts = idMapToList(group.receipts);
  let sum = 0;
  for (const r of receipts) {
    const items = idMapToList(r.items);
    const sub = items.reduce((s, i) => currency(s).add(i.cost).value, 0);
    const tb = r.taxBehavior === 'inclusive' ? 'inclusive' : 'exclusive';
    const total = receiptGrandTotal(sub, r.discountCost, r.taxCost, r.tipCost, tb);
    const from = normalizeCurrencyCode(r.currencyCode || 'USD');
    const f = conversionFactorFromUsdRates(rates, from, target);
    if (f == null) return null;
    sum = currency(sum).add(currency(total).multiply(f)).value;
  }
  return sum;
}
