import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabaseClient.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const client = getSupabase();
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(!!client);

  useEffect(() => {
    if (!client) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    client.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        if (!cancelled) {
          setSession(s);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    const { data: sub } = client.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [client]);

  const signIn = useCallback(
    async (email, password) => {
      if (!client) throw new Error('Supabase is not configured');
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    [client],
  );

  const signUp = useCallback(
    async (email, password) => {
      if (!client) throw new Error('Supabase is not configured');
      const { data, error } = await client.auth.signUp({ email, password });
      if (error) throw error;
      return data;
    },
    [client],
  );

  const signOut = useCallback(async () => {
    if (!client) return;
    await client.auth.signOut();
  }, [client]);

  /** Sends password reset email; user must add this redirect URL in Supabase → Auth → URL Configuration. */
  const sendPasswordResetEmail = useCallback(
    async (email) => {
      if (!client) throw new Error('Supabase is not configured');
      const redirectTo = `${window.location.origin}${window.location.pathname}#/reset-password`;
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) throw error;
    },
    [client],
  );

  const updatePassword = useCallback(
    async (newPassword) => {
      if (!client) throw new Error('Supabase is not configured');
      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    [client],
  );

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      signIn,
      signUp,
      signOut,
      sendPasswordResetEmail,
      updatePassword,
      configured,
    }),
    [
      session,
      loading,
      signIn,
      signUp,
      signOut,
      sendPasswordResetEmail,
      updatePassword,
      configured,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
