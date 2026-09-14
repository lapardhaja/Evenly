import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import { useGroupsData } from '../context/GroupsDataContext.jsx';
import { isSupabaseConfigured } from '../lib/supabaseClient.js';
import {
  addFriendByCode,
  friendlyInviteCodeError,
  joinGroupByCode,
  parseInvitePathname,
  peekInviteCode,
} from '../lib/inviteCodes.js';
import { notifyFriendRequestsChanged } from '../lib/friendsApi.js';

export default function InviteRedeemPage({ kind }) {
  const { token: rawToken } = useParams();
  const navigate = useNavigate();
  const { reloadFromServer } = useGroupsData();
  const [error, setError] = useState('');
  const [label, setLabel] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return undefined;
    ran.current = true;
    if (!isSupabaseConfigured()) {
      setError('QR invites need a signed-in cloud account.');
      return undefined;
    }
    const parsed = parseInvitePathname(`/${kind === 'friend' ? 'add' : 'join'}/${rawToken || ''}`);
    if (!parsed || parsed.kind !== kind) {
      setError('That QR or link isn’t valid. Ask them to show it again.');
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const peek = await peekInviteCode(parsed.token);
        if (cancelled) return;
        if (peek?.kind && peek.kind !== kind) {
          setError('That QR or link isn’t valid. Ask them to show it again.');
          return;
        }
        setLabel(peek?.name || '');
        if (kind === 'group') {
          const result = await joinGroupByCode(parsed.token);
          await reloadFromServer();
          if (cancelled) return;
          navigate(`/groups/${result.group_id}/receipts`, { replace: true });
          return;
        }
        if (peek?.self) {
          setError('That’s your own code.');
          return;
        }
        const result = await addFriendByCode(parsed.token);
        notifyFriendRequestsChanged();
        if (cancelled) return;
        const name = result?.name || peek?.name || 'them';
        navigate('/search', {
          replace: true,
          state: {
            notice: result?.already_friends
              ? `You’re already friends with ${name}.`
              : `You’re friends with ${name}.`,
          },
        });
      } catch (err) {
        if (!cancelled) setError(friendlyInviteCodeError(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, rawToken, navigate, reloadFromServer]);

  return (
    <Container maxWidth="sm" sx={{ py: 6, textAlign: 'center' }}>
      {error ? (
        <>
          <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>
            {error}
          </Alert>
          <Button variant="contained" onClick={() => navigate('/')}>
            Home
          </Button>
        </>
      ) : (
        <Box>
          <CircularProgress size={28} sx={{ mb: 2 }} />
          <Typography color="text.secondary">
            {kind === 'group'
              ? label
                ? `Joining ${label}…`
                : 'Joining group…'
              : label
                ? `Adding ${label}…`
                : 'Adding friend…'}
          </Typography>
        </Box>
      )}
    </Container>
  );
}
