import test from 'node:test';
import assert from 'node:assert/strict';
import {
  consumeRateLimit,
  consumeUpstash,
  consumePostgres,
  hashRateLimitKey,
  resetDurableRateLimitForTests,
} from './durableRateLimit.js';

test('hashRateLimitKey is stable and not the raw IP', () => {
  const a = hashRateLimitKey('203.0.113.9', { RATE_LIMIT_PEPPER: 'pep' });
  const b = hashRateLimitKey('203.0.113.9', { RATE_LIMIT_PEPPER: 'pep' });
  assert.equal(a, b);
  assert.equal(a.includes('203.0.113'), false);
  assert.equal(a.length, 32);
});

test('Upstash INCR over max returns 429-shaped result', async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => [{ result: 16 }, { result: 1 }],
  });
  const r = await consumeUpstash({
    bucket: 'scan',
    ipHash: 'abc',
    windowMs: 1000,
    max: 15,
    env: { UPSTASH_REDIS_REST_URL: 'https://example.upstash.io', UPSTASH_REDIS_REST_TOKEN: 't' },
    fetchImpl,
  });
  assert.equal(r.ok, false);
  assert.equal(r.store, 'upstash');
  assert.ok(r.retryAfterSec >= 1);
});

test('Postgres RPC ok:false maps to retry', async () => {
  const r = await consumePostgres({
    bucket: 'scan',
    ipHash: 'abc',
    windowMs: 1000,
    max: 2,
    env: { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'svc' },
    rpc: async () => ({ data: { ok: false, retry_after_sec: 9 }, error: null }),
  });
  assert.equal(r.ok, false);
  assert.equal(r.retryAfterSec, 9);
  assert.equal(r.store, 'postgres');
});

test('Upstash skip and Postgres skip when env is missing', async () => {
  assert.equal(
    await consumeUpstash({
      bucket: 'scan',
      ipHash: 'abc',
      windowMs: 1000,
      max: 1,
      env: {},
    }),
    null,
  );
  assert.equal(
    await consumePostgres({
      bucket: 'scan',
      ipHash: 'abc',
      windowMs: 1000,
      max: 1,
      env: {},
    }),
    null,
  );
});

test('falls back to memory when no durable store is configured', async () => {
  resetDurableRateLimitForTests();
  const env = {};
  const a = await consumeRateLimit({
    bucket: 't',
    ip: '1.1.1.1',
    windowMs: 1000,
    max: 2,
    now: 5_000,
    env,
  });
  const b = await consumeRateLimit({
    bucket: 't',
    ip: '1.1.1.1',
    windowMs: 1000,
    max: 2,
    now: 5_010,
    env,
  });
  const c = await consumeRateLimit({
    bucket: 't',
    ip: '1.1.1.1',
    windowMs: 1000,
    max: 2,
    now: 5_020,
    env,
  });
  assert.equal(a.ok, true);
  assert.equal(a.store, 'memory');
  assert.equal(b.ok, true);
  assert.equal(c.ok, false);
  assert.equal(c.store, 'memory');
});
