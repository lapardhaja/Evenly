import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { useAuth } from '../context/AuthContext.jsx';
import { formatFullName, getProfilesByIds } from '../lib/friendsApi.js';
import {
  listMessages,
  sendTextMessage,
  sendChatAttachment,
  sendAudioMessage,
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
import { clipMessageBody, parsePaymentPayload } from '../lib/chatPayment.js';
import {
  applyLikeRealtime,
  formatChatByteSize,
  isAudioMessage,
  isFileMessage,
  isImageMessage,
  parseAudioPayload,
  parseFilePayload,
  parseImagePayload,
  summarizeLikes,
  toggleLikeState,
} from '../lib/chatMedia.js';
import { emitOpenChatConversation } from '../lib/chatAlerts.js';
import PaymentMessageCard from './PaymentMessageCard.jsx';
import AttachmentLightbox from './AttachmentLightbox.jsx';
import ChatComposer from './ChatComposer.jsx';
import ChatAudioBubble from './ChatAudioBubble.jsx';
import { nameToInitials } from '../functions/utils.js';
import Avatar from '@mui/material/Avatar';
import { chatMessagesSx, chatThreadRootSx, chatBubbleMaxWidthSx } from '../lib/appShell.js';
import { isChatNearBottom, pinChatToLatestAfterLayout } from '../lib/chatScroll.js';
import {
  CHAT_AVATAR_GAP_PX,
  CHAT_AVATAR_PX,
  CHAT_NAME_GUTTER_PX,
  chatBubbleRadii,
  chatClusterMeta,
} from '../lib/chatLayout.js';

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
  minHeight = 0,
  preview = null,
}) {
  const { user } = useAuth();
  const previewMode = Boolean(preview);
  const myUserId = preview?.userId || user?.id;
  const [messages, setMessages] = useState(() => preview?.messages || []);
  const [profiles, setProfiles] = useState({});
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(!preview);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [likes, setLikes] = useState(() =>
    preview?.likes instanceof Map ? preview.likes : new Map(),
  );
  const [imageUrls, setImageUrls] = useState(() => preview?.imageUrls || {});
  const [lightbox, setLightbox] = useState(null);
  const [heartBurstId, setHeartBurstId] = useState('');
  const listRef = useRef(null);
  const nearBottomRef = useRef(true);
  const pinnedForConversationRef = useRef(null);
  const urlCacheRef = useRef(new Map());
  const lastTapRef = useRef({ id: '', t: 0 });
  const messageIdsRef = useRef(new Set());
  const burstTimerRef = useRef(0);

  const ensureImageUrls = useCallback(async (rows) => {
    const updates = {};
    for (const row of rows || []) {
      const path = isImageMessage(row)
        ? parseImagePayload(row.payload)?.storage_path
        : isFileMessage(row)
          ? parseFilePayload(row.payload)?.storage_path
          : isAudioMessage(row)
            ? parseAudioPayload(row.payload)?.storage_path
            : '';
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
      setLikes(summarizeLikes(likeRows, myUserId));
      await ensureImageUrls(rows);
      await markConversationRead(conversationId);
      notifyChatUnreadChanged();
    } catch (e) {
      setError(e?.message || 'Couldn’t load messages.');
    } finally {
      setLoading(false);
    }
  }, [conversationId, ensureImageUrls, myUserId]);

  useEffect(() => {
    if (previewMode) {
      setLoading(false);
      return undefined;
    }
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
    return undefined;
  }, [load, previewMode]);

  useEffect(() => {
    if (previewMode) return undefined;
    emitOpenChatConversation(conversationId || '');
    return () => emitOpenChatConversation('');
  }, [conversationId, previewMode]);

  useEffect(() => {
    messageIdsRef.current = new Set(messages.map((m) => m.id));
  }, [messages]);

  useEffect(() => {
    if (previewMode || !conversationId) return undefined;
    return subscribeToConversationMessages(conversationId, (payload) => {
      const row = payload.new;
      if (payload.eventType === 'INSERT' && row?.id) {
        setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        messageIdsRef.current.add(row.id);
        if (isImageMessage(row) || isFileMessage(row) || isAudioMessage(row)) void ensureImageUrls([row]);
      } else if (payload.eventType === 'UPDATE' && row?.id) {
        setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...m, ...row } : m)));
        const p = parsePaymentPayload(row.payload);
        if (p?.status === 'paid' && p.transfer_key && p.group_id) {
          onPaymentSettled?.({ groupId: p.group_id, transferKey: p.transfer_key });
        }
      }
      markConversationRead(conversationId).then(() => notifyChatUnreadChanged()).catch(() => {});
    });
  }, [conversationId, onPaymentSettled, ensureImageUrls, previewMode]);

  useEffect(() => {
    if (previewMode || !conversationId) return undefined;
    return subscribeToMessageLikes((payload) => {
      setLikes((prev) => applyLikeRealtime(prev, payload, myUserId, messageIdsRef.current));
    }, `evenly-message-likes:${conversationId}`);
  }, [conversationId, myUserId, previewMode]);

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
    const mine = last?.sender_id === myUserId;
    if (!opening && !mine && !nearBottomRef.current && !isChatNearBottom(el)) {
      return undefined;
    }
    const cancel = pinChatToLatestAfterLayout(el);
    pinnedForConversationRef.current = conversationId;
    nearBottomRef.current = true;
    return cancel;
  }, [loading, conversationId, lastMessageId, myUserId]);

  useEffect(() => {
    const onViewport = () => {
      const el = listRef.current;
      if (!el || !nearBottomRef.current) return;
      pinChatToLatestAfterLayout(el);
    };
    window.visualViewport?.addEventListener('resize', onViewport);
    window.visualViewport?.addEventListener('scroll', onViewport);
    window.addEventListener('resize', onViewport);
    return () => {
      window.visualViewport?.removeEventListener('resize', onViewport);
      window.visualViewport?.removeEventListener('scroll', onViewport);
      window.removeEventListener('resize', onViewport);
    };
  }, []);

  const names = useMemo(() => {
    const map = { ...(preview?.names || {}), ...nameByUserId };
    Object.entries(profiles).forEach(([id, pr]) => {
      if (!map[id]) map[id] = profileLabel(pr, 'Someone');
    });
    return map;
  }, [nameByUserId, profiles, preview]);

  const showHeartBurst = (messageId) => {
    setHeartBurstId(messageId);
    if (burstTimerRef.current) window.clearTimeout(burstTimerRef.current);
    burstTimerRef.current = window.setTimeout(() => setHeartBurstId(''), 700);
  };

  const setLiked = async (messageId, liked) => {
    if (!myUserId) return;
    setLikes((prev) => toggleLikeState(prev, messageId, myUserId, liked));
    if (previewMode) return;
    try {
      if (liked) await likeMessage(messageId);
      else await unlikeMessage(messageId);
    } catch (err) {
      setLikes((prev) => toggleLikeState(prev, messageId, myUserId, !liked));
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
    if (previewMode) {
      setMessages((prev) => [
        ...prev,
        {
          id: `preview-${Date.now()}`,
          sender_id: myUserId,
          type: 'text',
          body,
          payload: {},
        },
      ]);
      setDraft('');
      setSending(false);
      return;
    }
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

  const handlePickAttachment = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || sending) return;
    setSending(true);
    setError('');
    if (previewMode) {
      setSending(false);
      setError('Preview layout — attachments aren’t uploaded.');
      return;
    }
    try {
      const row = await sendChatAttachment(conversationId, file);
      setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
      await ensureImageUrls([row]);
    } catch (err) {
      setError(err?.message || 'Couldn’t send attachment.');
    } finally {
      setSending(false);
    }
  };

  const handleSendVoice = async (file, durationMs) => {
    if (!file || sending) return;
    setSending(true);
    setError('');
    if (previewMode) {
      const id = `preview-audio-${Date.now()}`;
      const path = `preview/${id}.webm`;
      const url = URL.createObjectURL(file);
      setImageUrls((prev) => ({ ...prev, [path]: url }));
      setMessages((prev) => [
        ...prev,
        {
          id,
          sender_id: myUserId,
          type: 'audio',
          body: '',
          payload: { storage_path: path, mime_type: file.type, duration_ms: durationMs },
        },
      ]);
      setSending(false);
      return;
    }
    try {
      const row = await sendAudioMessage(conversationId, file, { durationMs });
      setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
      await ensureImageUrls([row]);
    } catch (err) {
      setError(err?.message || 'Couldn’t send voice note.');
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

  if (!conversationId && !previewMode) {
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
            No messages yet.
          </Typography>
        ) : (
          messages.map((m, i) => {
            const cluster = chatClusterMeta(messages, i, {
              myUserId,
              isGroup: Boolean(groupName),
            });
            const { mine, showName, showAvatar, firstInRun, lastInRun } = cluster;
            const label = names[m.sender_id] || preview?.names?.[m.sender_id] || 'Someone';
            const like = likes.get(m.id) || { count: 0, mine: false };
            const showLikeChip = like.count > 0 || like.mine;
            const image = isImageMessage(m) ? parseImagePayload(m.payload) : null;
            const file = isFileMessage(m) ? parseFilePayload(m.payload) : null;
            const audio = isAudioMessage(m) ? parseAudioPayload(m.payload) : null;
            const attachmentPath = image?.storage_path || file?.storage_path || audio?.storage_path || '';
            const attachmentUrl = attachmentPath
              ? imageUrls[attachmentPath] || urlCacheRef.current.get(attachmentPath) || ''
              : '';
            const openAttachment = attachmentUrl && !audio
              ? () =>
                  setLightbox({
                    url: attachmentUrl,
                    mimeType: image?.mime_type || file?.mime_type || '',
                    fileName: file?.file_name || 'Photo',
                  })
              : null;
            const radii = chatBubbleRadii({
              mine,
              firstInRun,
              lastInRun,
              isMedia: Boolean(image),
            });
            return (
              <Box
                key={m.id}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: mine ? 'flex-end' : 'flex-start',
                  mb: lastInRun ? (showLikeChip ? 2.25 : 1.25) : 0.25,
                  mt: firstInRun && i > 0 ? 0.75 : 0,
                  px: 0.5,
                }}
              >
                {showName ? (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ ml: `${CHAT_NAME_GUTTER_PX}px`, mb: 0.35, fontWeight: 600 }}
                  >
                    {label}
                  </Typography>
                ) : null}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: `${CHAT_AVATAR_GAP_PX}px`,
                    maxWidth: '100%',
                    flexDirection: mine ? 'row-reverse' : 'row',
                  }}
                >
                  {!mine ? (
                    showAvatar ? (
                      <Avatar
                        sx={{
                          width: CHAT_AVATAR_PX,
                          height: CHAT_AVATAR_PX,
                          fontSize: '0.7rem',
                          bgcolor: 'primary.main',
                          flexShrink: 0,
                        }}
                      >
                        {nameToInitials(label)}
                      </Avatar>
                    ) : (
                      <Box sx={{ width: CHAT_AVATAR_PX, flexShrink: 0 }} />
                    )
                  ) : null}
                  <Box
                    className="evenly-chat-bubble"
                    sx={{
                      ...chatBubbleMaxWidthSx,
                      position: 'relative',
                      minWidth: 0,
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
                        currentUserId={myUserId}
                        fromName={names[parsePaymentPayload(m.payload)?.from_user_id] || 'Someone'}
                        toName={names[parsePaymentPayload(m.payload)?.to_user_id] || 'someone'}
                        groupName={groupName}
                        onMarkPaid={handlePaid}
                        onCancel={handleCancel}
                        busy={sending}
                      />
                    ) : image ? (
                      <Box
                        onPointerUp={handleBubblePointer(m, openAttachment)}
                        sx={{
                          ...radii,
                          overflow: 'hidden',
                          bgcolor: mine ? 'primary.main' : 'action.hover',
                          cursor: attachmentUrl ? 'pointer' : 'default',
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                        }}
                      >
                        {attachmentUrl ? (
                          <Box
                            component="img"
                            src={attachmentUrl}
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
                    ) : file ? (
                      <Box
                        onPointerUp={handleBubblePointer(m, openAttachment)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          px: 1.5,
                          py: 1,
                          ...radii,
                          bgcolor: mine ? 'primary.main' : 'action.hover',
                          color: mine ? 'primary.contrastText' : 'text.primary',
                          cursor: attachmentUrl ? 'pointer' : 'default',
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          maxWidth: '100%',
                        }}
                      >
                        <InsertDriveFileOutlinedIcon fontSize="small" />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" noWrap>
                            {file.file_name}
                          </Typography>
                          {file.byte_size ? (
                            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                              {formatChatByteSize(file.byte_size)}
                            </Typography>
                          ) : null}
                        </Box>
                      </Box>
                    ) : audio ? (
                      <ChatAudioBubble
                        url={attachmentUrl}
                        durationMs={audio.duration_ms}
                        mine={mine}
                        radii={radii}
                        onPointerUp={handleBubblePointer(m)}
                      />
                    ) : (
                      <Box
                        onPointerUp={handleBubblePointer(m)}
                        sx={{
                          px: 1.75,
                          py: 1,
                          ...radii,
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
                            fontSize: '0.9375rem',
                            lineHeight: 1.4,
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
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: -12,
                        [mine ? 'right' : 'left']: 8,
                        display: 'flex',
                        alignItems: 'center',
                        bgcolor: 'background.paper',
                        borderRadius: 999,
                        boxShadow: 1,
                        pr: like.count > 1 ? 0.75 : 0.25,
                        opacity: showLikeChip ? 1 : 0,
                        pointerEvents: showLikeChip ? 'auto' : 'none',
                        '@media (hover: hover)': {
                          '.evenly-chat-bubble:hover &': {
                            opacity: 1,
                            pointerEvents: 'auto',
                          },
                        },
                      }}
                    >
                      <IconButton
                        size="small"
                        aria-label={like.mine ? 'Unlike' : 'Like'}
                        onClick={() => setLiked(m.id, !like.mine)}
                        sx={{ p: 0.35 }}
                      >
                        {like.mine ? (
                          <FavoriteIcon sx={{ fontSize: 16, color: 'error.main' }} />
                        ) : (
                          <FavoriteBorderIcon sx={{ fontSize: 16 }} />
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
              </Box>
            );
          })
        )}
      </Box>
      <ChatComposer
        draft={draft}
        onDraftChange={setDraft}
        sending={sending}
        onSend={handleSend}
        onPickFile={handlePickAttachment}
        onSendVoice={handleSendVoice}
        onError={setError}
      />
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
