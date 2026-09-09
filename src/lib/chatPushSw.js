/** Pure helpers for the service worker push / notificationclick path. */

export function applyChatOpenMessage(state, data) {
  if (!data || data.type !== 'evenly-chat-open') return state;
  return { ...state, openConversationId: data.conversationId || '' };
}

export function shouldShowChatPush(state, { conversationId, windowClients } = {}) {
  const clients = windowClients || [];
  if (!clients.length) return true;
  const openId = state?.openConversationId || '';
  const viewing = clients.some(
    (c) =>
      c.focused &&
      c.visibilityState === 'visible' &&
      openId &&
      openId === conversationId,
  );
  return !viewing;
}

export function parsePushEventData(data) {
  const fallback = {
    title: 'Evenly',
    body: 'New message',
    path: '#/chat',
    tag: 'evenly-chat',
    conversationId: '',
  };
  if (!data) return fallback;
  try {
    const raw = typeof data.json === 'function' ? data.json() : data;
    const conversationId = typeof raw?.conversationId === 'string' ? raw.conversationId : '';
    const path =
      typeof raw?.path === 'string' && raw.path
        ? raw.path
        : conversationId
          ? `#/chat/${conversationId}`
          : fallback.path;
    return {
      title: (typeof raw?.title === 'string' && raw.title.trim()) || fallback.title,
      body: (typeof raw?.body === 'string' && raw.body.trim()) || fallback.body,
      path,
      tag: (typeof raw?.tag === 'string' && raw.tag) || conversationId || fallback.tag,
      conversationId,
    };
  } catch {
    return fallback;
  }
}

export function chatNotificationClickUrl(origin, path) {
  const base = String(origin || '').replace(/\/$/, '');
  const raw = String(path || '#/chat');
  const hash = raw.startsWith('#') ? raw : `#${raw}`;
  return `${base}/${hash}`;
}
