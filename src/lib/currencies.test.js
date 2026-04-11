import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCurrencyCode, clampDateMsForFxRates } from './currencies.js';

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
