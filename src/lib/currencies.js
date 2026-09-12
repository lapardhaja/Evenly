import STATIC_ISO_CODES from '../data/iso4217CurrencyCodes.js';

const FALLBACK = 'USD';
const FETCH_TIMEOUT_MS = 10000;
const CACHE_MS = 5 * 60 * 1000;
const FX_FETCH_CONCURRENCY = 4;
const HISTORICAL_WALKBACK_DAYS = 7;

/** Fawaz/jsDelivr daily archive starts here (older dates 404). */
export const FAWAZ_HISTORY_START = '2024-03-02';

export const OPEN_ER_API_USD_URL = 'https://open.er-api.com/v6/latest/USD';

export function fawazUsdRatesUrl(dateTag) {
  const tag = dateTag === 'latest' ? 'latest' : dateTag;
  return `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${tag}/v1/currencies/usd.json`;
}

export function frankfurterUsdRatesUrl(ymd) {
  return `https://api.frankfurter.dev/v1/${ymd}?from=USD`;
}

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
      const data = await fetchJsonWithTimeout(OPEN_ER_API_USD_URL);
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

function numericUsdRatesFromMap(raw) {
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

export function parseOpenErApiUsdJson(data) {
  if (!data || data.result !== 'success' || !data.rates || typeof data.rates !== 'object') {
    return null;
  }
  return numericUsdRatesFromMap(data.rates);
}

export function parseFawazUsdJson(data) {
  if (!data || typeof data !== 'object') return null;
  return numericUsdRatesFromMap(data.usd || data.USD);
}

export function parseFrankfurterUsdJson(data) {
  if (!data || typeof data !== 'object' || !data.rates || typeof data.rates !== 'object') {
    return null;
  }
  return numericUsdRatesFromMap(data.rates);
}

async function fetchUsdRatesOpenErApi() {
  const data = await fetchJsonWithTimeout(OPEN_ER_API_USD_URL);
  return parseOpenErApiUsdJson(data);
}

async function fetchUsdRatesFawazForTag(dateTag) {
  const data = await fetchJsonWithTimeout(fawazUsdRatesUrl(dateTag));
  return parseFawazUsdJson(data);
}

async function fetchUsdRatesFrankfurter(ymd) {
  const data = await fetchJsonWithTimeout(frankfurterUsdRatesUrl(ymd));
  return parseFrankfurterUsdJson(data);
}

let cachedUsdRates = null;
let cachedAt = 0;

/** @type {Map<string, { rates: Record<string, number>|null, expiresAt: number }>} */
const datedRatesCache = new Map();
/** @type {Map<string, Promise<Record<string, number>|null>>} */
const datedInflight = new Map();

export function resetFxRatesCacheForTests() {
  cachedUsdRates = null;
  cachedAt = 0;
  datedRatesCache.clear();
  datedInflight.clear();
}

export async function getUsdRatesTable() {
  const now = Date.now();
  if (cachedUsdRates && now - cachedAt < CACHE_MS) {
    return cachedUsdRates;
  }
  let rates = await fetchUsdRatesOpenErApi();
  if (!rates) {
    rates = await fetchUsdRatesFawazForTag('latest');
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

/** Future receipt dates use today’s table — historical APIs have nothing later than now. */
export function clampDateMsForFxRates(dateMs) {
  const now = Date.now();
  let t = Number(dateMs);
  if (!Number.isFinite(t)) t = now;
  if (t > now) return now;
  return t;
}

/**
 * Calendar day of the receipt in local time (matches the date picker, which stores local noon).
 */
export function fxDateKey(dateMs) {
  const d = new Date(clampDateMsForFxRates(dateMs));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDaysToYmd(ymd, delta) {
  if (typeof ymd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + Number(delta || 0)));
  return dt.toISOString().slice(0, 10);
}

async function fetchHistoricalUsdRates(ymd) {
  for (let i = 0; i < HISTORICAL_WALKBACK_DAYS; i++) {
    const day = addDaysToYmd(ymd, -i);
    if (day >= FAWAZ_HISTORY_START) {
      const fawaz = await fetchUsdRatesFawazForTag(day);
      if (fawaz) return fawaz;
    }
    const frank = await fetchUsdRatesFrankfurter(day);
    if (frank) return frank;
  }
  return null;
}

/**
 * USD-quoted table for a receipt date. Today (and future, clamped) uses the latest table.
 * Older days use that date’s published rate, walking back up to a week if markets were closed.
 */
export async function getUsdRatesTableForDate(dateMs) {
  const ymd = fxDateKey(dateMs);
  const today = fxDateKey(Date.now());
  if (ymd >= today) {
    return getUsdRatesTable();
  }

  const hit = datedRatesCache.get(ymd);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.rates;
  }
  if (datedInflight.has(ymd)) {
    return datedInflight.get(ymd);
  }

  const pending = (async () => {
    const rates = await fetchHistoricalUsdRates(ymd);
    datedRatesCache.set(ymd, {
      rates,
      expiresAt: rates ? Number.POSITIVE_INFINITY : Date.now() + CACHE_MS,
    });
    return rates;
  })();
  datedInflight.set(ymd, pending);
  try {
    return await pending;
  } finally {
    datedInflight.delete(ymd);
  }
}

/** Unique receipt days → USD tables (null entry if that day could not be loaded). */
export async function getUsdRatesTablesForDates(dateMsList) {
  const byKey = new Map();
  for (const ms of dateMsList || []) {
    const ymd = fxDateKey(ms);
    if (!byKey.has(ymd)) byKey.set(ymd, ms);
  }
  const keys = [...byKey.keys()];
  const out = new Map();
  for (let i = 0; i < keys.length; i += FX_FETCH_CONCURRENCY) {
    const chunk = keys.slice(i, i + FX_FETCH_CONCURRENCY);
    const rows = await Promise.all(
      chunk.map(async (ymd) => [ymd, await getUsdRatesTableForDate(byKey.get(ymd))]),
    );
    for (const [ymd, rates] of rows) {
      out.set(ymd, rates);
    }
  }
  return out;
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
