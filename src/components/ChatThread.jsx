import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import SendIcon from '@mui/icons-material/Send';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { useAuth } from '../context/AuthContext.jsx';
import { formatFullName, getProfilesByIds } from '../lib/friendsApi.js';
import {
  listMessages,
  sendTextMessage,
  sendImageMessage,
  signedChatImageUrl,
  listMessageLikes,
  likeMessage,
  unlikeMessage,
  subscribeToMessageLikes,
  markConversationRead,
  markPaymentPaid,
  cancelPaymentRequest,
  subscribeToConversationMessages,
  notifyChatUnreadChanged,
} from '../lib/chatApi.js';
import { clipMessageBody, MESSAGE_BODY_MAX, parsePaymentPayload } from '../lib/chatPayment.js';
import {
  applyLikeRealtime,
  isImageMessage,
  parseImagePayload,
  summarizeLikes,
  toggleLikeState,
} from '../lib/chatMedia.js';
import { emitOpenChatConversation, requestChatNotificationPermission } from '../lib/chatAlerts.js';
import PaymentMessageCard from './PaymentMessageCard.jsx';
import AttachmentLightbox from './AttachmentLightbox.jsx';
import { nameToInitials } from '../functions/utils.js';
import Avatar from '@mui/material/Avatar';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { chatComposerBarSx, chatMessagesSx, chatThreadRootSx, chatBubbleMaxWidthSx } from '../lib/appShell.js';
import { isChatNearBottom, pinChatToLatestAfterLayout } from '../lib/chatScroll.js';

const DOUBLE_TAP_MS = 300;

function profileLabel(profile, fallback) {
  if (!profile) return fallback;
  return formatFullName(profile) || profile.username || profile.display_name || fallback;
}

function senderIdsFromMessages(rows) {
  const ids = [];
  for (const row of rows) {
    if (row.sender_id) ids.push(row.sender_id);
    const p = parsePaymentPayload(row.payload);
    if (p?.from_user_id) ids.push(p.from_user_id);
    if (p?.to_user_id) ids.push(p.to_user_id);
  }
  return [...new Set(ids)];
}

