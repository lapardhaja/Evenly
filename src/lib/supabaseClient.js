import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let client = null;

if (url && anonKey) {
  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // We apply tokens manually (HashRouter + index.html bridge). Built-in URL parsing breaks on #/path?tokens.
      detectSessionInUrl: false,
      // Recovery email links use implicit tokens in the fragment; PKCE breaks when opening mail on another device.
      flowType: 'implicit',
    },
  });
}

export function getSupabase() {
  return client;
}

export function isSupabaseConfigured() {
  return !!client;
}
