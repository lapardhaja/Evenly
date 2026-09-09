export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
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

function vapidPublicKey() {
  return String(
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_VAPID_PUBLIC_KEY) || '',
  ).trim();
}

function scanOrigin() {
  return String(
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SCAN_RECEIPT_URL) || '',
  ).replace(/\/$/, '');
}

async function supabaseClient() {
  // Deferred: node:test has no Vite import.meta.env (same pattern as publicGroupShare.js).
  const { getSupabase } = await import('./supabaseClient.js');
  return getSupabase();
}

export async function syncChatPushSubscription(env = globalThis) {
  const vapid = vapidPublicKey();
  if (!vapid) return false;
  const supabase = await supabaseClient();
  if (!supabase) return false;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const ready = env.navigator?.serviceWorker?.ready;
  if (!ready || typeof ready.then !== 'function') return false;
  const reg = await ready;
  if (!reg?.pushManager?.subscribe) return false;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid),
    });
  }
  const row = subscriptionToRow(user.id, sub.toJSON?.() || sub);
  if (!row.endpoint || !row.p256dh || !row.auth) return false;
  const { error } = await supabase.from('push_subscriptions').upsert(row, {
    onConflict: 'user_id,endpoint',
  });
  return !error;
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
