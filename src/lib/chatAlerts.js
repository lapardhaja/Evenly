/**
 * Incoming chat alerts (vibrate + OS notification).
 * iOS has no navigator.vibrate; a granted Notification is what rings / haptics
 * according to the phone’s ringer. Skip when that thread is already on screen.
 */

export const EVENLY_CHAT_OPEN_EVENT = 'evenly-chat-open';

export function parseIncomingChatMessage(payload) {
  if (!payload || payload.eventType !== 'INSERT') return null;
  const row = payload.new;
  if (!row || typeof row !== 'object') return null;
  const conversationId = typeof row.conversation_id === 'string' ? row.conversation_id : '';
  const senderId = typeof row.sender_id === 'string' ? row.sender_id : '';
  if (!conversationId || !senderId) return null;
  return {
    conversationId,
    senderId,
    body: typeof row.body === 'string' ? row.body : '',
    type: row.type === 'payment' ? 'payment' : 'text',
  };
}

export function shouldAlertIncomingChat({
  myUserId,
  message,
  openConversationId = '',
  visibilityState = 'visible',
} = {}) {
  if (!myUserId || !message?.conversationId || !message?.senderId) return false;
  if (message.senderId === myUserId) return false;
  if (
    openConversationId &&
    openConversationId === message.conversationId &&
    visibilityState === 'visible'
  ) {
    return false;
  }
  return true;
}

export function incomingChatPreview(message) {
  if (!message) return 'New message';
  if (message.type === 'payment') return 'Payment request';
  const body = typeof message.body === 'string' ? message.body.trim() : '';
  if (!body) return 'New message';
  return body.length > 80 ? `${body.slice(0, 79)}…` : body;
}

export function emitOpenChatConversation(conversationId, env = globalThis) {
  try {
    env.dispatchEvent?.(
      new CustomEvent(EVENLY_CHAT_OPEN_EVENT, {
        detail: { conversationId: conversationId || '' },
      }),
    );
  } catch {
    /* ignore */
  }
}

export function requestChatNotificationPermission(env = globalThis) {
  const N = env.Notification;
  if (!N || typeof N.requestPermission !== 'function') return;
  if (N.permission !== 'default') return;
  try {
    const p = N.requestPermission();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch {
    /* ignore */
  }
}

export function alertIncomingChat({ title = 'Evenly', body = 'New message', tag = 'evenly-chat' } = {}, env = globalThis) {
  try {
    env.navigator?.vibrate?.([40, 60, 40]);
  } catch {
    /* iOS has no vibrate */
  }

  const N = env.Notification;
  if (!N || N.permission !== 'granted') return;
  try {
    const opts = {
      body,
      tag: tag || 'evenly-chat',
      silent: false,
      icon: '/brand/pwa-192.png',
    };
    const n = new N(title, opts);
    if (n && typeof n.close === 'function' && env.setTimeout) {
      env.setTimeout(() => {
        try {
          n.close();
        } catch {
          /* ignore */
        }
      }, 5000);
    }
  } catch {
    /* permission revoked mid-flight */
  }
}
