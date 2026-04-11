import test from 'node:test';
import assert from 'node:assert/strict';
import STATIC_ISO_CODES from '../data/iso4217CurrencyCodes.js';
import {
  normalizeCurrencyCode,
  clampDateMsForFxRates,
  conversionFactorFromUsdRates,
  buildCurrencySelectOptions,
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
