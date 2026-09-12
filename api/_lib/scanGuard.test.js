import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertScanRequestAllowed,
  resolveCorsAllowOrigin,
} from './scanGuard.js';

test('rejects when secret set and header missing', () => {
  const r = assertScanRequestAllowed(
    { headers: {} },
    { SCAN_API_SECRET: 's3cret' },
  );
  assert.equal(r.ok, false);
  assert.equal(r.status, 401);
});

test('allows when secret matches', () => {
  const r = assertScanRequestAllowed(
    { headers: { 'x-evenly-scan-secret': 's3cret' } },
    { SCAN_API_SECRET: 's3cret' },
  );
  assert.equal(r.ok, true);
});

test('rejects when secret set and header wrong', () => {
  const r = assertScanRequestAllowed(
    { headers: { 'x-evenly-scan-secret': 'wrong' } },
    { SCAN_API_SECRET: 's3cret' },
  );
  assert.equal(r.ok, false);
  assert.equal(r.status, 401);
});

test('allows when secret not configured', () => {
  const r = assertScanRequestAllowed({ headers: {} }, {});
  assert.equal(r.ok, true);
});

test('rejects origin not in CORS_ALLOW_ORIGIN when configured', () => {
  const r = assertScanRequestAllowed(
    { headers: { origin: 'https://evil.example' } },
    { CORS_ALLOW_ORIGIN: 'https://app.example,https://www.example' },
  );
  assert.equal(r.ok, false);
  assert.equal(r.status, 403);
});

test('allows origin in CORS_ALLOW_ORIGIN list', () => {
  const r = assertScanRequestAllowed(
    { headers: { origin: 'https://app.example' } },
    { CORS_ALLOW_ORIGIN: 'https://app.example,https://www.example' },
  );
  assert.equal(r.ok, true);
});

test('reflects matching request origin for CORS', () => {
  const origin = resolveCorsAllowOrigin(
    { headers: { origin: 'https://app.example' } },
    { CORS_ALLOW_ORIGIN: 'https://app.example,https://www.example' },
  );
  assert.equal(origin, 'https://app.example');
});

test('does not return wildcard when secret configured', () => {
  const origin = resolveCorsAllowOrigin(
    { headers: { origin: 'https://app.example' } },
    { SCAN_API_SECRET: 's3cret', CORS_ALLOW_ORIGIN: 'https://other.example' },
  );
  assert.notEqual(origin, '*');
  assert.equal(origin, null);
});

test('never returns wildcard even without secret or allowlist', () => {
  const origin = resolveCorsAllowOrigin(
    { headers: { origin: 'https://app.example' } },
    {},
  );
  assert.notEqual(origin, '*');
  assert.equal(origin, null);
});

test('returns null when no Origin header and no allowlist', () => {
  const origin = resolveCorsAllowOrigin({ headers: {} }, {});
  assert.equal(origin, null);
});
