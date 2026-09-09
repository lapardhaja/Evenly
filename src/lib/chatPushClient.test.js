import test from 'node:test';
import assert from 'node:assert/strict';
import {
  urlBase64ToUint8Array,
  chatPushApiUrl,
  subscriptionToRow,
  resolveOrTimeout,
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
