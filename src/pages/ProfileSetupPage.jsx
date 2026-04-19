import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { useAuth } from '../context/AuthContext.jsx';
import { upsertMyProfile, isValidUsername, fetchMyProfile } from '../lib/friendsApi.js';
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await fetchMyProfile();
        if (cancelled || !p) return;
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

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const u = username.trim();
    if (!isValidUsername(u)) {
      setError('Use 3–30 characters: letters, numbers, or underscores only.');
      return;
    }
    setBusy(true);
    try {
      await upsertMyProfile({
        username: u,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
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
          Choose a username and add your name. Friends can find you by username or email. You can edit this later in Friends.
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
            helperText="Letters, numbers, underscores only"
            fullWidth
            sx={(theme) => muiTextFieldAutofillSx(theme)}
          />
          <TextField
            label="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            fullWidth
            sx={(theme) => muiTextFieldAutofillSx(theme)}
          />
          <TextField
            label="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
            fullWidth
            sx={(theme) => muiTextFieldAutofillSx(theme)}
          />
          <Typography variant="caption" color="text.secondary">
            Signed in as {user?.email || '…'}
          </Typography>
          <Button type="submit" variant="contained" size="large" disabled={busy}>
            {busy ? 'Saving…' : 'Continue'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
