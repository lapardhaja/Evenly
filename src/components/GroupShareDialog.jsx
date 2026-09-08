import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Snackbar from '@mui/material/Snackbar';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import LinkIcon from '@mui/icons-material/Link';
import {
  createPublicGroupShare,
  listActivePublicGroupShares,
  publicShareAbsoluteUrl,
  revokePublicGroupShare,
} from '../lib/publicGroupShare.js';
import { useConfirmDialog } from './useConfirmDialog.jsx';
import SettlementShareDialog from './SettlementShareDialog.jsx';

async function copyPlainText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export default function GroupShareDialog({
  open,
  onClose,
  groupId,
  groupName,
  transfers,
  warnings = [],
  settleCurrencyCode = 'USD',
}) {
  const { ask, confirmDialog } = useConfirmDialog();
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState({ open: false, message: '' });
  const [legacyOpen, setLegacyOpen] = useState(false);

  const loadShares = useCallback(async () => {
    if (!groupId) {
      setShares([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const rows = await listActivePublicGroupShares(groupId);
      setShares(rows);
    } catch (err) {
      setError(err?.message || 'Couldn’t load share links.');
      setShares([]);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (!open) {
      setLegacyOpen(false);
      return undefined;
    }
    setIncludeAttachments(true);
    setError('');
    loadShares();
    return undefined;
  }, [open, loadShares]);

  const handleCreate = async () => {
    if (!groupId || busy) return;
    setBusy(true);
    setError('');
    try {
      await createPublicGroupShare(groupId, includeAttachments);
      await loadShares();
      setSnack({ open: true, message: 'Share link created.' });
    } catch (err) {
      setError(err?.message || 'Couldn’t create share.');
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async (shareId) => {
    const url = publicShareAbsoluteUrl(shareId);
    if (!url) {
      setSnack({ open: true, message: 'Couldn’t build the link. Try again.' });
      return;
    }
    const ok = await copyPlainText(url);
    setSnack({
      open: true,
      message: ok ? 'Link copied.' : 'Couldn’t copy. Select the link and copy it.',
    });
  };

  const handleRevoke = async (shareId) => {
    const ok = await ask({
      title: 'Revoke this link?',
      message: 'Anyone who has it will no longer see receipts or attachments.',
      confirmText: 'Revoke',
      destructive: true,
    });
    if (!ok || busy) return;
    setBusy(true);
    setError('');
    try {
      await revokePublicGroupShare(shareId);
      await loadShares();
      setSnack({ open: true, message: 'Share link revoked.' });
    } catch (err) {
      setError(err?.message || 'Couldn’t revoke share.');
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    if (busy) return;
    setLegacyOpen(false);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" scroll="paper">
        <DialogTitle>Share group</DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            {includeAttachments
              ? 'Anyone with this link can view receipts and attachments.'
              : 'Anyone with this link can view receipts and settlement. Attachments stay private.'}
          </Alert>
          <FormControlLabel
            sx={{ mb: 2, ml: 0 }}
            control={
              <Switch
                checked={includeAttachments}
                onChange={(e) => setIncludeAttachments(e.target.checked)}
                color="primary"
              />
            }
            label="Include attachments"
          />
          {error ? (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          ) : null}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            shares.map((row) => {
              const url = publicShareAbsoluteUrl(row.id);
              return (
                <Box key={row.id} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    {row.include_attachments ? 'Link (receipts + attachments)' : 'Link (receipts only)'}
                  </Typography>
                  <Box
                    role="region"
                    aria-label="Shareable link"
                    sx={{
                      maxHeight: 100,
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      p: 1.5,
                      mb: 1,
                      borderRadius: 1,
                      bgcolor: 'action.hover',
                      border: '1px solid',
                      borderColor: 'divider',
                      fontSize: '0.8rem',
                      lineHeight: 1.45,
                      wordBreak: 'break-all',
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    }}
                  >
                    {url || '—'}
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={<LinkIcon />}
                      variant="outlined"
                      onClick={() => handleCopy(row.id)}
                    >
                      Copy link
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      disabled={busy}
                      onClick={() => handleRevoke(row.id)}
                    >
                      Revoke
                    </Button>
                  </Box>
                </Box>
              );
            })
          )}
          <Button
            variant="contained"
            disabled={busy || loading || !groupId}
            onClick={handleCreate}
            sx={{ mt: shares.length ? 1 : 0 }}
          >
            {shares.length ? 'Create another link' : 'Create link'}
          </Button>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 3, mb: 1 }}>
            Need a summary without receipts? Use a settlement-only link that stays on this
            device (works offline).
          </Typography>
          <Button variant="text" onClick={() => setLegacyOpen(true)}>
            Settlement-only link (offline)
          </Button>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={busy}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
      {confirmDialog}
      <SettlementShareDialog
        open={legacyOpen}
        onClose={() => setLegacyOpen(false)}
        groupName={groupName}
        transfers={transfers}
        warnings={warnings}
        settleCurrencyCode={settleCurrencyCode}
      />
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        message={snack.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
}
