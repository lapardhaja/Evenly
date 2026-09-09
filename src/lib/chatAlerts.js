import { syncChatPushSubscription, postOpenChatToServiceWorker } from './chatPushClient.js';

export const EVENLY_CHAT_OPEN_EVENT = 'evenly-chat-open';

export function parseIncomingChatMessage(payload) {
  const event = payload?.eventType || payload?.event;
  if (!payload || event !== 'INSERT') return null;
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
  postOpenChatToServiceWorker(conversationId || '', env);
}

export async function enableChatNotifications(env = globalThis) {
  const N = env.Notification;
  if (!N) return 'unsupported';
  let perm = N.permission;
  if (perm === 'default' && typeof N.requestPermission === 'function') {
    try {
      perm = await N.requestPermission();
    } catch {
      return N.permission || 'denied';
    }
  }
  if (perm === 'granted') {
    await syncChatPushSubscription(env).catch(() => {});
  }
  return perm;
}

export function requestChatNotificationPermission(env = globalThis) {
  void enableChatNotifications(env);
}

export async function alertIncomingChat(
  { title = 'Evenly', body = 'New message', tag = 'evenly-chat' } = {},
  env = globalThis,
) {
  try {
    env.navigator?.vibrate?.([40, 60, 40]);
  } catch {
    /* iOS has no vibrate */
  }

  const N = env.Notification;
  if (!N || N.permission !== 'granted') return;

  const opts = {
    body,
    tag: tag || 'evenly-chat',
    silent: false,
    renotify: true,
    icon: '/brand/pwa-192.png',
    badge: '/brand/pwa-192.png',
    data: { path: tag && tag !== 'evenly-chat' ? `#/chat/${tag}` : '#/chat' },
  };

  try {
    const ready = env.navigator?.serviceWorker?.ready;
    if (ready && typeof ready.then === 'function') {
      const reg = await ready;
      if (typeof reg?.showNotification === 'function') {
        await reg.showNotification(title, opts);
        return;
      }
    }
  } catch {
    /* fall through to Notification constructor */
  }

  try {
    new N(title, opts);
  } catch {
    /* permission revoked mid-flight */
  }
}
