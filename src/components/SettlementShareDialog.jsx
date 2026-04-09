import { useMemo, useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Snackbar from '@mui/material/Snackbar';
import LinkIcon from '@mui/icons-material/Link';
import IosShareIcon from '@mui/icons-material/IosShare';
import {
  buildSettlementSharePayload,
  encodeSettlementShareToken,
  settlementShareAbsoluteUrl,
} from '../lib/settlementShareLink.js';

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

export default function SettlementShareDialog({
  open,
  onClose,
  groupName,
  transfers,
  warnings = [],
}) {
  const [note, setNote] = useState('');
  const [snack, setSnack] = useState({ open: false, message: '' });

  useEffect(() => {
    if (open) setNote('');
  }, [open]);

  const shareUrl = useMemo(() => {
    const payload = buildSettlementSharePayload({
      groupName,
      note: note.trim(),
      transfers,
      warnings,
    });
    try {
      const token = encodeSettlementShareToken(payload);
      return settlementShareAbsoluteUrl(token);
    } catch {
      return '';
    }
  }, [groupName, note, transfers, warnings]);

  const title = `${(groupName && String(groupName).trim()) || 'Group'} — Settle up`;

  const handleCopyLink = async () => {
    if (!shareUrl) {
      setSnack({ open: true, message: 'Couldn’t build the link. Try again.' });
      return;
    }
    const ok = await copyPlainText(shareUrl);
    setSnack({
      open: true,
      message: ok ? 'Link copied.' : 'Couldn’t copy. Select the link and copy it.',
    });
  };

  const handleShare = async () => {
    if (!shareUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: note.trim() ? `${note.trim()}\n\n` : '',
          url: shareUrl,
        });
        return;
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return;
    }
    await handleCopyLink();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>Share Cost Evenly</DialogTitle>
        <DialogContent>
          <TextField
            label="Note (optional)"
            placeholder="Pay by Friday"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            inputProps={{ maxLength: 280 }}
            sx={{ mb: 2 }}
          />
          <TextField
            value={shareUrl}
            fullWidth
            multiline
            minRows={2}
            InputProps={{ readOnly: true }}
            size="small"
            sx={{ '& textarea': { fontSize: '0.8rem', wordBreak: 'break-all' } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={onClose}>Close</Button>
          <Button startIcon={<LinkIcon />} variant="outlined" onClick={handleCopyLink}>
            Copy
          </Button>
          <Button startIcon={<IosShareIcon />} variant="contained" onClick={handleShare}>
            Share
          </Button>
        </DialogActions>
      </Dialog>
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
