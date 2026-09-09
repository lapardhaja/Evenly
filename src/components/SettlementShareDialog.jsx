import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Snackbar from '@mui/material/Snackbar';
import LinkIcon from '@mui/icons-material/Link';
import IosShareIcon from '@mui/icons-material/IosShare';
import {
  buildSettlementSharePayload,
  encodeSettlementShareToken,
  settlementShareAbsoluteUrl,
} from '../lib/settlementShareLink.js';

import { copyFromInputElement, copyPlainText } from '../lib/copyPlainText.js';

export default function SettlementShareDialog({
  open,
  onClose,
  groupName,
  transfers,
  warnings = [],
  settleCurrencyCode = 'USD',
}) {
  const [note, setNote] = useState('');
  const [snack, setSnack] = useState({ open: false, message: '' });
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (open) setNote('');
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    const payload = buildSettlementSharePayload({
      groupName,
      note: note.trim(),
      transfers,
      warnings,
      settleCurrencyCode,
    });
    (async () => {
      try {
        const token = await encodeSettlementShareToken(payload);
        if (!cancelled) setShareUrl(settlementShareAbsoluteUrl(token));
      } catch {
        if (!cancelled) setShareUrl('');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [groupName, note, transfers, warnings, settleCurrencyCode]);

  const title = `${(groupName && String(groupName).trim()) || 'Group'} — Settle up`;

  const handleCopyLink = async () => {
    if (!shareUrl) {
      setSnack({ open: true, message: 'Couldn’t build the link. Try again.' });
      return;
    }
    const input = document.getElementById('evenly-settlement-share-url');
    let ok = copyFromInputElement(input);
    if (!ok) ok = await copyPlainText(shareUrl);
    if (!ok) {
      try {
        input?.focus?.();
        input?.select?.();
      } catch {
        /* ignore */
      }
    }
    setSnack({
      open: true,
      message: ok ? 'Link copied.' : 'Couldn’t copy. The link is selected — long-press and Copy.',
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
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
        <DialogTitle>Share Cost Evenly</DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          <Typography
            component="label"
            variant="subtitle2"
            htmlFor="settlement-share-note"
            sx={{ display: 'block', mb: 1, fontWeight: 600 }}
          >
            Note (optional)
          </Typography>
          <TextField
            id="settlement-share-note"
            hiddenLabel
            placeholder="Pay by Friday"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            inputProps={{ maxLength: 280 }}
            variant="outlined"
            sx={{ mb: 2 }}
          />
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Link
          </Typography>
          <TextField
            id="evenly-settlement-share-url"
            hiddenLabel
            fullWidth
            size="small"
            value={shareUrl || ''}
            multiline
            maxRows={4}
            onFocus={(e) => e.target.select()}
            inputProps={{ readOnly: true, 'aria-label': 'Shareable link' }}
            sx={{
              '& .MuiInputBase-input': {
                fontSize: '0.8rem',
                lineHeight: 1.45,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                WebkitUserSelect: 'all',
                userSelect: 'all',
              },
            }}
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
