import currency from 'currency.js';
import { idMapToList } from '../functions/utils.js';
import {
  conversionFactorFromUsdRates,
  fxDateKey,
  getUsdRatesTablesForDates,
  normalizeCurrencyCode,
} from './currencies.js';

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

export function receiptFxFactorsFromTables(meta, tables, targetRaw) {
  const target = normalizeCurrencyCode(targetRaw);
  const factors = {};
  const failed = [];
  const map = tables && typeof tables.get === 'function' ? tables : null;
  let ratesAvailable = false;
  for (const row of meta || []) {
    const ymd = fxDateKey(row.date);
    const rates = map ? map.get(ymd) : tables?.[ymd];
    if (rates) ratesAvailable = true;
    const rate = conversionFactorFromUsdRates(rates, row.currencyCode, target);
    if (rate == null || !Number.isFinite(rate) || rate <= 0) {
      factors[row.id] = 1;
      failed.push(row.id);
    } else {
      factors[row.id] = rate;
    }
  }
  return { factors, failed, ratesAvailable };
}

/**
 * Per-receipt FX into `target` using each receipt’s date.
 * Same-currency rows skip the network. `ratesAvailable` is false when every dated fetch failed.
 */
export async function loadReceiptFxFactors(meta, targetRaw) {
  const target = normalizeCurrencyCode(targetRaw);
  const factors = {};
  const needFx = [];
  for (const row of meta || []) {
    if (normalizeCurrencyCode(row.currencyCode) === target) {
      factors[row.id] = 1;
    } else {
      needFx.push(row);
    }
  }
  if (needFx.length === 0) {
    return { factors, failed: [], ratesAvailable: true };
  }
  const tables = await getUsdRatesTablesForDates(needFx.map((r) => r.date));
  const rest = receiptFxFactorsFromTables(needFx, tables, target);
  return {
    factors: { ...factors, ...rest.factors },
    failed: rest.failed,
    ratesAvailable: rest.ratesAvailable,
  };
}
