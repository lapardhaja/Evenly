import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isSupabaseConfigured } from '../lib/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchMyProfile } from '../lib/friendsApi.js';
import { isPublicExemptRoute } from '../lib/appShell.js';

export function useProfileGate() {
  const { user, loading: authLoading, configured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!configured || !isSupabaseConfigured() || authLoading || !user) {
      setChecking(false);
      return undefined;
    }
    if (isPublicExemptRoute(location.pathname)) {
      setChecking(false);
      return undefined;
    }

    let cancelled = false;
    setChecking(true);
    (async () => {
      try {
        const p = await fetchMyProfile();
        if (cancelled) return;
        if (p && !p.username) {
          navigate('/profile-setup', { replace: true, state: { from: location } });
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, configured, location.pathname, navigate, location]);

  return { profileCheckPending: checking };
}
