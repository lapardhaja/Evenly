import test from 'node:test';
import assert from 'node:assert/strict';
import {
  urlBase64ToUint8Array,
  chatPushApiUrl,
  subscriptionToRow,
  resolveOrTimeout,
  applicationServerKeyMatches,
  ensurePushSubscription,
  vapidApplicationServerKey,
  syncChatPushSubscriptionResult,
  requestServiceWorkerNotification,
} from './chatPushClient.js';

test('urlBase64ToUint8Array decodes a VAPID key', () => {
  const bytes = urlBase64ToUint8Array('AQID');
  assert.deepEqual([...bytes], [1, 2, 3]);
});

test('chatPushApiUrl uses same origin by default', () => {
  assert.equal(chatPushApiUrl(''), '/api/chat-push');
  assert.equal(chatPushApiUrl('https://api.example'), 'https://api.example/api/chat-push');
});

test('subscriptionToRow maps PushSubscription JSON', () => {
  const row = subscriptionToRow('user-1', {
    endpoint: 'https://push.example/abc',
    keys: { p256dh: 'p', auth: 'a' },
  });
  assert.equal(row.user_id, 'user-1');
  assert.equal(row.endpoint, 'https://push.example/abc');
  assert.equal(row.p256dh, 'p');
  assert.equal(row.auth, 'a');
});

test('resolveOrTimeout returns fallback instead of hanging', async () => {
  const value = await resolveOrTimeout(new Promise(() => {}), 15, 'miss');
  assert.equal(value, 'miss');
  assert.equal(await resolveOrTimeout(Promise.resolve('hit'), 50, 'miss'), 'hit');
});

test('VAPID and scan origin use static Vite env access so the build inlines them', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('./chatPushClient.js', import.meta.url), 'utf8');
  assert.match(src, /import\.meta\.env\.VITE_VAPID_PUBLIC_KEY/);
  assert.match(src, /import\.meta\.env\.VITE_SCAN_RECEIPT_URL/);
  assert.equal(src.includes('import.meta.env?.VITE_VAPID_PUBLIC_KEY'), false);
  assert.equal(src.includes('import.meta.env?.VITE_SCAN_RECEIPT_URL'), false);
});

test('applicationServerKeyMatches is true when the sub has no key recorded', () => {
  assert.equal(applicationServerKeyMatches({ options: {} }, new Uint8Array([1, 2])), true);
});

test('applicationServerKeyMatches is false when the VAPID key rotated', () => {
  const vapid = new Uint8Array([4, 1, 2]);
  const other = new Uint8Array([4, 9, 9]);
  assert.equal(applicationServerKeyMatches({ options: { applicationServerKey: other } }, vapid), false);
  assert.equal(applicationServerKeyMatches({ options: { applicationServerKey: vapid } }, vapid), true);
});

test('ensurePushSubscription unsubscribes a stale VAPID key then resubscribes', async () => {
  const vapid = vapidApplicationServerKey('AQID');
  const stale = {
    options: { applicationServerKey: new Uint8Array([9, 9, 9]) },
    unsubscribed: 0,
    async unsubscribe() {
      this.unsubscribed += 1;
    },
    toJSON() {
      return { endpoint: 'https://push.example/old', keys: { p256dh: 'p', auth: 'a' } };
    },
  };
  const fresh = {
    options: { applicationServerKey: vapid },
    toJSON() {
      return { endpoint: 'https://push.example/new', keys: { p256dh: 'p', auth: 'a' } };
    },
  };
  const calls = [];
  const sub = await ensurePushSubscription(
    {
      async getSubscription() {
        return calls.length ? null : stale;
      },
      async subscribe(opts) {
        calls.push(opts);
        return fresh;
      },
    },
    vapid,
  );
  assert.equal(stale.unsubscribed, 1);
  assert.equal(calls.length, 1);
  assert.equal(sub, fresh);
  assert.equal(calls[0].userVisibleOnly, true);
});

test('ensurePushSubscription reuses a matching existing subscription', async () => {
  const vapid = vapidApplicationServerKey('AQID');
  const existing = {
    options: { applicationServerKey: vapid },
    toJSON() {
      return { endpoint: 'https://push.example/keep', keys: { p256dh: 'p', auth: 'a' } };
    },
  };
  let subscribed = 0;
  const sub = await ensurePushSubscription(
    {
      async getSubscription() {
        return existing;
      },
      async subscribe() {
        subscribed += 1;
        throw new Error('should not subscribe');
      },
    },
    vapid,
  );
  assert.equal(sub, existing);
  assert.equal(subscribed, 0);
});

test('syncChatPushSubscriptionResult upserts the subscription and returns ok', async () => {
  const vapid = 'AQID';
  const upserts = [];
  const result = await syncChatPushSubscriptionResult({
    vapidPublicKey: vapid,
    getSupabase: async () => ({
      auth: {
        getUser: async () => ({ data: { user: { id: 'user-1' } } }),
      },
      from(table) {
        assert.equal(table, 'push_subscriptions');
        return {
          async upsert(row) {
            upserts.push(row);
            return { error: null };
          },
        };
      },
    }),
    navigator: {
      serviceWorker: {
        ready: Promise.resolve({
          pushManager: {
            async getSubscription() {
              return null;
            },
            async subscribe() {
              return {
                toJSON() {
                  return {
                    endpoint: 'https://push.example/abc',
                    keys: { p256dh: 'p', auth: 'a' },
                  };
                },
              };
            },
          },
        }),
      },
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.reason, 'ok');
  assert.equal(upserts.length, 1);
  assert.equal(upserts[0].user_id, 'user-1');
  assert.equal(upserts[0].endpoint, 'https://push.example/abc');
});

test('syncChatPushSubscriptionResult reports subscribe-failed instead of pretending keys are missing', async () => {
  const result = await syncChatPushSubscriptionResult({
    vapidPublicKey: 'AQID',
    getSupabase: async () => ({
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
      from() {
        throw new Error('should not upsert');
      },
    }),
    navigator: {
      serviceWorker: {
        ready: Promise.resolve({
          pushManager: {
            async getSubscription() {
              return null;
            },
            async subscribe() {
              throw new Error('Registration failed - push service error');
            },
          },
        }),
      },
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'subscribe-failed');
});

test('requestServiceWorkerNotification falls through when the worker never acks', async () => {
  const posted = [];
  class FakeChannel {
    constructor() {
      this.port1 = { onmessage: null };
      this.port2 = {};
    }
  }
  const ok = await requestServiceWorkerNotification(
    'Evenly',
    { body: 'hey' },
    {
      MessageChannel: FakeChannel,
      chatNotifyAckTimeoutMs: 20,
      navigator: {
        serviceWorker: {
          controller: {
            postMessage(payload) {
              posted.push(payload);
            },
          },
        },
      },
    },
  );
  assert.equal(ok, false);
  assert.equal(posted[0].type, 'evenly-show-notification');
});
