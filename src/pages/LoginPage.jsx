import { useState, useEffect, useRef } from 'react';
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
import { isValidUsername, upsertMyProfile, checkUsernameAvailability } from '../lib/friendsApi.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const rawFrom = location.state?.from?.pathname || '/';
  const from = rawFrom === '/login' ? '/' : rawFrom;
  const { signIn, signUp, sendPasswordResetEmail, configured, user, loading: authLoading } =
    useAuth();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin');
  const [error, setError] = useState('');
  const [signupWarning, setSignupWarning] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  /** @type {'idle' | 'checking' | 'available' | 'taken' | 'error' | 'unknown'} */
  const [usernameStatus, setUsernameStatus] = useState('idle');
  const usernameDebounceRef = useRef(null);

  if (!configured) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="info">Sign-in isn’t available in this version.</Alert>
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

  useEffect(() => {
    if (mode !== 'signup' || forgotMode) {
      setUsernameStatus('idle');
      return undefined;
    }
    const u = username.trim();
    if (usernameDebounceRef.current) {
      clearTimeout(usernameDebounceRef.current);
      usernameDebounceRef.current = null;
    }
    if (!u) {
      setUsernameStatus('idle');
      return undefined;
    }
    if (!isValidUsername(u)) {
      setUsernameStatus('idle');
      return undefined;
    }
    setUsernameStatus('checking');
    usernameDebounceRef.current = window.setTimeout(async () => {
      usernameDebounceRef.current = null;
      try {
        const ok = await checkUsernameAvailability(u);
        if (ok === null) {
          setUsernameStatus('unknown');
          return;
        }
        setUsernameStatus(ok ? 'available' : 'taken');
      } catch {
        setUsernameStatus('error');
      }
    }, 400);
    return () => {
      if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current);
    };
  }, [username, mode, forgotMode]);

  useEffect(() => {
    if (mode !== 'signup' || forgotMode) setUsernameStatus('idle');
  }, [mode, forgotMode]);

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
        const u = username.trim();
        if (!isValidUsername(u)) {
          setError('Username: 3–30 letters, numbers, or underscores.');
          setBusy(false);
          return;
        }
        if (
          usernameStatus === 'taken' ||
          usernameStatus === 'checking' ||
          usernameStatus === 'error'
        ) {
          setError(
            usernameStatus === 'taken'
              ? 'That username is taken. Try another.'
              : usernameStatus === 'checking'
                ? 'Wait for the username check to finish.'
                : 'Couldn’t check username. Try again.',
          );
          setBusy(false);
          return;
        }
        const fn = firstName.trim();
        const ln = lastName.trim();
        if (!fn || !ln) {
          setError('Enter your first and last name.');
          setBusy(false);
          return;
        }
        const data = await signUp(email.trim(), password, {
          username: u,
          displayName: [fn, ln].filter(Boolean).join(' ') || u,
          firstName: fn || undefined,
          lastName: ln || undefined,
        });
        const outcome = classifySignUpResponse(data);
        if (outcome === 'logged_in') {
          try {
            await upsertMyProfile({
              username: u,
              firstName: fn || undefined,
              lastName: ln || undefined,
            });
          } catch {
            /* profile row may be created by trigger; ProfileSetup will prompt */
          }
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
        setError('We couldn’t send the email. Try again in a moment.');
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
          {forgotMode ? 'We’ll email you a link to choose a new password.' : 'Sign in to use Evenly.'}
        </Typography>

        {resetSent ? (
          <Alert severity="success" variant="outlined" sx={{ mb: 2 }}>
            If that email has an account, we sent a reset link. Check your inbox and spam.
          </Alert>
        ) : null}

        {successNotice ? (
          <Alert severity="success" variant="outlined" sx={{ mb: 2 }}>
            {successNotice}
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
          {mode === 'signup' && !forgotMode ? (
            <>
              <TextField
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                required
                autoComplete="username"
                error={usernameStatus === 'taken'}
                helperText={
                  !username.trim()
                    ? '3–30 characters: letters, numbers, underscores'
                    : !isValidUsername(username.trim())
                      ? 'Use 3–30 letters, numbers, or underscores.'
                      : usernameStatus === 'checking'
                        ? 'Checking…'
                        : usernameStatus === 'available'
                          ? 'Available'
                          : usernameStatus === 'taken'
                            ? 'Not available — try another'
                            : usernameStatus === 'error'
                              ? 'Couldn’t check — try again'
                              : '3–30 characters: letters, numbers, underscores'
                }
                FormHelperTextProps={{
                  sx: {
                    color:
                      usernameStatus === 'available'
                        ? 'success.main'
                        : usernameStatus === 'taken'
                          ? 'error.main'
                          : usernameStatus === 'unknown'
                            ? 'text.secondary'
                            : undefined,
                  },
                }}
                fullWidth
                sx={(theme) => muiTextFieldAutofillSx(theme)}
              />
              <TextField
                label="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoComplete="given-name"
                fullWidth
                sx={(theme) => muiTextFieldAutofillSx(theme)}
              />
              <TextField
                label="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                autoComplete="family-name"
                fullWidth
                sx={(theme) => muiTextFieldAutofillSx(theme)}
              />
            </>
          ) : null}
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
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={
              busy ||
              (mode === 'signup' &&
                !forgotMode &&
                isValidUsername(username.trim()) &&
                (usernameStatus === 'checking' ||
                  usernameStatus === 'taken' ||
                  usernameStatus === 'error'))
            }
          >
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
