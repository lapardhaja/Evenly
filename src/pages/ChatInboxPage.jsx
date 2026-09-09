import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import { isSupabaseConfigured } from '../lib/supabaseClient.js';
import {
  listMyConversations,
  listDmCandidates,
  getOrCreateDm,
} from '../lib/chatApi.js';
import { formatFullName } from '../lib/friendsApi.js';
import { paymentPreviewText, parsePaymentPayload } from '../lib/chatPayment.js';
import { nameToInitials } from '../functions/utils.js';
import { enableChatNotifications } from '../lib/chatAlerts.js';
import { CHAT_CONTAINER_MAX_WIDTH } from '../lib/appShell.js';

function convoTitle(row) {
  if (row.kind === 'group') return row.group_name || 'Group';
  const p = row.other_profile;
  return formatFullName(p) || p?.username || p?.display_name || 'Direct message';
}

function convoPreview(row) {
  if (!row.last_at) return 'No messages yet';
  if (row.last_type === 'payment') {
    const p = parsePaymentPayload(row.last_payload);
    return paymentPreviewText(p || row.last_payload);
  }
  const body = typeof row.last_body === 'string' ? row.last_body.trim() : '';
  return body || 'Message';
}

export default function ChatInboxPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [filter, setFilter] = useState('');
  const [pickerBusy, setPickerBusy] = useState(false);
  const [notifyBanner, setNotifyBanner] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'default',
  );

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    try {
      const data = await listMyConversations();
      setRows(data);
    } catch (e) {
      setError(e?.message || 'Couldn’t load chats.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onPull = () => load();
    window.addEventListener('evenly-pull-to-refresh', onPull);
    return () => {
      window.removeEventListener('evenly-pull-to-refresh', onPull);
    };
  }, [load]);

  const openPicker = async () => {
    setPickerOpen(true);
    setFilter('');
    try {
      setCandidates(await listDmCandidates());
    } catch (e) {
      setError(e?.message || 'Couldn’t load people.');
    }
  };

  const startDm = async (userId) => {
    setPickerBusy(true);
    try {
      const id = await getOrCreateDm(userId);
      setPickerOpen(false);
      navigate(`/chat/${id}`);
    } catch (e) {
      setError(e?.message || 'Couldn’t open chat.');
    } finally {
      setPickerBusy(false);
    }
  };

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((p) => {
      const blob = `${p.username || ''} ${p.display_name || ''} ${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
      return blob.includes(q);
    });
  }, [candidates, filter]);

  if (!isSupabaseConfigured()) {
    return (
      <Container maxWidth={CHAT_CONTAINER_MAX_WIDTH} sx={{ py: 4 }}>
        <Typography color="text.secondary">Chat needs a signed-in cloud account.</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth={CHAT_CONTAINER_MAX_WIDTH} sx={{ py: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Chat
        </Typography>
        <Button variant="contained" size="small" onClick={openPicker}>
          New message
        </Button>
      </Box>
      {notifyBanner ? (
        <Alert
          severity="info"
          sx={{ mb: 2, borderRadius: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={async () => {
                const { permission } = await enableChatNotifications();
                setNotifyBanner(permission === 'default');
              }}
            >
              Enable
            </Button>
          }
        >
          Turn on alerts so you get a banner when someone texts.
        </Alert>
      ) : null}
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      ) : null}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <List disablePadding>
            {rows.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary" variant="body2">
                  No chats yet. Message a friend, or open Chat on a group.
                </Typography>
              </Box>
            ) : (
              rows.map((row) => (
                <ListItemButton
                  key={row.id}
                  onClick={() => navigate(`/chat/${row.id}`)}
                  sx={{ py: { xs: 1.5, md: 2 } }}
                >
                  <ListItemAvatar>
                    <Badge
                      color="primary"
                      variant="dot"
                      invisible={!row.unread_count}
                      overlap="circular"
                    >
                      <Avatar sx={{ bgcolor: row.kind === 'group' ? 'secondary.main' : 'primary.main' }}>
                        {nameToInitials(convoTitle(row))}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography fontWeight={row.unread_count ? 700 : 500} noWrap>
                          {convoTitle(row)}
                        </Typography>
                        {row.kind === 'group' ? <Chip size="small" label="Group" /> : null}
                      </Box>
                    }
                    secondary={convoPreview(row)}
                    secondaryTypographyProps={{ noWrap: true }}
                  />
                </ListItemButton>
              ))
            )}
          </List>
        </Paper>
      )}

      <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New message</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Search"
            fullWidth
            size="small"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <List>
            {filtered.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                No one to message yet. Add friends or share a group.
              </Typography>
            ) : (
              filtered.map((p) => (
                <ListItemButton
                  key={p.user_id}
                  disabled={pickerBusy}
                  onClick={() => startDm(p.user_id)}
                >
                  <ListItemAvatar>
                    <Avatar>{nameToInitials(formatFullName(p) || p.username || '?')}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={formatFullName(p) || p.display_name || p.username}
                    secondary={p.username ? `@${p.username}` : null}
                  />
                </ListItemButton>
              ))
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPickerOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
