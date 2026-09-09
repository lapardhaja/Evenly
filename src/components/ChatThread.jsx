import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import SendIcon from '@mui/icons-material/Send';
import { useAuth } from '../context/AuthContext.jsx';
import { formatFullName, getProfilesByIds } from '../lib/friendsApi.js';
import {
  listMessages,
  sendTextMessage,
  markConversationRead,
  markPaymentPaid,
  cancelPaymentRequest,
  subscribeToConversationMessages,
  notifyChatUnreadChanged,
} from '../lib/chatApi.js';
import { clipMessageBody, MESSAGE_BODY_MAX, parsePaymentPayload } from '../lib/chatPayment.js';
import PaymentMessageCard from './PaymentMessageCard.jsx';
import { nameToInitials } from '../functions/utils.js';
import Avatar from '@mui/material/Avatar';
import { chatComposerBarSx, chatMessagesSx, chatThreadRootSx } from '../lib/appShell.js';
import { isChatNearBottom, pinChatToLatestAfterLayout } from '../lib/chatScroll.js';

function profileLabel(profile, fallback) {
  if (!profile) return fallback;
  return formatFullName(profile) || profile.username || profile.display_name || fallback;
}

export default function ChatThread({
  conversationId,
  groupName,
  nameByUserId = {},
  onPaymentSettled,
  minHeight = 360,
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);
  const nearBottomRef = useRef(true);
  const pinnedForConversationRef = useRef(null);

  const load = useCallback(async () => {
    if (!conversationId) return;
    setError('');
    try {
      const rows = await listMessages(conversationId);
      setMessages(rows);
      const ids = [...new Set(rows.map((m) => m.sender_id).filter(Boolean))];
      for (const row of rows) {
        const p = parsePaymentPayload(row.payload);
        if (p?.from_user_id) ids.push(p.from_user_id);
        if (p?.to_user_id) ids.push(p.to_user_id);
      }
      const uniq = [...new Set(ids)];
      if (uniq.length) {
        const profs = await getProfilesByIds(uniq);
        const map = {};
        profs.forEach((pr) => {
          map[pr.user_id] = pr;
        });
        setProfiles(map);
      }
      await markConversationRead(conversationId);
      notifyChatUnreadChanged();
    } catch (e) {
      setError(e?.message || 'Couldn’t load messages.');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    nearBottomRef.current = true;
    pinnedForConversationRef.current = null;
    load();
  }, [load]);

  useEffect(() => {
    if (!conversationId) return undefined;
    return subscribeToConversationMessages(conversationId, (payload) => {
      const row = payload.new;
      if (payload.eventType === 'INSERT' && row?.id) {
        setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
      } else if (payload.eventType === 'UPDATE' && row?.id) {
        setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...m, ...row } : m)));
        const p = parsePaymentPayload(row.payload);
        if (p?.status === 'paid' && p.transfer_key && p.group_id) {
          onPaymentSettled?.({ groupId: p.group_id, transferKey: p.transfer_key });
        }
      }
      markConversationRead(conversationId).then(() => notifyChatUnreadChanged()).catch(() => {});
    });
  }, [conversationId, onPaymentSettled]);

  const lastMessageId = messages.length ? messages[messages.length - 1].id : '';

  useLayoutEffect(() => {
    if (loading) return undefined;
    const el = listRef.current;
    if (!el) return undefined;
    const opening = pinnedForConversationRef.current !== conversationId;
    const last = messages[messages.length - 1];
    const mine = last?.sender_id === user?.id;
    if (!opening && !mine && !nearBottomRef.current && !isChatNearBottom(el)) {
      return undefined;
    }
    const cancel = pinChatToLatestAfterLayout(el);
    pinnedForConversationRef.current = conversationId;
    nearBottomRef.current = true;
    return cancel;
  }, [loading, conversationId, lastMessageId, user?.id]);

  const names = useMemo(() => {
    const map = { ...nameByUserId };
    Object.entries(profiles).forEach(([id, pr]) => {
      if (!map[id]) map[id] = profileLabel(pr, 'Someone');
    });
    return map;
  }, [nameByUserId, profiles]);

  const handleSend = async (e) => {
    e?.preventDefault?.();
    const body = clipMessageBody(draft);
    if (!body || sending) return;
    setSending(true);
    setError('');
    try {
      const row = await sendTextMessage(conversationId, body);
      setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
      setDraft('');
    } catch (err) {
      setError(err?.message || 'Couldn’t send.');
    } finally {
      setSending(false);
    }
  };

  const handlePaid = async (message) => {
    setSending(true);
    setError('');
    try {
      const result = await markPaymentPaid(message.id);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id
            ? { ...m, payload: { ...(m.payload || {}), status: 'paid' } }
            : m,
        ),
      );
      if (result?.transfer_key && result?.group_id) {
        onPaymentSettled?.({ groupId: result.group_id, transferKey: result.transfer_key });
      }
    } catch (err) {
      setError(err?.message || 'Couldn’t mark paid.');
    } finally {
      setSending(false);
    }
  };

  const handleCancel = async (message) => {
    setSending(true);
    setError('');
    try {
      await cancelPaymentRequest(message.id);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id
            ? { ...m, payload: { ...(m.payload || {}), status: 'canceled' } }
            : m,
        ),
      );
    } catch (err) {
      setError(err?.message || 'Couldn’t cancel.');
    } finally {
      setSending(false);
    }
  };

  if (!conversationId) {
    return (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        No conversation.
      </Typography>
    );
  }

  return (
    <Box sx={{ ...chatThreadRootSx, minHeight: minHeight || 0 }}>
      {error ? (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError('')}>
          {error}
        </Alert>
      ) : null}
      <Box
        ref={listRef}
        id="evenly-chat-scroller"
        onScroll={() => {
          nearBottomRef.current = isChatNearBottom(listRef.current);
        }}
        sx={chatMessagesSx}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : messages.length === 0 ? (
          <Typography color="text.secondary" variant="body2" sx={{ py: 3, textAlign: 'center' }}>
            No messages yet. Say hi or send a Venmo request from Settle.
          </Typography>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === user?.id;
            const label = names[m.sender_id] || 'Someone';
            return (
              <Box
                key={m.id}
                sx={{
                  display: 'flex',
                  justifyContent: mine ? 'flex-end' : 'flex-start',
                  gap: 1,
                  mb: 1.25,
                  alignItems: 'flex-end',
                }}
              >
                {!mine ? (
                  <Avatar sx={{ width: 28, height: 28, fontSize: '0.7rem', bgcolor: 'primary.main' }}>
                    {nameToInitials(label)}
                  </Avatar>
                ) : null}
                <Box sx={{ maxWidth: '80%' }}>
                  {!mine ? (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                      {label}
                    </Typography>
                  ) : null}
                  {m.type === 'payment' ? (
                    <PaymentMessageCard
                      message={m}
                      currentUserId={user?.id}
                      fromName={names[parsePaymentPayload(m.payload)?.from_user_id] || 'Someone'}
                      toName={names[parsePaymentPayload(m.payload)?.to_user_id] || 'someone'}
                      groupName={groupName}
                      onMarkPaid={handlePaid}
                      onCancel={handleCancel}
                      busy={sending}
                    />
                  ) : (
                    <Box
                      sx={{
                        px: 1.5,
                        py: 1,
                        borderRadius: 2,
                        bgcolor: mine ? 'primary.main' : 'action.hover',
                        color: mine ? 'primary.contrastText' : 'text.primary',
                      }}
                    >
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {m.body}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            );
          })
        )}
      </Box>
      <Box
        component="form"
        onSubmit={handleSend}
        sx={{
          ...chatComposerBarSx,
          pb: 'max(8px, env(safe-area-inset-bottom, 0px), var(--evenly-vv-bottom, 0px), var(--evenly-cookie-banner-offset, 0px))',
        }}
      >
        <TextField
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MESSAGE_BODY_MAX))}
          placeholder="Message"
          fullWidth
          size="small"
          multiline
          maxRows={4}
        />
        <IconButton
          type="submit"
          color="primary"
          disabled={sending || !clipMessageBody(draft)}
          aria-label="Send"
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  );
}
