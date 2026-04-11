/** Common ISO 4217 codes for UI pickers (subset). */
export const SETTLEMENT_CURRENCY_OPTIONS = [
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'GBP', label: 'British Pound (GBP)' },
  { code: 'CAD', label: 'Canadian Dollar (CAD)' },
  { code: 'AUD', label: 'Australian Dollar (AUD)' },
  { code: 'CHF', label: 'Swiss Franc (CHF)' },
  { code: 'JPY', label: 'Japanese Yen (JPY)' },
  { code: 'INR', label: 'Indian Rupee (INR)' },
  { code: 'MXN', label: 'Mexican Peso (MXN)' },
  { code: 'BRL', label: 'Brazilian Real (BRL)' },
  { code: 'NZD', label: 'New Zealand Dollar (NZD)' },
  { code: 'SEK', label: 'Swedish Krona (SEK)' },
  { code: 'NOK', label: 'Norwegian Krone (NOK)' },
  { code: 'DKK', label: 'Danish Krone (DKK)' },
  { code: 'PLN', label: 'Polish Złoty (PLN)' },
  { code: 'TRY', label: 'Turkish Lira (TRY)' },
];

const FALLBACK = 'USD';

export function normalizeCurrencyCode(code) {
  if (code == null || typeof code !== 'string') return FALLBACK;
  const c = code.trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(c)) return c;
  return FALLBACK;
}

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
