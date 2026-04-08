/**
 * HashRouter + Supabase recovery: tokens may appear as
 *   #/reset-password?access_token=...&refresh_token=...
 * or #/reset-password&access_token=...&refresh_token=...
 *
 * `index.html` may stash tokens in sessionStorage first (before SW/React) — see EVENLY_AUTH_PENDING_KEY.
 *
 * Some redirects use ?code=... (PKCE) on the main URL search — we check that too.
 */

export const EVENLY_AUTH_PENDING_KEY = 'evenly:auth:pending';

function parseQueryLikeSegments(fragmentWithoutHash) {
  /** @type {Record<string, string>} */
  const out = {};
  if (!fragmentWithoutHash) return out;
  const segments = fragmentWithoutHash.split(/[?&]/);
  for (const seg of segments) {
    if (!seg || !seg.includes('=')) continue;
    const eq = seg.indexOf('=');
    const key = decodeURIComponent(seg.slice(0, eq).replace(/\+/g, ' '));
    const val = decodeURIComponent(seg.slice(eq + 1).replace(/\+/g, ' '));
    if (key) out[key] = val;
  }
  return out;
}

function parseSearchParams() {
  if (typeof window === 'undefined') return {};
  const out = {};
  const sp = new URLSearchParams(window.location.search);
  sp.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

/**
 * @returns {{ access_token?: string, refresh_token?: string, code?: string, type?: string }}
 */
export function extractAuthParamsFromWindow() {
  if (typeof window === 'undefined') return {};
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const fromHash = parseQueryLikeSegments(hash);
  const fromSearch = parseSearchParams();
  return { ...fromSearch, ...fromHash };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<boolean>} true if session was established from URL
 */
export async function applySupabaseSessionFromHash(supabase) {
  if (typeof window === 'undefined' || !supabase) return false;

  const params = extractAuthParamsFromWindow();
  let access_token = params.access_token;
  let refresh_token = params.refresh_token;
  let code = params.code;

  if ((!access_token || !refresh_token) && !code) {
    try {
      const raw = sessionStorage.getItem(EVENLY_AUTH_PENDING_KEY);
      if (raw) {
        const pending = JSON.parse(raw);
        if (pending?.access_token && pending?.refresh_token) {
          access_token = pending.access_token;
          refresh_token = pending.refresh_token;
        }
        if (pending?.code) code = pending.code;
      }
    } catch {
      /* ignore */
    }
  }

  let applied = false;

  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) {
      console.error('Evenly: setSession from URL failed', error);
      return false;
    }
    applied = true;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('Evenly: exchangeCodeForSession failed', error);
      return false;
    }
    applied = !!data?.session;
  }

  if (!applied) return false;

  try {
    sessionStorage.removeItem(EVENLY_AUTH_PENDING_KEY);
  } catch {
    /* ignore */
  }

  // Strip tokens from the address bar; keep only the hash route (e.g. #/reset-password)
  const h = window.location.hash;
  const routeMatch = h.match(/^#(\/[^?&]*)/);
  const route = routeMatch ? `#${routeMatch[1]}` : '#/reset-password';
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${route}`);

  return true;
}