export default function ChatThread({
  conversationId,
  groupName,
  nameByUserId = {},
  onPaymentSettled,
  minHeight = 360,
}) {
  const { user } = useAuth();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [messages, setMessages] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [likes, setLikes] = useState(() => new Map());
  const [imageUrls, setImageUrls] = useState({});
  const [lightbox, setLightbox] = useState(null);
  const [heartBurstId, setHeartBurstId] = useState('');
  const listRef = useRef(null);
  const nearBottomRef = useRef(true);
  const pinnedForConversationRef = useRef(null);
  const fileInputRef = useRef(null);
  const urlCacheRef = useRef(new Map());
  const lastTapRef = useRef({ id: '', t: 0 });
  const messageIdsRef = useRef(new Set());
  const burstTimerRef = useRef(0);

  const ensureImageUrls = useCallback(async (rows) => {
    const updates = {};
    for (const row of rows || []) {
      if (!isImageMessage(row)) continue;
      const path = parseImagePayload(row.payload)?.storage_path;
      if (!path || urlCacheRef.current.has(path)) continue;
      try {
        const url = await signedChatImageUrl(path);
        if (!url) continue;
        urlCacheRef.current.set(path, url);
        updates[path] = url;
      } catch {
        /* signed URL can fail if the object is gone; bubble stays empty */
      }
    }
    if (Object.keys(updates).length) {
      setImageUrls((prev) => ({ ...prev, ...updates }));
    }
  }, []);

  const load = useCallback(async () => {
    if (!conversationId) return;
    setError('');
    try {
      const rows = await listMessages(conversationId);
      setMessages(rows);
      messageIdsRef.current = new Set(rows.map((m) => m.id));
      const uniq = senderIdsFromMessages(rows);
      if (uniq.length) {
        const profs = await getProfilesByIds(uniq);
        const map = {};
        profs.forEach((pr) => {
          map[pr.user_id] = pr;
        });
        setProfiles(map);
      } else {
        setProfiles({});
      }
      const likeRows = await listMessageLikes(rows.map((m) => m.id));
      setLikes(summarizeLikes(likeRows, user?.id));
      await ensureImageUrls(rows);
      await markConversationRead(conversationId);
      notifyChatUnreadChanged();
    } catch (e) {
      setError(e?.message || 'Couldn’t load messages.');
    } finally {
      setLoading(false);
    }
  }, [conversationId, ensureImageUrls, user?.id]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    setLikes(new Map());
    setImageUrls({});
    setLightbox(null);
    setHeartBurstId('');
    urlCacheRef.current = new Map();
    messageIdsRef.current = new Set();
    nearBottomRef.current = true;
    pinnedForConversationRef.current = null;
    load();
  }, [load]);

  useEffect(() => {
    emitOpenChatConversation(conversationId || '');
    return () => emitOpenChatConversation('');
  }, [conversationId]);

  useEffect(() => {
    messageIdsRef.current = new Set(messages.map((m) => m.id));
  }, [messages]);

  useEffect(() => {
    if (!conversationId) return undefined;
    return subscribeToConversationMessages(conversationId, (payload) => {
      const row = payload.new;
      if (payload.eventType === 'INSERT' && row?.id) {
        setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        messageIdsRef.current.add(row.id);
        if (isImageMessage(row)) void ensureImageUrls([row]);
      } else if (payload.eventType === 'UPDATE' && row?.id) {
        setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...m, ...row } : m)));
        const p = parsePaymentPayload(row.payload);
        if (p?.status === 'paid' && p.transfer_key && p.group_id) {
          onPaymentSettled?.({ groupId: p.group_id, transferKey: p.transfer_key });
        }
      }
      markConversationRead(conversationId).then(() => notifyChatUnreadChanged()).catch(() => {});
    });
  }, [conversationId, onPaymentSettled, ensureImageUrls]);

  useEffect(() => {
    if (!conversationId) return undefined;
    return subscribeToMessageLikes((payload) => {
      setLikes((prev) => applyLikeRealtime(prev, payload, user?.id, messageIdsRef.current));
    }, `evenly-message-likes:${conversationId}`);
  }, [conversationId, user?.id]);

  useEffect(() => () => {
    if (burstTimerRef.current) window.clearTimeout(burstTimerRef.current);
  }, []);

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

  const showHeartBurst = (messageId) => {
    setHeartBurstId(messageId);
    if (burstTimerRef.current) window.clearTimeout(burstTimerRef.current);
    burstTimerRef.current = window.setTimeout(() => setHeartBurstId(''), 700);
  };

  const setLiked = async (messageId, liked) => {
    if (!user?.id) return;
    setLikes((prev) => toggleLikeState(prev, messageId, user.id, liked));
    try {
      if (liked) await likeMessage(messageId);
      else await unlikeMessage(messageId);
    } catch (err) {
      setLikes((prev) => toggleLikeState(prev, messageId, user.id, !liked));
      setError(err?.message || 'Couldn’t update like.');
    }
  };

  const likeFromDoubleTap = (messageId) => {
    showHeartBurst(messageId);
    if (likes.get(messageId)?.mine) return;
    void setLiked(messageId, true);
  };

  const handleBubblePointer = (message, onSingle) => (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const now = Date.now();
    const last = lastTapRef.current;
    if (last.id === message.id && now - last.t < DOUBLE_TAP_MS) {
      lastTapRef.current = { id: '', t: 0 };
      e.preventDefault();
      likeFromDoubleTap(message.id);
      return;
    }
    lastTapRef.current = { id: message.id, t: now };
    if (!onSingle) return;
    window.setTimeout(() => {
      if (lastTapRef.current.id === message.id && lastTapRef.current.t === now) {
        onSingle();
      }
    }, DOUBLE_TAP_MS);
  };

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

  const handlePickImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || sending) return;
    setSending(true);
    setError('');
    try {
      const row = await sendImageMessage(conversationId, file);
      setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
      await ensureImageUrls([row]);
    } catch (err) {
      setError(err?.message || 'Couldn’t send photo.');
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
            No messages yet. Say hi, send a photo, or send a Venmo request from Settle.
          </Typography>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === user?.id;
            const label = names[m.sender_id] || 'Someone';
            const like = likes.get(m.id) || { count: 0, mine: false };
            const image = isImageMessage(m) ? parseImagePayload(m.payload) : null;
            const imageUrl = image
              ? imageUrls[image.storage_path] || urlCacheRef.current.get(image.storage_path) || ''
              : '';
            const openPhoto = imageUrl
              ? () => setLightbox({ url: imageUrl, mimeType: image.mime_type, fileName: 'Photo' })
              : null;
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
                  <Avatar
                    sx={{
                      width: { xs: 28, md: 36 },
                      height: { xs: 28, md: 36 },
                      fontSize: { xs: '0.7rem', md: '0.85rem' },
                      bgcolor: 'primary.main',
                    }}
                  >
                    {nameToInitials(label)}
                  </Avatar>
                ) : null}
                <Box sx={chatBubbleMaxWidthSx}>
                  {!mine ? (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                      {label}
                    </Typography>
                  ) : null}
                  <Box
                    sx={{
                      position: 'relative',
                      '@keyframes evenlyHeartPop': {
                        '0%': { transform: 'translate(-50%, -50%) scale(0.35)', opacity: 0 },
                        '35%': { transform: 'translate(-50%, -50%) scale(1.2)', opacity: 1 },
                        '100%': { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 },
                      },
                    }}
                  >
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
                    ) : image ? (
                      <Box
                        onPointerUp={handleBubblePointer(m, openPhoto)}
                        sx={{
                          borderRadius: 2,
                          overflow: 'hidden',
                          bgcolor: mine ? 'primary.main' : 'action.hover',
                          cursor: imageUrl ? 'pointer' : 'default',
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                        }}
                      >
                        {imageUrl ? (
                          <Box
                            component="img"
                            src={imageUrl}
                            alt="Photo"
                            draggable={false}
                            sx={{
                              display: 'block',
                              width: '100%',
                              maxHeight: { xs: 280, md: 400 },
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
                            <CircularProgress size={22} />
                          </Box>
                        )}
                      </Box>
                    ) : (
                      <Box
                        onPointerUp={handleBubblePointer(m)}
                        sx={{
                          px: { xs: 1.5, md: 2 },
                          py: { xs: 1, md: 1.25 },
                          borderRadius: 2,
                          bgcolor: mine ? 'primary.main' : 'action.hover',
                          color: mine ? 'primary.contrastText' : 'text.primary',
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            fontSize: { xs: '0.875rem', md: '1rem' },
                            lineHeight: 1.45,
                          }}
                        >
                          {m.body}
                        </Typography>
                      </Box>
                    )}
                    {heartBurstId === m.id ? (
                      <FavoriteIcon
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          fontSize: 56,
                          color: 'error.main',
                          pointerEvents: 'none',
                          animation: 'evenlyHeartPop 0.7s ease forwards',
                          filter: 'drop-shadow(0 1px 6px rgba(0,0,0,0.35))',
                        }}
                      />
                    ) : null}
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: mine ? 'flex-end' : 'flex-start',
                      mt: 0.15,
                    }}
                  >
                    <IconButton
                      size="small"
                      aria-label={like.mine ? 'Unlike' : 'Like'}
                      onClick={() => setLiked(m.id, !like.mine)}
                      sx={{ p: 0.5 }}
                    >
                      {like.mine ? (
                        <FavoriteIcon fontSize="small" sx={{ color: 'error.main' }} />
                      ) : (
                        <FavoriteBorderIcon fontSize="small" />
                      )}
                    </IconButton>
                    {like.count > 0 ? (
                      <Typography variant="caption" color="text.secondary">
                        {like.count}
                      </Typography>
                    ) : null}
                  </Box>
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
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={handlePickImage}
        />
        <IconButton
          type="button"
          color="primary"
          disabled={sending}
          aria-label="Send photo"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageOutlinedIcon />
        </IconButton>
        <TextField
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MESSAGE_BODY_MAX))}
          onFocus={() => requestChatNotificationPermission()}
          placeholder="Message"
          fullWidth
          size={desktop ? 'medium' : 'small'}
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
      <AttachmentLightbox
        open={Boolean(lightbox)}
        onClose={() => setLightbox(null)}
        url={lightbox?.url || ''}
        mimeType={lightbox?.mimeType || ''}
        fileName={lightbox?.fileName || 'Photo'}
      />
    </Box>
  );
}
