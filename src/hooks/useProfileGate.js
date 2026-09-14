import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isSupabaseConfigured } from '../lib/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import { isPublicExemptRoute } from '../lib/appShell.js';

export function useProfileGate() {
  const { user, loading: authLoading, configured, profile, profileReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!configured || !isSupabaseConfigured() || authLoading || !user) return;
    if (!profileReady) return;
    if (isPublicExemptRoute(location.pathname)) return;
    if (location.pathname === '/profile-setup') return;
    if (profile && !profile.username) {
      navigate('/profile-setup', { replace: true, state: { from: location } });
    }
  }, [
    user,
    authLoading,
    configured,
    profile,
    profileReady,
    location.pathname,
    location,
    navigate,
  ]);

  return { profileCheckPending: Boolean(configured && user && !authLoading && !profileReady) };
}
