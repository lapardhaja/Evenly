import test from 'node:test';
import assert from 'node:assert/strict';
import STATIC_ISO_CODES from '../data/iso4217CurrencyCodes.js';
import {
  normalizeCurrencyCode,
  clampDateMsForFxRates,
  conversionFactorFromUsdRates,
  buildCurrencySelectOptions,
  fxDateKey,
  addDaysToYmd,
  fawazUsdRatesUrl,
  frankfurterUsdRatesUrl,
  parseFawazUsdJson,
  parseFrankfurterUsdJson,
  parseOpenErApiUsdJson,
  getUsdRatesTableForDate,
  resetFxRatesCacheForTests,
  FAWAZ_HISTORY_START,
} from './currencies.js';

test('normalizeCurrencyCode', () => {
  assert.equal(normalizeCurrencyCode('eur'), 'EUR');
  assert.equal(normalizeCurrencyCode('  usd '), 'USD');
  assert.equal(normalizeCurrencyCode(''), 'USD');
  assert.equal(normalizeCurrencyCode(null), 'USD');
});

test('clampDateMsForFxRates: future dates clamp to now', () => {
  const now = Date.now();
  const future = now + 86400000 * 365;
  const c = clampDateMsForFxRates(future);
  assert.ok(Math.abs(c - now) < 2000);
});

test('clampDateMsForFxRates: past dates unchanged', () => {
  const past = Date.UTC(2020, 0, 15, 12, 0, 0);
  assert.equal(clampDateMsForFxRates(past), past);
});

test('conversionFactorFromUsdRates: USD table cross', () => {
  const rates = { USD: 1, EUR: 0.9, GBP: 0.8 };
  const eurPerGbp = conversionFactorFromUsdRates(rates, 'GBP', 'EUR');
  assert.ok(eurPerGbp != null);
  assert.ok(Math.abs(eurPerGbp - 0.9 / 0.8) < 1e-9);
});

test('static fallback list excludes withdrawn codes used in picker filter', () => {
  const withdrawn = new Set(['HRK', 'SLL', 'CUC', 'CLF']);
  const codes = STATIC_ISO_CODES.filter((c) => !withdrawn.has(c));
  assert.ok(!codes.includes('HRK'));
  assert.ok(!codes.includes('SLL'));
  assert.ok(codes.includes('USD'));
  const opts = buildCurrencySelectOptions(codes.slice(0, 5));
  assert.equal(opts.length, 5);
  assert.ok(opts[0].label.startsWith(opts[0].code));
});

test('fxDateKey uses local calendar day', () => {
  const ms = new Date(2024, 5, 15, 12, 0, 0).getTime();
  assert.equal(fxDateKey(ms), '2024-06-15');
});

test('addDaysToYmd walks calendar days', () => {
  assert.equal(addDaysToYmd('2024-06-16', -1), '2024-06-15');
  assert.equal(addDaysToYmd('2024-03-01', -1), '2024-02-29');
});

test('FX URL builders stay on allowlisted hosts', () => {
  assert.equal(
    fawazUsdRatesUrl('2024-06-15'),
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@2024-06-15/v1/currencies/usd.json',
  );
  assert.equal(
    frankfurterUsdRatesUrl('2020-01-15'),
    'https://api.frankfurter.dev/v1/2020-01-15?from=USD',
  );
  assert.match(FAWAZ_HISTORY_START, /^\d{4}-\d{2}-\d{2}$/);
});

test('parse USD tables from each FX host', () => {
  const fawaz = parseFawazUsdJson({ usd: { eur: 0.92, usd: 1 } });
  assert.equal(fawaz.EUR, 0.92);
  assert.equal(fawaz.USD, 1);
  const frank = parseFrankfurterUsdJson({
    base: 'USD',
    date: '2020-01-15',
    rates: { EUR: 0.8975, GBP: 0.77 },
  });
  assert.equal(frank.EUR, 0.8975);
  const open = parseOpenErApiUsdJson({ result: 'success', rates: { EUR: 0.9 } });
  assert.equal(open.EUR, 0.9);
  assert.equal(parseOpenErApiUsdJson({ result: 'error' }), null);
});

test('getUsdRatesTableForDate: fawaz dated URL for post-archive days', async () => {
  resetFxRatesCacheForTests();
  const urls = [];
  const orig = globalThis.fetch;
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    return {
      ok: true,
      json: async () => ({ usd: { eur: 0.91, usd: 1 } }),
    };
  };
  try {
    const rates = await getUsdRatesTableForDate(new Date(2024, 5, 15, 12).getTime());
    assert.equal(rates.EUR, 0.91);
    assert.equal(urls.length, 1);
    assert.match(urls[0], /currency-api@2024-06-15/);
    assert.equal(urls[0].includes('frankfurter'), false);
  } finally {
    globalThis.fetch = orig;
    resetFxRatesCacheForTests();
  }
});

test('getUsdRatesTableForDate: pre-archive days skip fawaz and hit Frankfurter', async () => {
  resetFxRatesCacheForTests();
  const urls = [];
  const orig = globalThis.fetch;
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    return {
      ok: true,
      json: async () => ({
        base: 'USD',
        rates: { EUR: 0.88, GBP: 0.76 },
      }),
    };
  };
  try {
    const rates = await getUsdRatesTableForDate(new Date(2020, 0, 15, 12).getTime());
    assert.equal(rates.EUR, 0.88);
    assert.ok(urls.length >= 1);
    assert.ok(urls.every((u) => u.includes('api.frankfurter.dev')));
    assert.ok(urls.every((u) => !u.includes('currency-api')));
    assert.match(urls[0], /2020-01-15/);
  } finally {
    globalThis.fetch = orig;
    resetFxRatesCacheForTests();
  }
});

test('getUsdRatesTableForDate: walks back a day when the requested date 404s', async () => {
  resetFxRatesCacheForTests();
  const urls = [];
  const orig = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = String(url);
    urls.push(u);
    if (u.includes('2024-06-16')) {
      return { ok: false, json: async () => ({}) };
    }
    return {
      ok: true,
      json: async () => ({ usd: { eur: 0.93, usd: 1 } }),
    };
  };
  try {
    const rates = await getUsdRatesTableForDate(new Date(2024, 5, 16, 12).getTime());
    assert.equal(rates.EUR, 0.93);
    assert.ok(urls.some((u) => u.includes('2024-06-16')));
    assert.ok(urls.some((u) => u.includes('2024-06-15')));
  } finally {
    globalThis.fetch = orig;
    resetFxRatesCacheForTests();
  }
});

