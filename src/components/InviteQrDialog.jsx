import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { copyFromInputElement, copyPlainText } from '../lib/copyPlainText.js';
import {
  ensureFriendCode,
  ensureGroupJoinCode,
  inviteAbsoluteUrl,
  rotateGroupJoinCode,
} from '../lib/inviteCodes.js';
import { inviteQrDataUrl } from '../lib/inviteQr.js';

export default function InviteQrDialog({ open, onClose, kind, groupId, title }) {
  const fieldId = 'evenly-invite-url';
  const [url, setUrl] = useState('');
  const [qr, setQr] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token =
        kind === 'friend' ? await ensureFriendCode() : await ensureGroupJoinCode(groupId);
      const next = inviteAbsoluteUrl(kind === 'friend' ? 'friend' : 'group', token);
      setUrl(next);
      setQr(next ? await inviteQrDataUrl(next) : '');
    } catch (err) {
      setUrl('');
      setQr('');
      setError(err?.message || 'Couldn’t load that QR code.');
    } finally {
      setLoading(false);
    }
  }, [kind, groupId]);

  useEffect(() => {
    if (!open) return undefined;
    setSnack('');
    load();
    return undefined;
  }, [open, load]);

  const handleCopy = async () => {
    if (!url) return;
    const input = document.getElementById(fieldId);
    let ok = copyFromInputElement(input);
    if (!ok) ok = await copyPlainText(url);
    if (!ok) {
      try {
        if (navigator.share) {
          await navigator.share({ url, title: title || 'Evenly' });
          return;
        }
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }
    setSnack(ok ? 'Link copied.' : 'Couldn’t copy. The link is selected — long-press and Copy.');
  };

  const handleRotate = async () => {
    if (kind !== 'group' || !groupId || busy) return;
    setBusy(true);
    setError('');
    try {
      const token = await rotateGroupJoinCode(groupId);
      const next = inviteAbsoluteUrl('group', token);
      setUrl(next);
      setQr(next ? await inviteQrDataUrl(next) : '');
      setSnack('New code. The old QR no longer works.');
    } catch (err) {
      setError(err?.message || 'Couldn’t rotate that code.');
    } finally {
      setBusy(false);
    }
  };

  const isFriend = kind === 'friend';

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
        <DialogTitle>{title || (isFriend ? 'Your friend QR' : 'Group QR')}</DialogTitle>
        <DialogContent>
          {error ? (
            <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError('')}>
              {error}
            </Alert>
          ) : null}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {isFriend
              ? 'They scan this with Camera (or Evenly → Scan) and become friends. No request to accept.'
              : 'They scan this and join the group. They do not need to be friends first.'}
          </Typography>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : qr ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Box
                component="img"
                src={qr}
                alt="QR code"
                sx={{ width: 220, height: 220, bgcolor: '#fff', borderRadius: 1 }}
              />
            </Box>
          ) : null}
          <TextField
            id={fieldId}
            size="small"
            fullWidth
            value={url}
            onFocus={(e) => e.target.select()}
            InputProps={{ readOnly: true }}
            sx={{ mb: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Button component={RouterLink} to="/scan" onClick={onClose}>
            Scan
          </Button>
          {kind === 'group' ? (
            <Button onClick={handleRotate} disabled={busy || loading}>
              New code
            </Button>
          ) : null}
          <Box sx={{ flex: 1 }} />
          <Button onClick={onClose}>Close</Button>
          <Button variant="contained" onClick={handleCopy} disabled={!url}>
            Copy link
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={Boolean(snack)} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </>
  );
}
