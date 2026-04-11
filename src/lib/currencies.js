import STATIC_ISO_CODES from '../data/iso4217CurrencyCodes.js';

const FALLBACK = 'USD';
const FETCH_TIMEOUT_MS = 10000;

async function fetchJsonWithTimeout(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Withdrawn or not used as a day-to-day currency in our picker (API may still return legacy keys). */
const WITHDRAWN_OR_NON_CASH = new Set([
  'HRK', // Croatia → EUR
  'SLL', // Sierra Leone → SLE
  'CUC', // Cuba → CUP
  'CLF', // Chile UF (index unit), not a cash currency for receipts
]);

/** @type {{ code: string, label: string }[] | null} */
let currencySelectOptionsCache = null;

/** @type {Promise<string[]> | null} */
let activeCurrencyCodesPromise = null;

/**
 * ISO codes the live rate API currently publishes (same source as settlement FX).
 */
export function fetchActiveCurrencyCodes() {
  if (!activeCurrencyCodesPromise) {
    activeCurrencyCodesPromise = (async () => {
      const data = await fetchJsonWithTimeout('https://open.er-api.com/v6/latest/USD');
      if (!data || data.result !== 'success' || !data.rates || typeof data.rates !== 'object') {
        return [...STATIC_ISO_CODES].filter((c) => !WITHDRAWN_OR_NON_CASH.has(c)).sort();
      }
      const set = new Set(['USD']);
      for (const k of Object.keys(data.rates)) {
        if (typeof k !== 'string' || !/^[A-Za-z]{3}$/.test(k)) continue;
        const c = k.toUpperCase();
        if (!WITHDRAWN_OR_NON_CASH.has(c)) set.add(c);
      }
      return [...set].sort();
    })();
  }
  return activeCurrencyCodesPromise;
}

async function collectIsoCurrencyCodes() {
  try {
    return await fetchActiveCurrencyCodes();
  } catch {
    return [...STATIC_ISO_CODES].filter((c) => !WITHDRAWN_OR_NON_CASH.has(c)).sort();
  }
}

function currencyEnglishName(code) {
  try {
    if (typeof Intl !== 'undefined' && Intl.DisplayNames) {
      const dn = new Intl.DisplayNames(['en'], { type: 'currency' });
      const n = dn.of(code);
      if (n && typeof n === 'string' && n.trim()) return n.trim();
    }
  } catch {
    /* ignore */
  }
  return code;
}

/**
 * Actively traded currencies from the same API as settlement rates, with searchable labels.
 * First call may be async — use `ensureCurrencySelectOptions()` from the UI.
 */
export function buildCurrencySelectOptions(codes) {
  return codes.map((code) => ({
    code,
    label: `${code} — ${currencyEnglishName(code)}`,
  }));
}

export function getCurrencySelectOptionsSync() {
  return currencySelectOptionsCache;
}

/** Load list from API once; returns options array. */
export async function ensureCurrencySelectOptions() {
  if (currencySelectOptionsCache) return currencySelectOptionsCache;
  const codes = await collectIsoCurrencyCodes();
  currencySelectOptionsCache = buildCurrencySelectOptions(codes);
  return currencySelectOptionsCache;
}

export function normalizeCurrencyCode(code) {
  if (code == null || typeof code !== 'string') return FALLBACK;
  const c = code.trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(c)) return c;
  return FALLBACK;
}

/**
 * Open Exchange Rates (no key): `rates[X]` = how many units of X equal 1 USD.
 * @returns {Record<string, number>|null}
 */
async function fetchUsdRatesOpenErApi() {
  const data = await fetchJsonWithTimeout('https://open.er-api.com/v6/latest/USD');
  if (!data || data.result !== 'success' || !data.rates || typeof data.rates !== 'object') {
    return null;
  }
  const rates = { ...data.rates };
  rates.USD = 1;
  return rates;
}

/**
 * Fawaz Ahmed currency-api on jsDelivr (no key). Keys are lowercase currency codes.
 */
async function fetchUsdRatesFawazFallback() {
  const data = await fetchJsonWithTimeout(
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
  );
  if (!data || typeof data !== 'object') return null;
  const raw = data.usd || data.USD;
  if (!raw || typeof raw !== 'object') return null;
  const rates = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
      rates[k.toUpperCase()] = v;
    }
  }
  rates.USD = 1;
  return Object.keys(rates).length > 1 ? rates : null;
}

let cachedUsdRates = null;
let cachedAt = 0;
const CACHE_MS = 5 * 60 * 1000;

export async function getUsdRatesTable() {
  const now = Date.now();
  if (cachedUsdRates && now - cachedAt < CACHE_MS) {
    return cachedUsdRates;
  }
  let rates = await fetchUsdRatesOpenErApi();
  if (!rates) {
    rates = await fetchUsdRatesFawazFallback();
  }
  if (rates) {
    cachedUsdRates = rates;
    cachedAt = now;
  }
  return rates;
}

/**
 * How many units of `to` equal 1 unit of `from`, using USD-quoted table
 * (1 USD = rates[X] units of X).
 */
export function conversionFactorFromUsdRates(rates, from, to) {
  const f = normalizeCurrencyCode(from);
  const t = normalizeCurrencyCode(to);
  if (f === t) return 1;
  if (!rates) return null;
  const rf = rates[f];
  const rt = rates[t];
  if (typeof rf !== 'number' || typeof rt !== 'number' || !Number.isFinite(rf) || !Number.isFinite(rt) || rf <= 0 || rt <= 0) {
    return null;
  }
  return rt / rf;
}

/** Future receipt dates are invalid for “historical” APIs we don’t use — still useful for callers. */
export function clampDateMsForFxRates(dateMs) {
  const now = Date.now();
  let t = Number(dateMs);
  if (!Number.isFinite(t)) t = now;
  if (t > now) return now;
  return t;
}

/**
 * @returns {Promise<number|null>} multiplier: amount in `to` = amount in `from` × return value
 */
export async function fetchConversionRate(fromCurrency, toCurrency) {
  const from = normalizeCurrencyCode(fromCurrency);
  const to = normalizeCurrencyCode(toCurrency);
  if (from === to) return 1;
  const rates = await getUsdRatesTable();
  return conversionFactorFromUsdRates(rates, from, to);
}

export function formatMoneyWithCode(amount, currencyCode) {
  const code = normalizeCurrencyCode(currencyCode);
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: code === 'JPY' ? 0 : 2,
      maximumFractionDigits: code === 'JPY' ? 0 : 2,
    }).format(Number(amount) || 0);
  } catch {
    return `${(Number(amount) || 0).toFixed(2)} ${code}`;
  }
}
