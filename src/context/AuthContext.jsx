import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabaseClient.js';
import { applySupabaseAuthFromUrl } from '../lib/supabaseAuthCallback.js';
import { fetchMyProfile } from '../lib/friendsApi.js';
import { sessionAfterAuthEvent } from '../lib/authSession.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const client = getSupabase();
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(!!client);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!client) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    const { data: sub } = client.auth.onAuthStateChange((event, incoming) => {
      if (cancelled) return;
      setSession((prev) => sessionAfterAuthEvent(event, incoming, prev));
    });

    (async () => {
      try {
        await applySupabaseAuthFromUrl(client);
      } catch {
        /* ignore */
      }
      try {
        const {
          data: { session: s },
        } = await client.auth.getSession();
        if (!cancelled && s) setSession(s);
      } catch {
        /* ignore */
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [client]);

  useEffect(() => {
    if (!client || !session?.user?.id) {
      setProfile(null);
      return undefined;
    }
    let cancelled = false;
    fetchMyProfile()
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      });
    return () => {
      cancelled = true;
    };
  }, [client, session?.user?.id]);

  const refreshProfile = useCallback(async () => {
    if (!client || !session?.user?.id) {
      setProfile(null);
      return null;
    }
    try {
      const p = await fetchMyProfile();
      setProfile(p);
      return p;
    } catch {
      return null;
    }
  }, [client, session?.user?.id]);

  const signIn = useCallback(
    async (email, password) => {
      if (!client) throw new Error('Supabase is not configured');
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    [client],
  );

  const signUp = useCallback(
    async (email, password, meta = {}) => {
      if (!client) throw new Error('Supabase is not configured');
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: meta.username,
            display_name:
              meta.displayName ||
              [meta.firstName, meta.lastName].filter(Boolean).join(' ').trim() ||
              meta.username,
            first_name: meta.firstName,
            last_name: meta.lastName,
          },
        },
      });
      if (error) throw error;
      return data;
    },
    [client],
  );

  const signOut = useCallback(async () => {
    if (!client) return;
    await client.auth.signOut();
  }, [client]);

  /** @see https://supabase.com/docs/guides/auth/passwords#resetting-a-password */
  const sendPasswordResetEmail = useCallback(
    async (email) => {
      if (!client) throw new Error('Supabase is not configured');
      const redirectTo = `${window.location.origin}${window.location.pathname}#/update-password`;
      const { error } = await client.auth.resetPasswordForEmail(String(email).trim(), {
        redirectTo,
      });
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
      profile,
      refreshProfile,
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
      profile,
      refreshProfile,
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
