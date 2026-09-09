export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function vapidApplicationServerKey(base64) {
  const bytes = urlBase64ToUint8Array(base64);
  return new Uint8Array(bytes);
}

export function chatPushApiUrl(origin = '') {
  const base = String(origin || '').replace(/\/$/, '');
  return `${base}/api/chat-push`;
}

export function subscriptionToRow(userId, json) {
  return {
    user_id: userId,
    endpoint: json?.endpoint || '',
    p256dh: json?.keys?.p256dh || '',
    auth: json?.keys?.auth || '',
  };
}

/** Must be `import.meta.env.VITE_*` (no `?.`) or Vite leaves an empty object in the client bundle. */
function vapidPublicKey() {
  try {
    return String(import.meta.env.VITE_VAPID_PUBLIC_KEY || '').trim();
  } catch {
    return '';
  }
}

function scanOrigin() {
  try {
    return String(import.meta.env.VITE_SCAN_RECEIPT_URL || '').replace(/\/$/, '');
  } catch {
    return '';
  }
}

function readVapidPublicKey(env = globalThis) {
  if (typeof env.vapidPublicKey === 'string' && env.vapidPublicKey.trim()) {
    return env.vapidPublicKey.trim();
  }
  return vapidPublicKey();
}

/** Don’t hang Enable / in-tab banners if `serviceWorker.ready` never settles. */
export function resolveOrTimeout(promise, ms, fallback = null) {
  if (!promise || typeof promise.then !== 'function') return Promise.resolve(fallback);
  if (ms == null || ms < 0) return promise;
  return new Promise((resolve) => {
    const id = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(id);
        resolve(value);
      },
      () => {
        clearTimeout(id);
        resolve(fallback);
      },
    );
  });
}

async function supabaseClient() {
  // Deferred: node:test has no Vite import.meta.env (same pattern as publicGroupShare.js).
  const { getSupabase } = await import('./supabaseClient.js');
  return getSupabase();
}

export function applicationServerKeyMatches(sub, vapidBytes) {
  const key = sub?.options?.applicationServerKey;
  if (!key) return true;
  const existing = key instanceof Uint8Array ? key : new Uint8Array(key);
  const want = vapidBytes instanceof Uint8Array ? vapidBytes : new Uint8Array(vapidBytes || []);
  if (existing.byteLength !== want.byteLength) return false;
  for (let i = 0; i < existing.length; i += 1) {
    if (existing[i] !== want[i]) return false;
  }
  return true;
}

export async function ensurePushSubscription(pushManager, vapidBytes) {
  let sub = await pushManager.getSubscription();
  if (sub && !applicationServerKeyMatches(sub, vapidBytes)) {
    try {
      await sub.unsubscribe();
    } catch {
      /* try a fresh subscribe anyway */
    }
    sub = null;
  }
  if (!sub) {
    sub = await pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidBytes,
    });
  }
  return sub;
}

async function resolvePushRegistration(env) {
  const sw = env.navigator?.serviceWorker;
  if (!sw) return null;
  const timeoutMs = Number.isFinite(env.chatPushReadyTimeoutMs) ? env.chatPushReadyTimeoutMs : 4000;
  if (typeof sw.getRegistration === 'function') {
    const existing = await resolveOrTimeout(sw.getRegistration(), timeoutMs, null);
    if (existing?.pushManager?.subscribe) return existing;
  }
  const ready = sw.ready;
  if (!ready || typeof ready.then !== 'function') return null;
  return resolveOrTimeout(ready, timeoutMs, null);
}

const pushSyncLocks = new WeakMap();

async function syncChatPushSubscriptionUnqueued(env) {
  const vapid = readVapidPublicKey(env);
  if (!vapid) return { ok: false, reason: 'no-vapid' };

  const supabase = await (typeof env.getSupabase === 'function' ? env.getSupabase() : supabaseClient());
  if (!supabase) return { ok: false, reason: 'no-supabase' };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: 'no-user' };

  const reg = await resolvePushRegistration(env);
  if (!reg?.pushManager?.subscribe) return { ok: false, reason: 'no-sw' };

  let sub;
  try {
    sub = await ensurePushSubscription(reg.pushManager, vapidApplicationServerKey(vapid));
  } catch {
    return { ok: false, reason: 'subscribe-failed' };
  }
  const row = subscriptionToRow(user.id, sub?.toJSON?.() || sub);
  if (!row.endpoint || !row.p256dh || !row.auth) return { ok: false, reason: 'subscribe-failed' };
  const { error } = await supabase.from('push_subscriptions').upsert(row, {
    onConflict: 'user_id,endpoint',
  });
  if (error) return { ok: false, reason: 'upsert-failed' };
  return { ok: true, reason: 'ok' };
}

export function syncChatPushSubscriptionResult(env = globalThis) {
  const prev = pushSyncLocks.get(env) || Promise.resolve();
  const next = prev.then(
    () => syncChatPushSubscriptionUnqueued(env),
    () => syncChatPushSubscriptionUnqueued(env),
  );
  pushSyncLocks.set(
    env,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  return next;
}

export async function syncChatPushSubscription(env = globalThis) {
  const result = await syncChatPushSubscriptionResult(env);
  return result.ok;
}

export async function notifyChatPush(messageId, env = globalThis) {
  if (!messageId) return;
  const supabase = await supabaseClient();
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return;
  const fetchFn = env.fetch || fetch;
  await fetchFn(chatPushApiUrl(scanOrigin()), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messageId }),
  });
}

export function postShowNotificationToServiceWorker(title, options, env = globalThis) {
  const controller = env.navigator?.serviceWorker?.controller;
  if (!controller || typeof controller.postMessage !== 'function') return false;
  try {
    controller.postMessage({
      type: 'evenly-show-notification',
      title,
      options,
    });
    return true;
  } catch {
    return false;
  }
}

export async function requestServiceWorkerNotification(title, options, env = globalThis) {
  const controller = env.navigator?.serviceWorker?.controller;
  if (!controller || typeof controller.postMessage !== 'function') return false;
  const Channel = env.MessageChannel;
  if (typeof Channel !== 'function') {
    return postShowNotificationToServiceWorker(title, options, env);
  }
  return new Promise((resolve) => {
    const ch = new Channel();
    const ms = Number.isFinite(env.chatNotifyAckTimeoutMs) ? env.chatNotifyAckTimeoutMs : 800;
    const id = setTimeout(() => resolve(false), ms);
    ch.port1.onmessage = () => {
      clearTimeout(id);
      resolve(true);
    };
    try {
      controller.postMessage(
        {
          type: 'evenly-show-notification',
          title,
          options,
        },
        [ch.port2],
      );
    } catch {
      clearTimeout(id);
      resolve(false);
    }
  });
}

export function postOpenChatToServiceWorker(conversationId, env = globalThis) {
  try {
    env.navigator?.serviceWorker?.controller?.postMessage?.({
      type: 'evenly-chat-open',
      conversationId: conversationId || '',
    });
  } catch {
    /* no active worker */
  }
}
