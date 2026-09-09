import { Navigate, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
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
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress aria-label="Checking sign-in" />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
