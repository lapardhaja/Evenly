/**
 * Encode settlement summary into a URL-safe token for #/shared-settlement/:token
 * (base64url — no slashes, safe in hash routes).
 */

const MAX_TITLE = 80;
const MAX_NOTE = 280;
const MAX_NAME = 48;
const MAX_TRANSFERS = 40;
const MAX_WARNINGS = 5;
const MAX_WARNING_LEN = 120;

function clampStr(s, max) {
  if (s == null) return '';
  const t = String(s).trim();
  return t.length > max ? t.slice(0, max) : t;
}

function moneyToCents(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/**
 * @param {object} opts
 * @param {string} [opts.groupName]
 * @param {string} [opts.note] - optional message shown on shared page
 * @param {Array<{from: string, to: string, amount: number}>} opts.transfers
 * @param {string[]} [opts.warnings] - short notes (e.g. missing payer)
 */
export function buildSettlementSharePayload({
  groupName = '',
  note = '',
  transfers = [],
  warnings = [],
  settleCurrencyCode = 'USD',
}) {
  const g = clampStr(groupName, MAX_TITLE);
  const cur = String(settleCurrencyCode || 'USD')
    .trim()
    .toUpperCase()
    .slice(0, 3);
  const curSafe = /^[A-Z]{3}$/.test(cur) ? cur : 'USD';
  const n = clampStr(note, MAX_NOTE);
  const w = (warnings || [])
    .slice(0, MAX_WARNINGS)
    .map((x) => clampStr(x, MAX_WARNING_LEN))
    .filter(Boolean);
  const p = (transfers || []).slice(0, MAX_TRANSFERS).map((t) => ({
    f: clampStr(t.from, MAX_NAME),
    t: clampStr(t.to, MAX_NAME),
    c: Math.max(0, Math.min(999_999_999, moneyToCents(t.amount))),
  })).filter((row) => row.f && row.t && row.c > 0);

  return { v: 2, g, cur: curSafe, ...(n ? { n } : {}), ...(w.length ? { w } : {}), p };
}

function jsonToBase64Url(obj) {
  const s = JSON.stringify(obj);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(s, 'utf8').toString('base64url');
  }
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToJson(token) {
  const raw = String(token || '').trim();
  if (!raw) throw new Error('empty');
  const pad = raw.length % 4 === 0 ? '' : '='.repeat(4 - (raw.length % 4));
  const b64std = raw.replace(/-/g, '+').replace(/_/g, '/') + pad;
  let s;
  if (typeof Buffer !== 'undefined') {
    s = Buffer.from(b64std, 'base64').toString('utf8');
  } else {
    const bin = atob(b64std);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    s = new TextDecoder().decode(bytes);
  }
  return JSON.parse(s);
}

/** @returns {{ ok: true, data: object } | { ok: false, error: string }} */
export function parseSettlementShareToken(token) {
  try {
    const raw = base64UrlToJson(token);
    if (!raw || (raw.v !== 1 && raw.v !== 2) || !Array.isArray(raw.p)) {
      return { ok: false, error: 'invalid' };
    }
    const g = clampStr(raw.g, MAX_TITLE);
    let cur = 'USD';
    if (raw.v === 2 && raw.cur != null) {
      const c = String(raw.cur).trim().toUpperCase().slice(0, 3);
      if (/^[A-Z]{3}$/.test(c)) cur = c;
    }
    const n = raw.n != null ? clampStr(raw.n, MAX_NOTE) : '';
    const w = Array.isArray(raw.w)
      ? raw.w.slice(0, MAX_WARNINGS).map((x) => clampStr(x, MAX_WARNING_LEN)).filter(Boolean)
      : [];
    const p = raw.p
      .slice(0, MAX_TRANSFERS)
      .map((row) => ({
        from: clampStr(row.f, MAX_NAME),
        to: clampStr(row.t, MAX_NAME),
        cents: Math.max(0, Math.min(999_999_999, Math.round(Number(row.c) || 0))),
      }))
      .filter((row) => row.from && row.to && row.cents > 0);

    return {
      ok: true,
      data: { groupName: g, note: n, warnings: w, transfers: p, currencyCode: cur },
    };
  } catch {
    return { ok: false, error: 'parse' };
  }
}

export function encodeSettlementShareToken(payload) {
  return jsonToBase64Url(payload);
}

/**
 * Full in-app path for HashRouter (leading slash, no hash).
 * @param {string} token - from encodeSettlementShareToken
 */
export function settlementSharePath(token) {
  return `/shared-settlement/${token}`;
}

/**
 * Absolute URL for sharing (uses current origin + pathname + hash).
 */
export function settlementShareAbsoluteUrl(token) {
  if (typeof window === 'undefined') return '';
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#${settlementSharePath(token)}`;
}
