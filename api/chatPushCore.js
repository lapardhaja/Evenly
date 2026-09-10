export function recipientUserIds(memberIds, senderId) {
  return (memberIds || []).filter((id) => id && id !== senderId);
}

function preview(message) {
  if (message?.type === 'payment') return 'Payment request';
  if (message?.type === 'image') return 'Sent a photo';
  const body = typeof message?.body === 'string' ? message.body.trim() : '';
  if (!body) return 'New message';
  return body.length > 80 ? `${body.slice(0, 79)}…` : body;
}

export function buildChatPushPayload({ senderName = '', message } = {}) {
  const conversationId = message?.conversation_id || '';
  const title = String(senderName || '').trim() || 'Evenly';
  return {
    title,
    body: preview(message),
    tag: conversationId || 'evenly-chat',
    conversationId,
    path: conversationId ? `#/chat/${conversationId}` : '#/chat',
  };
}

export function isGonePushStatus(status) {
  return status === 404 || status === 410;
}

function headerValue(req, name) {
  const headers = req?.headers ?? {};
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower && typeof value === 'string') {
      return value;
    }
  }
  return undefined;
}

export function bearerToken(req) {
  const raw = headerValue(req, 'authorization') || '';
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}

export function vapidReady(env = {}) {
  return Boolean(
    env.VAPID_PUBLIC_KEY &&
      env.VAPID_PRIVATE_KEY &&
      env.VAPID_SUBJECT,
  );
}

export function chatPushEnv(env = process.env) {
  return {
    VAPID_PUBLIC_KEY: env.VAPID_PUBLIC_KEY || env.VITE_VAPID_PUBLIC_KEY || '',
    VAPID_PRIVATE_KEY: env.VAPID_PRIVATE_KEY || '',
    VAPID_SUBJECT: env.VAPID_SUBJECT || 'mailto:servetlap29@gmail.com',
    SUPABASE_URL: env.SUPABASE_URL || env.VITE_SUPABASE_URL || '',
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY || '',
    CORS_ALLOW_ORIGIN: env.CORS_ALLOW_ORIGIN,
  };
}
