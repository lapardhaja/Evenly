import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { useAuth } from '../context/AuthContext.jsx';
import {
  upsertMyProfile,
  isValidUsername,
  fetchMyProfile,
  checkUsernameAvailability,
} from '../lib/friendsApi.js';
import { muiTextFieldAutofillSx } from '../lib/muiAutofillSx.js';

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  /** @type {'idle' | 'checking' | 'available' | 'taken' | 'error' | 'unknown'} */
  const [usernameStatus, setUsernameStatus] = useState('idle');
  const usernameDebounceRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await fetchMyProfile();
        if (cancelled || !p) return;
        if (p.username) setUsername(String(p.username));
        if (p.first_name) setFirstName(p.first_name);
        if (p.last_name) setLastName(p.last_name);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
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
        if (ok === null) setUsernameStatus('unknown');
        else setUsernameStatus(ok ? 'available' : 'taken');
      } catch {
        setUsernameStatus('error');
      }
    }, 400);
    return () => {
      if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current);
    };
  }, [username]);

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const u = username.trim();
    if (!isValidUsername(u)) {
      setError('Username: 3–30 letters, numbers, or underscores.');
      return;
    }
    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!fn || !ln) {
      setError('Enter your first and last name.');
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
      return;
    }
    setBusy(true);
    try {
      await upsertMyProfile({
        username: u,
        firstName: fn,
        lastName: ln,
      });
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err?.message || '';
      if (/duplicate|unique|already exists/i.test(msg)) {
        setError('That username is taken. Try another.');
      } else {
        setError('Couldn’t save. Try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom fontWeight={700}>
          Set up your profile
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Pick a username and your name. You can edit these later in Profile.
        </Typography>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
            required
            autoComplete="username"
            placeholder="your_name"
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
          <Typography variant="caption" color="text.secondary">
            Signed in as {user?.email || '…'}
          </Typography>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={
              busy ||
              (isValidUsername(username.trim()) &&
                (usernameStatus === 'checking' ||
                  usernameStatus === 'taken' ||
                  usernameStatus === 'error'))
            }
          >
            {busy ? 'Saving…' : 'Continue'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
