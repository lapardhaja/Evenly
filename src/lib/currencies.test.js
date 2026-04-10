import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCurrencyCode } from './currencies.js';

test('normalizeCurrencyCode', () => {
  assert.equal(normalizeCurrencyCode('eur'), 'EUR');
  assert.equal(normalizeCurrencyCode('  usd '), 'USD');
  assert.equal(normalizeCurrencyCode(''), 'USD');
  assert.equal(normalizeCurrencyCode(null), 'USD');
});
