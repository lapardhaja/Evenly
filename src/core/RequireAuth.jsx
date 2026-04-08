import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * When Supabase is configured, only signed-in users may access wrapped routes.
 * When not configured, the app stays local-only (no gate).
 */
export default function RequireAuth({ children }) {
  const { configured, user, loading } = useAuth();
  const location = useLocation();

  if (!configured) {
    return children;
  }

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
