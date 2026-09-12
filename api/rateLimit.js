function headerValue(req, name) {
  const headers = req?.headers ?? {};
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) {
      if (typeof value === 'string') return value;
      if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
    }
  }
  return undefined;
}

/**
 * Client IP from the first X-Forwarded-For hop (Vercel appends trusted proxies after the client).
 */
export function clientIp(req) {
  const xff = headerValue(req, 'x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0].trim();
    if (first) return first;
  }
  const realIp = headerValue(req, 'x-real-ip');
  if (realIp && realIp.trim()) return realIp.trim();
  const socketIp = req?.socket?.remoteAddress;
  if (typeof socketIp === 'string' && socketIp) return socketIp;
  return 'unknown';
}

/**
 * Best-effort sliding window. Each serverless isolate has its own Map; cold starts reset it.
 * @param {{ windowMs: number, max: number }} opts
 */
export function createRateLimiter({ windowMs, max }) {
  /** @type {Map<string, number[]>} */
  const hits = new Map();

  function pruneStale(now) {
    if (hits.size < 4000) return;
    for (const [key, times] of hits) {
      const next = times.filter((t) => now - t < windowMs);
      if (next.length === 0) hits.delete(key);
      else hits.set(key, next);
    }
  }

  return {
    /**
     * @param {string} key
     * @param {number} [now]
     * @returns {{ ok: true } | { ok: false, retryAfterSec: number }}
     */
    check(key, now = Date.now()) {
      const id = key || 'unknown';
      const times = (hits.get(id) || []).filter((t) => now - t < windowMs);
      if (times.length >= max) {
        hits.set(id, times);
        const retryAfterSec = Math.max(1, Math.ceil((times[0] + windowMs - now) / 1000));
        return { ok: false, retryAfterSec };
      }
      times.push(now);
      hits.set(id, times);
      if (hits.size % 250 === 0) pruneStale(now);
      return { ok: true };
    },
    reset() {
      hits.clear();
    },
    get size() {
      return hits.size;
    },
  };
}

/** Receipt OCR: 15 images / 15 minutes / IP. */
export const SCAN_RATE = { windowMs: 15 * 60 * 1000, max: 15 };

/** Chat push fan-out: 120 POSTs / 5 minutes / IP (one POST per outbound message). */
export const CHAT_PUSH_RATE = { windowMs: 5 * 60 * 1000, max: 120 };
