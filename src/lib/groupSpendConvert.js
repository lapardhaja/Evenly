import currency from 'currency.js';
import { idMapToList } from '../functions/utils.js';
import { receiptGrandTotal } from '../functions/receiptTotals.js';
import { conversionFactorFromUsdRates, fxDateKey, normalizeCurrencyCode } from './currencies.js';

export function usdRatesForReceipt(ratesOrByYmd, receipt) {
  if (!ratesOrByYmd) return null;
  if (typeof ratesOrByYmd.USD === 'number') return ratesOrByYmd;
  const ymd = fxDateKey(receipt?.date);
  if (typeof ratesOrByYmd.get === 'function') {
    return ratesOrByYmd.get(ymd) ?? null;
  }
  return ratesOrByYmd[ymd] ?? null;
}

export function collectReceiptDatesFromGroups(groupsMap) {
  const dates = [];
  for (const g of Object.values(groupsMap || {})) {
    for (const r of Object.values(g.receipts || {})) {
      dates.push(r.date);
    }
  }
  return dates;
}

/**
 * Sum each receipt’s grand total, converted into target currency via USD-quoted rates.
 * `ratesOrByYmd` is either a single USD table (legacy / same-day) or a map of YYYY-MM-DD → table.
 * @returns {number | null} null if any receipt currency cannot convert
 */
export function sumGroupReceiptsInDisplayCurrency(group, ratesOrByYmd, displayCurrencyRaw) {
  if (!group?.receipts || ratesOrByYmd == null) return null;
  const target = normalizeCurrencyCode(displayCurrencyRaw || 'USD');
  const receipts = idMapToList(group.receipts);
  let sum = 0;
  for (const r of receipts) {
    const items = idMapToList(r.items);
    const sub = items.reduce((s, i) => currency(s).add(i.cost).value, 0);
    const tb = r.taxBehavior === 'inclusive' ? 'inclusive' : 'exclusive';
    const total = receiptGrandTotal(sub, r.discountCost, r.taxCost, r.tipCost, tb);
    const from = normalizeCurrencyCode(r.currencyCode || 'USD');
    const rates = usdRatesForReceipt(ratesOrByYmd, r);
    const f = conversionFactorFromUsdRates(rates, from, target);
    if (f == null) return null;
    sum = currency(sum).add(currency(total).multiply(f)).value;
  }
  return sum;
}
