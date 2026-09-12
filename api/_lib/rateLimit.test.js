import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clientIp,
  createRateLimiter,
  SCAN_RATE,
  CHAT_PUSH_RATE,
} from './rateLimit.js';
import { applyApiSecurityHeaders } from './httpSecurity.js';

test('clientIp uses the first X-Forwarded-For hop', () => {
  assert.equal(
    clientIp({ headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' } }),
    '203.0.113.9',
  );
  assert.equal(clientIp({ headers: { 'x-real-ip': '198.51.100.2' } }), '198.51.100.2');
  assert.equal(clientIp({ headers: {} }), 'unknown');
});

test('sliding window allows max then 429s until the oldest hit expires', () => {
  const limiter = createRateLimiter({ windowMs: 1000, max: 2 });
  const t0 = 1_000_000;
  assert.equal(limiter.check('a', t0).ok, true);
  assert.equal(limiter.check('a', t0 + 10).ok, true);
  const blocked = limiter.check('a', t0 + 20);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfterSec >= 1);
  assert.equal(limiter.check('b', t0 + 20).ok, true);
  assert.equal(limiter.check('a', t0 + 1011).ok, true);
});

test('scan and chat-push budgets are documented', () => {
  assert.equal(SCAN_RATE.max, 15);
  assert.equal(SCAN_RATE.windowMs, 15 * 60 * 1000);
  assert.equal(CHAT_PUSH_RATE.max, 120);
  assert.equal(CHAT_PUSH_RATE.windowMs, 5 * 60 * 1000);
});

test('applyApiSecurityHeaders sets nosniff, DENY, no-store', () => {
  const headers = {};
  applyApiSecurityHeaders({
    setHeader(k, v) {
      headers[k] = v;
    },
  });
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['X-Frame-Options'], 'DENY');
  assert.equal(headers['Cache-Control'], 'no-store');
});
