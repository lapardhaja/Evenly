import { useState, useEffect, useCallback } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchMyProfile, upsertMyProfile, isValidUsername } from '../lib/friendsApi.js';

export default function ProfilePage() {
  const { user } = useAuth();
  const [usernameEdit, setUsernameEdit] = useState('');
  const [firstNameEdit, setFirstNameEdit] = useState('');
  const [lastNameEdit, setLastNameEdit] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadProfile = useCallback(async (opts = {}) => {
    const silent = !!opts.silent;
    if (!silent) setLoading(true);
    setError('');
    try {
      const p = await fetchMyProfile();
      setUsernameEdit(p?.username || '');
      setFirstNameEdit(p?.first_name || '');
      setLastNameEdit(p?.last_name || '');
    } catch {
      setError('Couldn’t load your profile. Try again in a moment.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    const onPull = () => loadProfile({ silent: true });
    window.addEventListener('evenly-pull-to-refresh', onPull);
    return () => window.removeEventListener('evenly-pull-to-refresh', onPull);
  }, [loadProfile]);

  const handleSaveProfile = async () => {
    if (!isValidUsername(usernameEdit.trim())) {
      setError('Username: 3–30 letters, numbers, or underscores.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await upsertMyProfile({
        username: usernameEdit.trim(),
        firstName: firstNameEdit.trim() || undefined,
        lastName: lastNameEdit.trim() || undefined,
      });
      setMessage('Profile saved.');
      const p = await fetchMyProfile();
      setUsernameEdit(p?.username || '');
      setFirstNameEdit(p?.first_name || '');
      setLastNameEdit(p?.last_name || '');
    } catch (e) {
      setError(e?.message?.includes('duplicate') ? 'That username is taken.' : 'Couldn’t save profile.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 4 } }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
        Profile
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        How you show up when friends search for you.
      </Typography>

      {message ? (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>
          {message}
        </Alert>
      ) : null}
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      ) : null}

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        {loading ? (
          <Typography color="text.secondary">Loading…</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <TextField
              size="small"
              label="Username"
              value={usernameEdit}
              onChange={(e) => setUsernameEdit(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              placeholder="username"
              helperText="3–30 characters: letters, numbers, underscores"
              fullWidth
            />
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <TextField
                size="small"
                label="First name"
                value={firstNameEdit}
                onChange={(e) => setFirstNameEdit(e.target.value)}
                autoComplete="given-name"
                sx={{ flex: 1, minWidth: 140 }}
              />
              <TextField
                size="small"
                label="Last name"
                value={lastNameEdit}
                onChange={(e) => setLastNameEdit(e.target.value)}
                autoComplete="family-name"
                sx={{ flex: 1, minWidth: 140 }}
              />
            </Box>
            <Box>
              <Button variant="outlined" onClick={handleSaveProfile} disabled={busy}>
                Save
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Signed in as {user?.email || '…'}
            </Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
}
