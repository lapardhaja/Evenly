import { useState, useEffect } from 'react';
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
import { muiTextFieldAutofillSx } from '../lib/muiAutofillSx.js';
import {
  classifySignUpResponse,
  formatSignInError,
  formatSignUpError,
} from '../lib/supabaseAuthErrors.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const rawFrom = location.state?.from?.pathname || '/';
  const from = rawFrom === '/login' ? '/' : rawFrom;
  const { signIn, signUp, sendPasswordResetEmail, configured, user, loading: authLoading } =
    useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin');
  const [error, setError] = useState('');
  const [signupWarning, setSignupWarning] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

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

  if (!authLoading && user) {
    return <Navigate to={from} replace />;
  }

  useEffect(() => {
    if (location.state?.passwordResetOk) {
      setSuccessNotice('Your password was updated. Sign in with your new password.');
      navigate('/login', { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const clearMessages = () => {
    setError('');
    setSignupWarning('');
    setSuccessNotice('');
    setResetSent(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    setBusy(true);
    try {
      if (forgotMode) {
        await sendPasswordResetEmail(email.trim());
        setResetSent(true);
        return;
      }
      if (mode === 'signin') {
        await signIn(email.trim(), password);
        navigate(from, { replace: true });
      } else {
        const data = await signUp(email.trim(), password);
        const outcome = classifySignUpResponse(data);
        if (outcome === 'logged_in') {
          navigate(from, { replace: true });
          return;
        }
        if (outcome === 'likely_already_registered') {
          setSignupWarning(
            'That email already has an account. Try a different email, or switch to Sign in below.',
          );
          return;
        }
        setMode('signin');
        setSuccessNotice(
          'Almost there — we sent a confirmation link to your email. Open it, then sign in below.',
        );
      }
    } catch (err) {
      if (forgotMode) {
        setError(String(err?.message || 'Could not send reset email.'));
      } else if (mode === 'signup') {
        const { message, isEmailTaken } = formatSignUpError(err);
        if (isEmailTaken) {
          setSignupWarning(message);
        } else {
          setError(message);
        }
      } else {
        setError(formatSignInError(err));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom fontWeight={700}>
          {forgotMode ? 'Reset password' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {forgotMode
            ? 'Enter your email and we’ll send a link to set a new password.'
            : 'Sign in is required to use Evenly. Your groups sync across devices (email + password).'}
        </Typography>

        {resetSent ? (
          <Alert severity="success" variant="outlined" sx={{ mb: 2 }}>
            If an account exists for that email, you’ll get a reset link shortly. Check your inbox and spam folder.
          </Alert>
        ) : null}

        {successNotice ? (
          <Alert severity="success" variant="outlined" sx={{ mb: 2 }}>
            {successNotice}
            <Typography variant="caption" component="p" sx={{ mt: 1, display: 'block', opacity: 0.9 }}>
              Tip: In Supabase → Authentication → Providers → Email, you can turn off “Confirm email” for
              faster testing.
            </Typography>
          </Alert>
        ) : null}

        {signupWarning ? (
          <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
            {signupWarning}
          </Alert>
        ) : null}

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
            sx={(theme) => muiTextFieldAutofillSx(theme)}
          />
          {!forgotMode ? (
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              fullWidth
              sx={(theme) => muiTextFieldAutofillSx(theme)}
            />
          ) : null}
          <Button type="submit" variant="contained" size="large" disabled={busy}>
            {busy
              ? 'Please wait…'
              : forgotMode
                ? 'Send reset link'
                : mode === 'signin'
                  ? 'Sign in'
                  : 'Sign up'}
          </Button>
        </Box>

        <Box sx={{ mt: 2, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {mode === 'signin' && !forgotMode ? (
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={() => {
                setForgotMode(true);
                clearMessages();
              }}
            >
              Forgot password?
            </Link>
          ) : null}
          {forgotMode ? (
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={() => {
                setForgotMode(false);
                clearMessages();
              }}
            >
              Back to sign in
            </Link>
          ) : (
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                clearMessages();
              }}
            >
              {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
            </Link>
          )}
        </Box>
      </Paper>
    </Container>
  );
}
