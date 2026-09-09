/** Venmo handles: letters, numbers, underscore, hyphen. */
export const VENMO_USERNAME_RE = /^[a-zA-Z0-9_-]{3,30}$/;

export function normalizeVenmoUsername(raw) {
  if (raw == null) return '';
  return String(raw).trim().replace(/^@/, '');
}

export function isValidVenmoUsername(raw) {
  const u = normalizeVenmoUsername(raw);
  return VENMO_USERNAME_RE.test(u);
}

export function formatVenmoAmount(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return '';
  return (Math.round(n * 100) / 100).toFixed(2);
}

export function venmoWebPayUrl({ username, amount, note } = {}) {
  const u = normalizeVenmoUsername(username);
  if (!isValidVenmoUsername(u)) return '';
  const params = new URLSearchParams();
  params.set('txn', 'pay');
  const amt = formatVenmoAmount(amount);
  if (amt) params.set('amount', amt);
  const n = typeof note === 'string' ? note.trim().slice(0, 280) : '';
  if (n) params.set('note', n);
  return `https://venmo.com/${encodeURIComponent(u)}?${params.toString()}`;
}

export function venmoAppPayUrl({ username, amount, note } = {}) {
  const u = normalizeVenmoUsername(username);
  if (!isValidVenmoUsername(u)) return '';
  const params = new URLSearchParams();
  params.set('txn', 'pay');
  params.set('recipients', u);
  const amt = formatVenmoAmount(amount);
  if (amt) params.set('amount', amt);
  const n = typeof note === 'string' ? note.trim().slice(0, 280) : '';
  if (n) params.set('note', n);
  return `venmo://paycharge?${params.toString()}`;
}

export function isLikelyMobileUa(ua) {
  if (!ua || typeof ua !== 'string') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}

/**
 * Open Venmo app on phones; otherwise the web pay URL.
 * Returns the URL that was used (app or web), or '' if the handle is invalid.
 */
export function openVenmoPayment(opts, env = typeof window !== 'undefined' ? window : null) {
  const app = venmoAppPayUrl(opts);
  const web = venmoWebPayUrl(opts);
  if (!web) return '';
  const ua = env?.navigator?.userAgent || '';
  if (isLikelyMobileUa(ua) && app && env?.location) {
    env.location.href = app;
    return app;
  }
  if (env?.open) {
    env.open(web, '_blank', 'noopener,noreferrer');
  } else if (env?.location) {
    env.location.href = web;
  }
  return web;
}
