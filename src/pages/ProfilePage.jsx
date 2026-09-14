import { useState, useEffect, useCallback, useRef } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import PeopleIcon from '@mui/icons-material/People';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { fetchMyProfile, upsertMyProfile, isValidUsername, checkUsernameAvailability, listFriends } from '../lib/friendsApi.js';
import { isValidVenmoUsername, normalizeVenmoUsername, openVenmoProfile } from '../lib/venmoLinks.js';
import { chatAlertsEnableHint, enableChatNotifications } from '../lib/chatAlerts.js';
import {
  DELETE_ACCOUNT_CONFIRM,
  canSubmitAccountDeletion,
  requestAccountDeletion,
} from '../lib/deleteAccount.js';
import { purgeCloudUserBrowserState } from '../lib/evenlyStorageKey.js';
import InviteQrDialog from '../components/InviteQrDialog.jsx';

export default function ProfilePage() {
  const { user, session, refreshProfile, configured, signOut } = useAuth();
  const navigate = useNavigate();
  const [usernameEdit, setUsernameEdit] = useState('');
  const [firstNameEdit, setFirstNameEdit] = useState('');
  const [lastNameEdit, setLastNameEdit] = useState('');
  const [venmoEdit, setVenmoEdit] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  /** @type {'idle' | 'checking' | 'available' | 'taken' | 'error' | 'unknown'} */
  const [usernameStatus, setUsernameStatus] = useState('idle');
  const usernameDebounceRef = useRef(null);
  const savedUsernameRef = useRef('');
  const [notifyHint, setNotifyHint] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTyped, setDeleteTyped] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [friendCount, setFriendCount] = useState(null);

  const loadProfile = useCallback(async (opts = {}) => {
    const silent = !!opts.silent;
    if (!silent) setLoading(true);
    setError('');
    try {
      const p = await fetchMyProfile();
      const un = p?.username ? String(p.username) : '';
      savedUsernameRef.current = un;
      setUsernameEdit(un);
      setFirstNameEdit(p?.first_name || '');
      setLastNameEdit(p?.last_name || '');
      setVenmoEdit(p?.venmo_username || '');
      try {
        const fr = await listFriends();
        setFriendCount(fr.length);
      } catch {
        setFriendCount(null);
      }
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

  useEffect(() => {
    const u = usernameEdit.trim();
    const saved = savedUsernameRef.current.trim();
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
    if (saved && u.toLowerCase() === saved.toLowerCase()) {
      setUsernameStatus('available');
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
  }, [usernameEdit]);

  const handleSaveProfile = async () => {
    if (!isValidUsername(usernameEdit.trim())) {
      setError('Username: 3–30 letters, numbers, or underscores.');
      return;
    }
    const fn = firstNameEdit.trim();
    const ln = lastNameEdit.trim();
    if (!fn || !ln) {
      setError('Enter your first and last name.');
      return;
    }
    const venmo = normalizeVenmoUsername(venmoEdit);
    if (venmo && !isValidVenmoUsername(venmo)) {
      setError('Venmo username: 3–30 letters, numbers, underscores, or hyphens.');
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
    setError('');
    setMessage('');
    try {
      await upsertMyProfile({
        username: usernameEdit.trim(),
        firstName: fn,
        lastName: ln,
        venmoUsername: venmo,
      });
      setMessage('Profile saved.');
      const p = (await refreshProfile()) || (await fetchMyProfile());
      const un = p?.username ? String(p.username) : '';
      savedUsernameRef.current = un;
      setUsernameEdit(un);
      setFirstNameEdit(p?.first_name || '');
      setLastNameEdit(p?.last_name || '');
      setVenmoEdit(p?.venmo_username || '');
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
      {configured ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          How you show up when friends search for you.
        </Typography>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Local-only build — no cloud username yet.
        </Typography>
      )}

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

      {configured ? (
        <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
          <ListItemButton onClick={() => navigate('/friends')}>
            <ListItemIcon>
              <PeopleIcon />
            </ListItemIcon>
            <ListItemText
              primary="Friends"
              secondary={
                friendCount == null
                  ? 'Requests, remove, QR'
                  : friendCount === 1
                    ? '1 friend'
                    : `${friendCount} friends`
              }
            />
            <ChevronRightIcon color="action" />
          </ListItemButton>
        </Paper>
      ) : null}

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        {!configured ? (
          <Typography color="text.secondary">
            This install is local-only. Username, Venmo, friends, and sign-out show up here on a
            cloud Evenly account.
          </Typography>
        ) : loading ? (
          <Typography color="text.secondary">Loading…</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <TextField
              size="small"
              label="Username"
              value={usernameEdit}
              onChange={(e) => setUsernameEdit(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              placeholder="username"
              error={usernameStatus === 'taken'}
              helperText={
                !usernameEdit.trim()
                  ? '3–30 characters: letters, numbers, underscores'
                  : !isValidUsername(usernameEdit.trim())
                    ? 'Use 3–30 letters, numbers, or underscores.'
                    : usernameStatus === 'checking'
                      ? 'Checking…'
                      : usernameStatus === 'available'
                        ? 'Available'
                        : usernameStatus === 'taken'
                          ? 'Not available — try another'
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
                        : undefined,
                },
              }}
              fullWidth
            />
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <TextField
                size="small"
                label="First name"
                value={firstNameEdit}
                onChange={(e) => setFirstNameEdit(e.target.value)}
                required
                autoComplete="given-name"
                sx={{ flex: 1, minWidth: 140 }}
              />
              <TextField
                size="small"
                label="Last name"
                value={lastNameEdit}
                onChange={(e) => setLastNameEdit(e.target.value)}
                required
                autoComplete="family-name"
                sx={{ flex: 1, minWidth: 140 }}
              />
            </Box>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Evenly can’t send Venmo payments. Save a username so people can pay you from Settle.
            </Alert>
            <TextField
              size="small"
              label="Venmo username"
              value={venmoEdit}
              onChange={(e) => setVenmoEdit(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
              placeholder="your-venmo"
              helperText="Venmo app → Me → the name under your photo, without @. Not your Evenly username."
              fullWidth
            />
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                onClick={async () => {
                  const result = await enableChatNotifications();
                  const hint = chatAlertsEnableHint(result);
                  if (result.permission === 'denied' || result.permission === 'unsupported') {
                    setError(hint);
                    setNotifyHint('');
                  } else {
                    setNotifyHint(hint);
                    setError('');
                  }
                }}
              >
                Enable message alerts
              </Button>
              <Button
                variant="outlined"
                disabled={!isValidVenmoUsername(venmoEdit)}
                onClick={() => {
                  const url = openVenmoProfile(venmoEdit);
                  if (!url) {
                    setError('Enter a Venmo username first.');
                    return;
                  }
                  setMessage('If that’s your Venmo profile, tap Save. If not, fix the username.');
                }}
              >
                Check in Venmo
              </Button>
              {configured ? (
                <Button variant="outlined" onClick={() => setQrOpen(true)}>
                  My friend QR
                </Button>
              ) : null}
              <Button
                variant="outlined"
                onClick={handleSaveProfile}
                disabled={
                  busy ||
                  (isValidUsername(usernameEdit.trim()) &&
                    (usernameStatus === 'checking' ||
                      usernameStatus === 'taken' ||
                      usernameStatus === 'error'))
                }
              >
                Save
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Signed in as {user?.email || '…'}
            </Typography>
            {configured ? (
              <Button
                color="inherit"
                onClick={() => {
                  signOut();
                  navigate('/login', { replace: true });
                }}
                sx={{ alignSelf: 'flex-start' }}
              >
                Sign out
              </Button>
            ) : null}
            {notifyHint ? (
              <Typography variant="caption" color="text.secondary">
                {notifyHint}
              </Typography>
            ) : (
              <Typography variant="caption" color="text.secondary">
                iPhone: Share → Add to Home Screen, open from the icon, then Enable. A Safari tab
                cannot send lock-screen banners.
              </Typography>
            )}
          </Box>
        )}
      </Paper>

      {configured ? (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mt: 2, borderColor: 'error.light' }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
            Delete account
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Permanently deletes your login, profile, chats, and groups you own. Groups you only
            joined keep your display name as a guest. This cannot be undone.
          </Typography>
          <Button
            color="error"
            variant="outlined"
            onClick={() => {
              setDeleteTyped('');
              setDeleteOpen(true);
            }}
          >
            Delete my account
          </Button>
        </Paper>
      ) : null}

      <InviteQrDialog
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        kind="friend"
        title="Your friend QR"
      />

      <Dialog
        open={deleteOpen}
        onClose={() => !deleteBusy && setDeleteOpen(false)}
        aria-labelledby="delete-account-title"
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle id="delete-account-title">Delete your Evenly account?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            Signed in as {user?.email || '…'}. Type <strong>{DELETE_ACCOUNT_CONFIRM}</strong> to
            confirm. Groups you own (and their receipts/attachments) are removed. Chat photos you
            sent are removed.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label={`Type ${DELETE_ACCOUNT_CONFIRM}`}
            value={deleteTyped}
            onChange={(e) => setDeleteTyped(e.target.value)}
            disabled={deleteBusy}
            autoComplete="off"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleteBusy}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleteBusy || !canSubmitAccountDeletion(deleteTyped)}
            onClick={async () => {
              setDeleteBusy(true);
              setError('');
              try {
                await requestAccountDeletion({
                  accessToken: session?.access_token,
                  confirm: deleteTyped,
                });
                purgeCloudUserBrowserState(user?.id);
                window.location.replace(
                  `${window.location.pathname}${window.location.search}#/login`,
                );
              } catch (e) {
                setError(e?.message || 'Could not delete account.');
                setDeleteBusy(false);
                setDeleteOpen(false);
              }
            }}
          >
            {deleteBusy ? 'Deleting…' : 'Delete account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
