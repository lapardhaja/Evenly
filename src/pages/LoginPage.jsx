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
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import { useAuth } from '../context/AuthContext.jsx';
import BrandLogo from '../components/BrandLogo.jsx';
import { muiTextFieldAutofillSx } from '../lib/muiAutofillSx.js';
import {
  classifySignUpResponse,
  formatSignInError,
  formatSignUpError,
} from '../lib/supabaseAuthErrors.js';
import {
  isValidUsername,
  upsertMyProfile,
  checkUsernameAvailability,
  checkEmailAvailability,
  isValidEmailFormat,
  resolveSignInEmail,
} from '../lib/friendsApi.js';
import { getRememberedLoginId, setRememberedLoginId } from '../lib/loginDevicePrefs.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const rawFrom = location.state?.from?.pathname || '/';
  const from = rawFrom === '/login' ? '/' : rawFrom;
  const { signIn, signUp, sendPasswordResetEmail, configured, user, loading: authLoading } =
    useAuth();

  const [email, setEmail] = useState(() =>
    typeof window !== 'undefined' ? getRememberedLoginId() : '',
  );
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
  /** @type {'idle' | 'checking' | 'available' | 'taken' | 'error' | 'unknown'} */
  const [emailStatus, setEmailStatus] = useState('idle');
  const emailDebounceRef = useRef(null);
  const [rememberMe, setRememberMe] = useState(true);

  if (!configured) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="info">Sign-in isn’t set up here.</Alert>
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
      setSuccessNotice('Password updated. Sign in.');
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
      setEmailStatus('idle');
      return undefined;
    }
    const em = email.trim().toLowerCase();
    if (emailDebounceRef.current) {
      clearTimeout(emailDebounceRef.current);
      emailDebounceRef.current = null;
    }
    if (!em) {
      setEmailStatus('idle');
      return undefined;
    }
    if (!isValidEmailFormat(em)) {
      setEmailStatus('idle');
      return undefined;
    }
    setEmailStatus('checking');
    emailDebounceRef.current = window.setTimeout(async () => {
      emailDebounceRef.current = null;
      try {
        const ok = await checkEmailAvailability(em);
        if (ok === null) setEmailStatus('unknown');
        else setEmailStatus(ok ? 'available' : 'taken');
      } catch {
        setEmailStatus('error');
      }
    }, 400);
    return () => {
      if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current);
    };
  }, [email, mode, forgotMode]);

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
    if (mode !== 'signup' || forgotMode) {
      setUsernameStatus('idle');
      setEmailStatus('idle');
    }
  }, [mode, forgotMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    setBusy(true);
    try {
      if (forgotMode) {
        const resetEmail = await resolveSignInEmail(email);
        await sendPasswordResetEmail(resetEmail);
        setResetSent(true);
        return;
      }
      if (mode === 'signin') {
        const signInEmail = await resolveSignInEmail(email);
        await signIn(signInEmail, password);
        if (rememberMe) {
          setRememberedLoginId(email.trim());
        } else {
          setRememberedLoginId('');
        }
        navigate(from, { replace: true });
      } else {
        const em = email.trim().toLowerCase();
        if (!isValidEmailFormat(em)) {
          setError('Check the email address.');
          setBusy(false);
          return;
        }
        if (
          emailStatus === 'taken' ||
          emailStatus === 'checking' ||
          emailStatus === 'error'
        ) {
          setError(
            emailStatus === 'taken'
              ? 'That email is already in use. Sign in.'
              : emailStatus === 'checking'
                ? 'Still checking…'
                : 'Couldn’t check. Try again.',
          );
          setBusy(false);
          return;
        }
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
                ? 'Still checking…'
                : 'Couldn’t check. Try again.',
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
        const data = await signUp(em, password, {
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
          setSignupWarning('That email is already in use. Sign in or use a different email.');
          return;
        }
        setMode('signin');
        setSuccessNotice('We emailed you a link. Open it, then sign in.');
      }
    } catch (err) {
      if (forgotMode) {
        if (err?.code === 'USERNAME_NOT_FOUND') {
          setError('No account found.');
        } else {
          setError('We couldn’t send the email. Try again in a moment.');
        }
      } else if (mode === 'signin') {
        if (err?.code === 'USERNAME_NOT_FOUND') {
          setError('No account found.');
        } else if (err?.code === 'EMPTY_IDENTIFIER') {
          setError('Enter your email or username.');
        } else {
          setError(formatSignInError(err));
        }
      } else if (mode === 'signup') {
        const { message, isEmailTaken } = formatSignUpError(err);
        if (isEmailTaken) {
          setSignupWarning(message);
        } else {
          setError(message);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <BrandLogo
            stacked
            iconSize={60}
            gap={1.35}
            sx={{ color: 'primary.main' }}
            textSx={{
              fontSize: { xs: '2.35rem', sm: '2.85rem' },
              fontWeight: 700,
              letterSpacing: '-0.04em',
            }}
          />
        </Box>
        <Typography variant="h5" gutterBottom fontWeight={700}>
          {forgotMode ? 'Reset password' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {forgotMode
            ? 'Enter the email or username for your account.'
            : mode === 'signin'
              ? 'Email or username, then password.'
              : 'Create your account.'}
        </Typography>

        {resetSent ? (
          <Alert severity="success" variant="outlined" sx={{ mb: 2 }}>
            If we found an account, we sent a reset link. Check your email.
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
            label={
              mode === 'signup' && !forgotMode
                ? 'Email'
                : 'Email or username'
            }
            type={mode === 'signup' && !forgotMode ? 'email' : 'text'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete={mode === 'signup' && !forgotMode ? 'email' : 'username'}
            error={mode === 'signup' && !forgotMode && emailStatus === 'taken'}
            helperText={
              mode === 'signup' && !forgotMode
                ? !email.trim()
                  ? 'We’ll email a confirmation link'
                  : !isValidEmailFormat(email.trim())
                    ? 'Use a real email address'
                    : emailStatus === 'checking'
                      ? 'Checking…'
                      : emailStatus === 'available'
                        ? 'Available'
                        : emailStatus === 'taken'
                          ? 'In use — sign in instead'
                          : emailStatus === 'error'
                            ? 'Couldn’t check. Try again.'
                            : 'We’ll email a confirmation link'
                : mode === 'signin' && !forgotMode
                  ? 'Email or username'
                  : forgotMode
                    ? 'Email or username'
                    : undefined
            }
            FormHelperTextProps={{
              sx: {
                color:
                  mode === 'signup' && !forgotMode && emailStatus === 'available'
                    ? 'success.main'
                    : mode === 'signup' && !forgotMode && emailStatus === 'taken'
                      ? 'error.main'
                      : undefined,
              },
            }}
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
                            ? 'Taken — try another'
                            : usernameStatus === 'error'
                              ? 'Couldn’t check. Try again.'
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
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
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
          {mode === 'signin' && !forgotMode ? (
            <>
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                fullWidth
                sx={(theme) => muiTextFieldAutofillSx(theme)}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    size="small"
                  />
                }
                label="Remember me"
              />
            </>
          ) : null}
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={
              busy ||
              (mode === 'signup' &&
                !forgotMode &&
                ((isValidEmailFormat(email.trim()) &&
                  (emailStatus === 'checking' ||
                    emailStatus === 'taken' ||
                    emailStatus === 'error')) ||
                  (isValidUsername(username.trim()) &&
                    (usernameStatus === 'checking' ||
                      usernameStatus === 'taken' ||
                      usernameStatus === 'error'))))
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
                const r = getRememberedLoginId();
                if (r) setEmail(r);
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
                const nextSignin = mode !== 'signin';
                clearMessages();
                if (nextSignin) {
                  const r = getRememberedLoginId();
                  if (r) setEmail(r);
                }
                setMode(mode === 'signin' ? 'signup' : 'signin');
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
