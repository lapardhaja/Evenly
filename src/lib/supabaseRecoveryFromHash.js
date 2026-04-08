/**
 * HashRouter uses URLs like:  #/reset-password?access_token=...&refresh_token=...&type=recovery
 * @supabase/auth-js parses `location.hash.slice(1)` as a single query string, which breaks because
 * the fragment starts with a path, not key=value pairs.
 * Extract the real query string after `?` and establish the session.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<boolean>} true if tokens were found and session was applied
 */
export async function applySupabaseSessionFromHash(supabase) {
  if (typeof window === 'undefined' || !supabase) return false;

  const fullHash = window.location.hash;
  const q = fullHash.indexOf('?');
  if (q < 0) return false;

  const queryString = fullHash.slice(q + 1);
  const params = new URLSearchParams(queryString);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');

  if (!access_token || !refresh_token) return false;

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) {
    console.error('Evenly: could not apply session from URL hash', error);
    return false;
  }

  // Strip tokens from the address bar; keep the route (e.g. #/reset-password)
  const routeOnly = fullHash.slice(0, q);
  const newUrl = `${window.location.pathname}${window.location.search}${routeOnly}`;
  window.history.replaceState(window.history.state, '', newUrl);

  return true;
}
