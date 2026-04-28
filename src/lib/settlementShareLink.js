/**
 * Encode settlement summary into a URL-safe token for #/shared-settlement/:token
 * (base64url — no slashes, safe in hash routes).
 * Large payloads use gzip + base64url (prefix z1.) when that yields a shorter token.
 */

const MAX_TITLE = 80;
const MAX_NOTE = 280;
const MAX_NAME = 48;
const MAX_TRANSFERS = 40;
const MAX_WARNINGS = 5;
const MAX_WARNING_LEN = 120;

const COMPRESSED_PREFIX = 'z1.';

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

function bytesToBase64Url(bytes) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64url');
  }
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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

function base64UrlToBytes(b64url) {
  const raw = String(b64url || '').trim();
  if (!raw) throw new Error('empty');
  const pad = raw.length % 4 === 0 ? '' : '='.repeat(4 - (raw.length % 4));
  const b64std = raw.replace(/-/g, '+').replace(/_/g, '/') + pad;
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64std, 'base64'));
  }
  const bin = atob(b64std);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function base64UrlToJson(token) {
  const bytes = base64UrlToBytes(token);
  let s;
  if (typeof Buffer !== 'undefined') {
    s = Buffer.from(bytes).toString('utf8');
  } else {
    s = new TextDecoder().decode(bytes);
  }
  return JSON.parse(s);
}

async function gzipUtf8StringToBase64Url(str) {
  const enc = new TextEncoder();
  const input = enc.encode(str);
  const stream = new Blob([input]).stream().pipeThrough(new CompressionStream('gzip'));
  const buf = await new Response(stream).arrayBuffer();
  return bytesToBase64Url(new Uint8Array(buf));
}

async function gunzipBase64UrlToUtf8String(b64Part) {
  const bytes = base64UrlToBytes(b64Part);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const buf = await new Response(stream).arrayBuffer();
  return new TextDecoder().decode(buf);
}

/** @returns {{ ok: true, data: object } | { ok: false, error: string }} */
function normalizeSettlementShareRaw(raw) {
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
}

/**
 * Sync parse for legacy uncompressed tokens only.
 * @returns {{ ok: true, data: object } | { ok: false, error: string }}
 */
export function parseSettlementShareToken(token) {
  const t = String(token || '').trim();
  if (!t) return { ok: false, error: 'parse' };
  if (t.startsWith(COMPRESSED_PREFIX)) {
    return { ok: false, error: 'async' };
  }
  try {
    const raw = base64UrlToJson(t);
    return normalizeSettlementShareRaw(raw);
  } catch {
    return { ok: false, error: 'parse' };
  }
}

/**
 * Parse any token (uncompressed or z1. gzip).
 * @returns {Promise<{ ok: true, data: object } | { ok: false, error: string }>}
 */
export async function parseSettlementShareTokenAsync(token) {
  const t = String(token || '').trim();
  if (!t) return { ok: false, error: 'parse' };
  if (t.startsWith(COMPRESSED_PREFIX)) {
    try {
      const json = await gunzipBase64UrlToUtf8String(t.slice(COMPRESSED_PREFIX.length));
      const raw = JSON.parse(json);
      return normalizeSettlementShareRaw(raw);
    } catch {
      return { ok: false, error: 'parse' };
    }
  }
  return parseSettlementShareToken(t);
}

/**
 * Prefer gzip+base64url when shorter (helps SMS / iMessage URL limits).
 * @param {object} payload - from buildSettlementSharePayload
 * @returns {Promise<string>}
 */
export async function encodeSettlementShareToken(payload) {
  const jsonToken = jsonToBase64Url(payload);
  if (typeof CompressionStream === 'undefined') {
    return jsonToken;
  }
  try {
    const zippedBody = await gzipUtf8StringToBase64Url(JSON.stringify(payload));
    const compressedToken = `${COMPRESSED_PREFIX}${zippedBody}`;
    return compressedToken.length < jsonToken.length ? compressedToken : jsonToken;
  } catch {
    return jsonToken;
  }
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
