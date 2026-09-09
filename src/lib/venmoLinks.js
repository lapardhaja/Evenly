/** Venmo handles: letters, numbers, underscore, hyphen. */
export const VENMO_USERNAME_RE = /^[a-zA-Z0-9_-]{3,30}$/;

/** If `venmo://` does not background the tab, open the HTTPS pay link. */
export const VENMO_APP_FALLBACK_MS = 1200;

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

function payQuery({ username, amount, note } = {}) {
  const u = normalizeVenmoUsername(username);
  if (!isValidVenmoUsername(u)) return null;
  const params = new URLSearchParams();
  params.set('txn', 'pay');
  params.set('recipients', u);
  const amt = formatVenmoAmount(amount);
  if (amt) params.set('amount', amt);
  const n = typeof note === 'string' ? note.trim().slice(0, 280) : '';
  if (n) params.set('note', n);
  return { username: u, params };
}

/**
 * HTTPS pay link. On iPhone/Android the Venmo app claims venmo.com and opens
 * the pay sheet; if the app is missing, the site loads instead of a dead `venmo://`.
 * @see https://gabeoleary.com/posts/venmo-deeplinking-including-from-web-apps/
 */
export function venmoWebPayUrl(opts = {}) {
  const q = payQuery(opts);
  if (!q) return '';
  return `https://venmo.com/${encodeURIComponent(q.username)}?${q.params.toString()}`;
}

export function venmoAppPayUrl(opts = {}) {
  const q = payQuery(opts);
  if (!q) return '';
  return `venmo://paycharge?${q.params.toString()}`;
}

/** Public profile — used to confirm the typed $cashtag is really theirs. */
export function venmoProfileUrl(raw) {
  const u = normalizeVenmoUsername(raw);
  if (!isValidVenmoUsername(u)) return '';
  return `https://venmo.com/${encodeURIComponent(u)}`;
}

export function isLikelyMobileUa(ua) {
  if (!ua || typeof ua !== 'string') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}

function openHttps(url, env) {
  if (!url || !env) return;
  try {
    const w = env.open?.(url, '_blank', 'noopener,noreferrer');
    if (w) return;
  } catch {
    /* popup blocked */
  }
  if (env.location) env.location.href = url;
}

/**
 * Open Venmo app on phones (`venmo://`, HTTPS fallback if the scheme is ignored);
 * otherwise the HTTPS pay URL.
 * Returns the URL that was used first, or '' if the handle is invalid.
 */
export function openVenmoPayment(opts, env = typeof window !== 'undefined' ? window : null) {
  const app = venmoAppPayUrl(opts);
  const web = venmoWebPayUrl(opts);
  if (!web) return '';
  const ua = env?.navigator?.userAgent || '';
  if (isLikelyMobileUa(ua) && app && env?.location) {
    let handedOff = false;
    const markLeft = () => {
      handedOff = true;
    };
    env.document?.addEventListener?.('visibilitychange', markLeft);
    env.addEventListener?.('pagehide', markLeft);
    env.location.href = app;
    const later = env.setTimeout || (typeof setTimeout === 'function' ? setTimeout : null);
    later?.(() => {
      env.document?.removeEventListener?.('visibilitychange', markLeft);
      env.removeEventListener?.('pagehide', markLeft);
      if (handedOff) return;
      if (env.document?.visibilityState === 'hidden') return;
      openHttps(web, env);
    }, VENMO_APP_FALLBACK_MS);
    return app;
  }
  openHttps(web, env);
  return web;
}

export function openVenmoProfile(username, env = typeof window !== 'undefined' ? window : null) {
  const url = venmoProfileUrl(username);
  if (!url) return '';
  openHttps(url, env);
  return url;
}
