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
      detectSessionInUrl: true,
      // Recovery links use implicit tokens in the URL fragment; PKCE would require a stored code_verifier
      // that is missing when the user opens the email on another device.
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
