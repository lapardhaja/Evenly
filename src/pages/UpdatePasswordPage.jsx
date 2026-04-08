import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
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
import { getSupabase, isSupabaseConfigured } from '../lib/supabaseClient.js';
import { applySupabaseAuthFromUrl } from '../lib/supabaseAuthCallback.js';

export default function UpdatePasswordPage() {
  const navigate = useNavigate();
  const { configured, updatePassword, loading: authLoading } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [verifyDone, setVerifyDone] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return undefined;

    const client = getSupabase();
    if (!client) return undefined;

    const mark = (session) => {
      if (session) setHasSession(true);
    };

    const { data: sub } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        mark(session);
      }
    });

    (async () => {
      await applySupabaseAuthFromUrl(client);
      const { data } = await client.auth.getSession();
      mark(data.session);
      await new Promise((r) => {
        window.setTimeout(r, 500);
      });
      const { data: d2 } = await client.auth.getSession();
      mark(d2.session);
      setVerifyDone(true);
    })();

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setVerifyDone(true), 3500);
    return () => window.clearTimeout(t);
  }, []);

  if (!configured) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      await getSupabase()?.auth.signOut();
      navigate('/login', { replace: true, state: { passwordResetOk: true } });
    } catch (err) {
      setError(err?.message || 'Could not update password.');
    } finally {
      setBusy(false);
    }
  };

  const showWait = !hasSession && !verifyDone;
  const showError = verifyDone && !hasSession && !authLoading;

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom fontWeight={700}>
          Set a new password
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Choose a new password for your account. If this page does not load the form, open the reset link in
          Safari or Chrome (not only inside the email app) and request a fresh link if it expired.
        </Typography>

        {showError ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            We couldn’t verify your reset link. Request a new one from <strong>Sign in → Forgot password?</strong>
          </Alert>
        ) : null}

        {showWait ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Verifying your link…
          </Typography>
        ) : null}

        {hasSession ? (
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {error ? (
              <Alert severity="error" sx={{ mb: 0 }}>
                {error}
              </Alert>
            ) : null}
            <TextField
              label="New password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              fullWidth
              sx={(theme) => muiTextFieldAutofillSx(theme)}
            />
            <TextField
              label="Confirm new password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              fullWidth
              sx={(theme) => muiTextFieldAutofillSx(theme)}
            />
            <Button type="submit" variant="contained" size="large" disabled={busy}>
              {busy ? 'Saving…' : 'Update password'}
            </Button>
          </Box>
        ) : null}

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Link component="button" type="button" variant="body2" onClick={() => navigate('/login')}>
            Back to sign in
          </Link>
        </Box>
      </Paper>
    </Container>
  );
}
