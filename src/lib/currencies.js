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
 * Frankfurter API (ECB-based, no key). date: YYYY-MM-DD or 'latest'
 * @returns {Promise<number>} rate such that 1 `from` = rate × `to` — actually API returns rates object.
 * frankfurter: GET /{date}?from=USD&to=EUR returns { rates: { EUR: 0.92 } } meaning 1 USD = 0.92 EUR
 */
export async function fetchConversionRate(fromCurrency, toCurrency, dateMs) {
  const from = normalizeCurrencyCode(fromCurrency);
  const to = normalizeCurrencyCode(toCurrency);
  if (from === to) return 1;

  const d = new Date(Number(dateMs) || Date.now());
  const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

  const tryFetch = async (pathDate) => {
    const url = `https://api.frankfurter.app/${pathDate}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`rate ${res.status}`);
    const data = await res.json();
    const r = data?.rates?.[to];
    if (typeof r !== 'number' || !Number.isFinite(r) || r <= 0) throw new Error('bad rate');
    return r;
  };

  try {
    return await tryFetch(iso);
  } catch {
    try {
      return await tryFetch('latest');
    } catch {
      return null;
    }
  }
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
