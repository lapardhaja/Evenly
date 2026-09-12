import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createRateLimiter } from './rateLimit.js';

/** @type {Map<string, ReturnType<typeof createRateLimiter>>} */
const memoryByBucket = new Map();

export function hashRateLimitKey(ip, env = process.env) {
  const pepper =
    env.RATE_LIMIT_PEPPER || env.SUPABASE_SERVICE_ROLE_KEY || 'evenly-rate-limit';
  return createHash('sha256')
    .update(`${pepper}:${ip || 'unknown'}`)
    .digest('hex')
    .slice(0, 32);
}

function windowKey(bucket, ipHash, windowMs, now) {
  const slot = Math.floor(now / windowMs);
  return `evenly:rl:${bucket}:${ipHash}:${slot}`;
}

function memoryConsume(bucket, ipHash, windowMs, max, now) {
  const id = `${bucket}:${windowMs}:${max}`;
  let limiter = memoryByBucket.get(id);
  if (!limiter) {
    limiter = createRateLimiter({ windowMs, max });
    memoryByBucket.set(id, limiter);
  }
  return limiter.check(ipHash, now);
}

/**
 * Upstash REST fixed window. Returns null if not configured or the request fails
 * (caller falls through).
 */
export async function consumeUpstash({
  bucket,
  ipHash,
  windowMs,
  max,
  now = Date.now(),
  env = process.env,
  fetchImpl = fetch,
}) {
  const base = (env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
  const token = env.UPSTASH_REDIS_REST_TOKEN || '';
  if (!base || !token) return null;

  const ttl = Math.max(1, Math.ceil(windowMs / 1000));
  const key = windowKey(bucket, ipHash, windowMs, now);
  try {
    const res = await fetchImpl(`${base}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, ttl, 'NX'],
      ]),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const count = Number(Array.isArray(data) ? data[0]?.result : data?.result);
    if (!Number.isFinite(count)) return null;
    if (count > max) {
      const retryAfterSec = Math.max(1, ttl - Math.floor((now % windowMs) / 1000));
      return { ok: false, retryAfterSec, store: 'upstash' };
    }
    return { ok: true, store: 'upstash' };
  } catch {
    return null;
  }
}

export async function consumePostgres({
  bucket,
  ipHash,
  windowMs,
  max,
  env = process.env,
  rpc,
}) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
  const service = env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !service) return null;

  const call =
    rpc ||
    (async (args) => {
      const admin = createClient(url, service, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      return admin.rpc('consume_rate_limit', args);
    });

  try {
    const { data, error } = await call({
      p_bucket: bucket,
      p_ip_hash: ipHash,
      p_window_seconds: Math.max(1, Math.ceil(windowMs / 1000)),
      p_max: max,
    });
    if (error || data == null) return null;
    const row = typeof data === 'string' ? JSON.parse(data) : data;
    if (row && typeof row === 'object' && row.ok === false) {
      return {
        ok: false,
        retryAfterSec: Math.max(1, Number(row.retry_after_sec) || 1),
        store: 'postgres',
      };
    }
    if (row && typeof row === 'object' && row.ok === true) {
      return { ok: true, store: 'postgres' };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Shared limiter: Upstash (if env) → Postgres RPC (if service role) → in-memory.
 */
export async function consumeRateLimit({
  bucket,
  ip,
  windowMs,
  max,
  now = Date.now(),
  env = process.env,
  fetchImpl = fetch,
  rpc,
}) {
  const ipHash = hashRateLimitKey(ip, env);
  const upstash = await consumeUpstash({
    bucket,
    ipHash,
    windowMs,
    max,
    now,
    env,
    fetchImpl,
  });
  if (upstash) return upstash;
  const pg = await consumePostgres({ bucket, ipHash, windowMs, max, env, rpc });
  if (pg) return pg;
  const mem = memoryConsume(bucket, ipHash, windowMs, max, now);
  return mem.ok ? { ok: true, store: 'memory' } : { ...mem, store: 'memory' };
}

export function resetDurableRateLimitForTests() {
  memoryByBucket.clear();
}
