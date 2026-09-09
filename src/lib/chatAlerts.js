import {
  syncChatPushSubscriptionResult,
  postOpenChatToServiceWorker,
  requestServiceWorkerNotification,
  resolveOrTimeout,
} from './chatPushClient.js';

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

export function isStandaloneDisplay(env = globalThis) {
  try {
    if (env.navigator?.standalone === true) return true;
    if (env.matchMedia?.('(display-mode: standalone)')?.matches) return true;
    if (env.matchMedia?.('(display-mode: fullscreen)')?.matches) return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function isIosDevice(env = globalThis) {
  const ua = String(env.navigator?.userAgent || '');
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  return env.navigator?.platform === 'MacIntel' && Number(env.navigator?.maxTouchPoints) > 1;
}

export function isIosSafariTab(env = globalThis) {
  return isIosDevice(env) && !isStandaloneDisplay(env);
}

export function chatAlertsEnableHint({ permission, push, reason } = {}, env = globalThis) {
  if (permission === 'granted' && push) {
    return 'Phone and computer banners are on. You’ll get one when Evenly isn’t in front.';
  }
  if (permission === 'denied') {
    return 'Alerts are blocked. Enable notifications for Evenly in system Settings.';
  }
  if (permission === 'unsupported') {
    return 'This browser can’t show notifications.';
  }
  if (isIosSafariTab(env)) {
    return 'On iPhone, tap Share → Add to Home Screen, open Evenly from that icon, then Enable again. Safari tabs can’t send lock-screen banners.';
  }
  if (permission === 'granted' && !push) {
    if (reason === 'no-vapid' || reason === 'no-supabase') {
      return 'This device is allowed, but lock-screen banners aren’t set up on the server yet.';
    }
    if (reason === 'no-sw') {
      return 'Reload Evenly, then tap Enable again so this device can register for banners.';
    }
    return 'Couldn’t register this device for banners. Close extra Evenly tabs, reload, and tap Enable again.';
  }
  return 'Tap Enable, then Allow. You’ll get a banner on this computer or phone when a message arrives and Evenly isn’t in front.';
}

export async function enableChatNotifications(env = globalThis) {
  const N = env.Notification;
  if (!N) return { permission: 'unsupported', push: false, reason: 'unsupported' };
  let perm = N.permission;
  if (perm === 'default' && typeof N.requestPermission === 'function') {
    try {
      perm = await N.requestPermission();
    } catch {
      perm = N.permission || 'denied';
    }
  }
  if (perm !== 'granted') return { permission: perm, push: false, reason: perm };
  const result = await syncChatPushSubscriptionResult(env).catch(() => ({
    ok: false,
    reason: 'subscribe-failed',
  }));
  return { permission: perm, push: Boolean(result.ok), reason: result.reason || 'subscribe-failed' };
}

export function requestChatNotificationPermission(env = globalThis) {
  void enableChatNotifications(env);
}

export function incomingChatSnackText(message) {
  return incomingChatPreview(message);
}

export function chatNotificationOptions({ body, tag } = {}) {
  const path = tag && tag !== 'evenly-chat' ? `#/chat/${tag}` : '#/chat';
  return {
    body,
    tag: tag || 'evenly-chat',
    silent: false,
    renotify: true,
    requireInteraction: true,
    vibrate: [80, 40, 80],
    icon: '/brand/pwa-192.png',
    badge: '/brand/pwa-192.png',
    data: { path },
  };
}

export function playIncomingChatChime(env = globalThis) {
  try {
    const AC = env.AudioContext || env.webkitAudioContext;
    if (!AC) return;
    const ctx = typeof AC === 'function' ? new AC() : null;
    if (!ctx?.createOscillator || !ctx.createGain) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    /* autoplay / iOS mute */
  }
}

export async function alertIncomingChat(
  { title = 'Evenly', body = 'New message', tag = 'evenly-chat' } = {},
  env = globalThis,
  { readyTimeoutMs = 2500 } = {},
) {
  try {
    env.navigator?.vibrate?.([80, 40, 80]);
  } catch {
    /* iOS has no vibrate */
  }
  playIncomingChatChime(env);

  const N = env.Notification;
  if (!N || N.permission !== 'granted') return;

  const opts = chatNotificationOptions({ body, tag });

  if (await requestServiceWorkerNotification(title, opts, env)) return;

  try {
    const ready = env.navigator?.serviceWorker?.ready;
    const reg = await resolveOrTimeout(ready, readyTimeoutMs, null);
    if (typeof reg?.showNotification === 'function') {
      await reg.showNotification(title, opts);
      return;
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
