import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const rawFrom = location.state?.from?.pathname || '/';
  const from = rawFrom === '/login' ? '/' : rawFrom;
  const { signIn, signUp, configured, user, loading: authLoading } = useAuth();

  if (configured && !authLoading && user) {
    return <Navigate to={from} replace />;
  }
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!configured) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="info">
          Cloud sign-in is not configured. Add <code>VITE_SUPABASE_URL</code> and{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> to your environment, then rebuild.
        </Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/')}>
          Back to groups
        </Button>
      </Container>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
        navigate(from, { replace: true });
      } else {
        const data = await signUp(email.trim(), password);
        if (!data?.session) {
          setMode('signin');
          setError(
            'Check your email to confirm your account, then sign in. (You can disable confirmation in Supabase → Authentication → Providers → Email.)',
          );
          return;
        }
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom fontWeight={700}>
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Sign in is required to use Evenly. Your groups sync across devices (email + password).
        </Typography>

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            fullWidth
          />
          <Button type="submit" variant="contained" size="large" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </Button>
        </Box>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Link
            component="button"
            type="button"
            variant="body2"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError('');
            }}
          >
            {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </Link>
        </Box>
      </Paper>
    </Container>
  );
}
