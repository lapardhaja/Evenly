/**
 * Supabase redirects after password reset / email confirm with tokens in the URL.
 * HashRouter + GoTrue produce awkward shapes; we normalize them here.
 *
 * Supported fragment shapes (single location.hash):
 * - #/update-password?access_token=...&refresh_token=...
 * - #/update-password&access_token=...&refresh_token=...
 * - #/update-password#access_token=...&refresh_token=...  (second # inside fragment)
 *
 * Query string on page (rare with hash apps but supported):
 * - ?token_hash=...&type=recovery
 *
 * PWA: index.html copies params to sessionStorage before SW (EVENLY_AUTH_PENDING_KEY).
 */

export const EVENLY_AUTH_PENDING_KEY = 'evenly:auth:pending';

function parseKeyValueSegments(qs) {
  /** @type {Record<string, string>} */
  const out = {};
  if (!qs) return out;
  for (const seg of qs.split(/[?&]/)) {
    if (!seg || !seg.includes('=')) continue;
    const eq = seg.indexOf('=');
    const key = decodeURIComponent(seg.slice(0, eq).replace(/\+/g, ' '));
    const val = decodeURIComponent(seg.slice(eq + 1).replace(/\+/g, ' '));
    if (key) out[key] = val;
  }
  return out;
}

/**
 * Parse location.hash (with leading #) for auth params.
 */
export function parseHashForAuth(fullHash) {
  const raw = fullHash.startsWith('#') ? fullHash.slice(1) : fullHash;
  /** @type {Record<string, string>} */
  const out = {};
  if (!raw) return out;

  const secondHash = raw.indexOf('#');
  if (secondHash >= 0) {
    Object.assign(out, parseKeyValueSegments(raw.slice(0, secondHash)));
    Object.assign(out, parseKeyValueSegments(raw.slice(secondHash + 1)));
    return out;
  }
  return parseKeyValueSegments(raw);
}

function parseSearchParams() {
  if (typeof window === 'undefined') return {};
  const out = {};
  new URLSearchParams(window.location.search).forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

export function extractAuthParamsFromWindow() {
  if (typeof window === 'undefined') return {};
  return { ...parseSearchParams(), ...parseHashForAuth(window.location.hash || '') };
}

function cleanUrlToRoute(routeHash) {
  if (typeof window === 'undefined') return;
  const route = routeHash.startsWith('#') ? routeHash : `#${routeHash}`;
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${route}`);
}

/**
 * Establish session from URL or sessionStorage. Returns true on success.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ targetRoute?: string }} [opts]
 */
export async function applySupabaseAuthFromUrl(supabase, opts = {}) {
  if (typeof window === 'undefined' || !supabase) return false;

  const targetRoute = opts.targetRoute ?? '#/update-password';
  let params = extractAuthParamsFromWindow();

  if (
    !params.access_token &&
    !params.refresh_token &&
    !params.code &&
    !params.token_hash
  ) {
    try {
      const raw = sessionStorage.getItem(EVENLY_AUTH_PENDING_KEY);
      if (raw) params = { ...params, ...JSON.parse(raw) };
    } catch {
      /* ignore */
    }
  }

  const { access_token, refresh_token, code, token_hash, type } = params;
  let applied = false;

  try {
    if (token_hash) {
      const allowed = new Set(['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email']);
      const otpType = type && allowed.has(type) ? type : 'recovery';
      const { error } = await supabase.auth.verifyOtp({ type: otpType, token_hash });
      if (error) {
        console.error('Evenly: verifyOtp failed', error);
        return false;
      }
      applied = true;
    } else if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) {
        console.error('Evenly: setSession failed', error);
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
  } catch (e) {
    console.error('Evenly: auth callback error', e);
    return false;
  }

  if (!applied) return false;

  try {
    sessionStorage.removeItem(EVENLY_AUTH_PENDING_KEY);
  } catch {
    /* ignore */
  }
  cleanUrlToRoute(targetRoute);
  return true;
}
