import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { parsePaymentPayload, venmoNoteForTransfer } from '../lib/chatPayment.js';
import { formatMoneyWithCode } from '../lib/currencies.js';
import { isValidVenmoUsername, openVenmoPayment, venmoWebPayUrl } from '../lib/venmoLinks.js';

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
  const canVenmo =
    status === 'requested' && isDebtor && isValidVenmoUsername(payload.venmo_username);
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
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
  };

  return (
    <Box
      sx={{
        minWidth: 220,
        maxWidth: 320,
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
                Copy Venmo link
              </Button>
              <Typography variant="caption" color="text.secondary">
                Opens Venmo with the amount. Send it there, then tap I paid.
              </Typography>
            </>
          ) : isDebtor && !isValidVenmoUsername(payload.venmo_username) ? (
            <Typography variant="caption" color="text.secondary">
              {toName} hasn’t added a Venmo $cashtag. Copy {money} and pay them another way.
            </Typography>
          ) : null}
          {!usdOnly && canVenmo ? (
            <Typography variant="caption" color="text.secondary">
              Venmo is USD. Confirm the amount in Venmo.
            </Typography>
          ) : null}
          <Button size="small" variant="outlined" onClick={() => onMarkPaid?.(message)} disabled={busy}>
            I paid
          </Button>
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
