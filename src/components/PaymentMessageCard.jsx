import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { parsePaymentPayload, venmoNoteForTransfer } from '../lib/chatPayment.js';
import { formatMoneyWithCode } from '../lib/currencies.js';
import { isValidVenmoUsername, openVenmoPayment, venmoWebPayUrl } from '../lib/venmoLinks.js';
import { copyPlainText } from '../lib/copyPlainText.js';
import { paymentCardActions } from '../lib/settleRowActions.js';

export default function PaymentMessageCard({
  message,
  currentUserId,
  fromName,
  toName,
  groupName,
  onMarkPaid,
  onCancel,
  busy = false,
}) {
  const [copied, setCopied] = useState(false);
  const [copyHint, setCopyHint] = useState('');
  const payload = parsePaymentPayload(message?.payload);
  if (!payload) {
    return (
      <Typography variant="body2" color="text.secondary">
        Payment
      </Typography>
    );
  }

  const money = formatMoneyWithCode(payload.amount, payload.currency);
  const status = payload.status;
  const isParty =
    currentUserId &&
    (currentUserId === payload.from_user_id || currentUserId === payload.to_user_id);
  const isDebtor = currentUserId && currentUserId === payload.from_user_id;
  const isSender = currentUserId && currentUserId === message.sender_id;
  const cardActions = paymentCardActions({ isParty, isDebtor, status });
  const canVenmo = cardActions.pay && isValidVenmoUsername(payload.venmo_username);
  const usdOnly = payload.currency === 'USD';

  const handleVenmo = () => {
    openVenmoPayment({
      username: payload.venmo_username,
      amount: payload.amount,
      note: venmoNoteForTransfer({ groupName, fromName, toName }),
    });
  };

  const handleCopyVenmo = async () => {
    const url = venmoWebPayUrl({
      username: payload.venmo_username,
      amount: payload.amount,
      note: venmoNoteForTransfer({ groupName, fromName, toName }),
    });
    if (!url) {
      setCopied(false);
      setCopyHint('No Venmo link — they still need a username on Profile.');
      return;
    }
    const ok = await copyPlainText(url);
    setCopied(ok);
    setCopyHint(ok ? 'Copied. Paste in Safari or Messages if Venmo didn’t open.' : url);
  };

  return (
    <Box
      sx={{
        minWidth: { xs: 220, md: 280 },
        maxWidth: { xs: 320, md: 420, lg: 480 },
        p: 1.25,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="caption" color="text.secondary" fontWeight={700}>
        Payment request
      </Typography>
      <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
        {fromName} → {toName}
      </Typography>
      <Typography variant="h6" fontWeight={800} sx={{ my: 0.5 }}>
        {money}
      </Typography>
      <Chip
        size="small"
        label={status === 'paid' ? 'Paid' : status === 'canceled' ? 'Canceled' : 'Requested'}
        color={status === 'paid' ? 'success' : status === 'canceled' ? 'default' : 'warning'}
        sx={{ mb: 1 }}
      />
      {status === 'requested' && isParty ? (
        <Stack spacing={0.75}>
          {canVenmo ? (
            <>
              <Button size="small" variant="contained" onClick={handleVenmo} disabled={busy}>
                Pay on Venmo
              </Button>
              <Button size="small" variant="text" onClick={handleCopyVenmo} disabled={busy}>
                {copied ? 'Copied' : 'Copy Venmo link'}
              </Button>
              {copyHint ? (
                <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                  {copyHint}
                </Typography>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Opens Venmo with the amount. Send it there, then tap I paid.
                </Typography>
              )}
            </>
          ) : isDebtor && !isValidVenmoUsername(payload.venmo_username) ? (
            <Typography variant="caption" color="text.secondary">
              {toName} hasn’t added a Venmo username. Copy {money} and pay them another way.
            </Typography>
          ) : null}
          {!usdOnly && canVenmo ? (
            <Typography variant="caption" color="text.secondary">
              Venmo is USD. Confirm the amount in Venmo.
            </Typography>
          ) : null}
          {cardActions.markPaid ? (
            <Button size="small" variant="outlined" onClick={() => onMarkPaid?.(message)} disabled={busy}>
              I paid
            </Button>
          ) : null}
          {isSender ? (
            <Button
              size="small"
              color="inherit"
              onClick={() => onCancel?.(message)}
              disabled={busy}
            >
              Cancel
            </Button>
          ) : null}
        </Stack>
      ) : null}
    </Box>
  );
}
