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

/**
 * Frankfurter returns `rates[to]` = how many units of `to` equal 1 unit of `from`.
 * ECB publishes many crosses only vs EUR; direct ?from=A&to=B often 404s — use inverse + EUR bridge.
 */

function dateToIsoUtc(ms) {
  const d = new Date(Number(ms));
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Future / invalid receipt dates break historical endpoints — clamp to today (UTC). */
export function clampDateMsForFxRates(dateMs) {
  const now = Date.now();
  let t = Number(dateMs);
  if (!Number.isFinite(t)) t = now;
  if (t > now) return now;
  return t;
}

async function frankfurterRate(from, to, pathDate) {
  const url = `https://api.frankfurter.app/${pathDate}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const r = data?.rates?.[to];
  if (typeof r !== 'number' || !Number.isFinite(r) || r <= 0) return null;
  return r;
}

/**
 * `to` per 1 `from`. Tries: direct → inverse → via EUR (ECB hub).
 */
async function conversionFactorOnce(from, to, pathDate) {
  if (from === to) return 1;

  let r = await frankfurterRate(from, to, pathDate);
  if (r != null) return r;

  const inv = await frankfurterRate(to, from, pathDate);
  if (inv != null && inv > 0) return 1 / inv;

  if (from !== 'EUR' && to !== 'EUR') {
    const toEur = await frankfurterRate(from, 'EUR', pathDate);
    const eurTo = await frankfurterRate('EUR', to, pathDate);
    if (toEur != null && eurTo != null && toEur > 0 && eurTo > 0) {
      return toEur * eurTo;
    }
  }

  return null;
}

async function conversionFactorWithFallbacks(from, to, dateMs) {
  const clamped = clampDateMsForFxRates(dateMs);
  const iso = dateToIsoUtc(clamped);
  const datesToTry = [];
  if (iso) datesToTry.push(iso);
  datesToTry.push('latest');

  for (const pathDate of datesToTry) {
    const r = await conversionFactorOnce(from, to, pathDate);
    if (r != null && Number.isFinite(r) && r > 0) return r;
  }
  return null;
}

/**
 * Frankfurter API (ECB-based, no key).
 * @returns {Promise<number|null>} multiplier: amount in `to` = amount in `from` × return value
 */
export async function fetchConversionRate(fromCurrency, toCurrency, dateMs) {
  const from = normalizeCurrencyCode(fromCurrency);
  const to = normalizeCurrencyCode(toCurrency);
  if (from === to) return 1;

  return conversionFactorWithFallbacks(from, to, dateMs);
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
