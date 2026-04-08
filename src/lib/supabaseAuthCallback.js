/**
 * Supabase email links (signup confirm, password recovery) redirect back with auth params.
 * With HashRouter, tokens often land in the hash as:
 *   #/update-password?access_token=...&refresh_token=...
 *   #/update-password&access_token=...&refresh_token=...
 * Or the email template may use token_hash (see Supabase "Reset password" docs).
 *
 * PWA: index.html stashes params in sessionStorage before the SW runs (see EVENLY_AUTH_PENDING_KEY).
 */

export const EVENLY_AUTH_PENDING_KEY = 'evenly:auth:pending';

function parseQueryLikeSegments(qs) {
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
 * GoTrue sometimes redirects to: #/update-password#access_token=...&refresh_token=...
 * (second # inside the single location.hash). Parse route ?query and the trailing #fragment.
 */
export function parseHashForAuth(fullHash) {
  const raw = fullHash.startsWith('#') ? fullHash.slice(1) : fullHash;
  /** @type {Record<string, string>} */
  const out = {};
  if (!raw) return out;

  const secondHash = raw.indexOf('#');
  if (secondHash >= 0) {
    const routeAndMaybeQuery = raw.slice(0, secondHash);
    const afterSecondHash = raw.slice(secondHash + 1);
    Object.assign(out, parseQueryLikeSegments(routeAndMaybeQuery));
    Object.assign(out, parseQueryLikeSegments(afterSecondHash));
    return out;
  }

  return parseQueryLikeSegments(raw);
}

function parseSearchParams() {
  if (typeof window === 'undefined') return {};
  const out = {};
  new URLSearchParams(window.location.search).forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

/**
 * @returns {Record<string, string>}
 */
export function extractAuthParamsFromWindow() {
  if (typeof window === 'undefined') return {};
  const fromHash = parseHashForAuth(window.location.hash || '');
  const fromSearch = parseSearchParams();
  return { ...fromSearch, ...fromHash };
}

function stripSensitiveParamsFromUrl(targetRouteHash) {
  if (typeof window === 'undefined') return;
  const route = targetRouteHash.startsWith('#') ? targetRouteHash : `#${targetRouteHash}`;
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${route}`);
}

/**
 * Apply auth from URL or sessionStorage (after index.html bridge). Returns true if a session was created/updated.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ targetRoute?: string }} [opts] — hash to leave after success (default '#/update-password')
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

  const {
    access_token,
    refresh_token,
    code,
    token_hash,
    type,
  } = params;

  let applied = false;

  try {
    if (token_hash) {
      const allowed = new Set(['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email']);
      const otpType = type && allowed.has(type) ? type : 'recovery';
      const { error } = await supabase.auth.verifyOtp({
        type: otpType,
        token_hash,
      });
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

  stripSensitiveParamsFromUrl(targetRoute);
  return true;
}
