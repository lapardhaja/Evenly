import test from 'node:test';
import assert from 'node:assert/strict';
import {
  incomingChatPreview,
  parseIncomingChatMessage,
  shouldAlertIncomingChat,
  alertIncomingChat,
  emitOpenChatConversation,
  enableChatNotifications,
  chatAlertsEnableHint,
  isIosSafariTab,
} from './chatAlerts.js';

test('parseIncomingChatMessage reads INSERT new row', () => {
  const msg = parseIncomingChatMessage({
    eventType: 'INSERT',
    new: {
      conversation_id: 'c1',
      sender_id: 'u2',
      body: 'hey',
      type: 'text',
    },
  });
  assert.deepEqual(msg, {
    conversationId: 'c1',
    senderId: 'u2',
    body: 'hey',
    type: 'text',
  });
});

test('parseIncomingChatMessage reads INSERT via event as well as eventType', () => {
  const msg = parseIncomingChatMessage({
    event: 'INSERT',
    new: { conversation_id: 'c1', sender_id: 'u2', body: 'hey', type: 'text' },
  });
  assert.equal(msg.conversationId, 'c1');
});

test('emitOpenChatConversation tells the service worker which thread is open', () => {
  const posted = [];
  emitOpenChatConversation('c9', {
    dispatchEvent() {},
    navigator: {
      serviceWorker: {
        controller: {
          postMessage(payload) {
            posted.push(payload);
          },
        },
      },
    },
  });
  assert.deepEqual(posted, [{ type: 'evenly-chat-open', conversationId: 'c9' }]);
});

test('parseIncomingChatMessage ignores UPDATE and missing rows', () => {
  assert.equal(
    parseIncomingChatMessage({
      eventType: 'UPDATE',
      new: { conversation_id: 'c1', sender_id: 'u2', body: 'x', type: 'text' },
    }),
    null,
  );
  assert.equal(parseIncomingChatMessage({ eventType: 'INSERT', new: null }), null);
});

test('shouldAlertIncomingChat skips own messages', () => {
  assert.equal(
    shouldAlertIncomingChat({
      myUserId: 'me',
      message: { conversationId: 'c1', senderId: 'me', body: 'hi', type: 'text' },
      openConversationId: '',
      visibilityState: 'visible',
    }),
    false,
  );
});

test('shouldAlertIncomingChat skips when that thread is open and visible', () => {
  assert.equal(
    shouldAlertIncomingChat({
      myUserId: 'me',
      message: { conversationId: 'c1', senderId: 'them', body: 'hi', type: 'text' },
      openConversationId: 'c1',
      visibilityState: 'visible',
    }),
    false,
  );
});

test('shouldAlertIncomingChat fires when a different thread is open', () => {
  assert.equal(
    shouldAlertIncomingChat({
      myUserId: 'me',
      message: { conversationId: 'c2', senderId: 'them', body: 'hi', type: 'text' },
      openConversationId: 'c1',
      visibilityState: 'visible',
    }),
    true,
  );
});

test('shouldAlertIncomingChat fires when the open thread is backgrounded', () => {
  assert.equal(
    shouldAlertIncomingChat({
      myUserId: 'me',
      message: { conversationId: 'c1', senderId: 'them', body: 'hi', type: 'text' },
      openConversationId: 'c1',
      visibilityState: 'hidden',
    }),
    true,
  );
});

test('incomingChatPreview clips body', () => {
  assert.equal(incomingChatPreview({ type: 'payment', body: '' }), 'Payment request');
  assert.equal(incomingChatPreview({ type: 'text', body: '  yo  ' }), 'yo');
  assert.equal(incomingChatPreview({ type: 'text', body: 'a'.repeat(90) }).length <= 80, true);
});

test('alertIncomingChat asks the service worker to show so a focused tab cannot swallow it', async () => {
  const posted = [];
  const created = [];
  function FakeNotification(title, opts) {
    created.push({ title, opts });
  }
  FakeNotification.permission = 'granted';
  await alertIncomingChat(
    { title: 'Evenly', body: 'hey', tag: 'c1' },
    {
      navigator: {
        vibrate() {},
        serviceWorker: {
          controller: {
            postMessage(payload) {
              posted.push(payload);
            },
          },
          ready: Promise.resolve({
            showNotification: async () => {
              throw new Error('page showNotification should not run when SW can');
            },
          }),
        },
      },
      Notification: FakeNotification,
    },
  );
  assert.equal(created.length, 0);
  assert.equal(posted.length, 1);
  assert.equal(posted[0].type, 'evenly-show-notification');
  assert.equal(posted[0].title, 'Evenly');
  assert.equal(posted[0].options.body, 'hey');
  assert.deepEqual(posted[0].options.vibrate, [80, 40, 80]);
});

test('alertIncomingChat vibrates and posts a notification when allowed', async () => {
  const vibrated = [];
  const created = [];
  function FakeNotification(title, opts) {
    created.push({ title, opts });
  }
  FakeNotification.permission = 'granted';
  await alertIncomingChat(
    { title: 'Evenly', body: 'hey', tag: 'c1' },
    {
      navigator: { vibrate: (p) => vibrated.push(p) },
      Notification: FakeNotification,
    },
  );
  assert.deepEqual(vibrated[0], [80, 40, 80]);
  assert.equal(created.length, 1);
  assert.equal(created[0].title, 'Evenly');
  assert.equal(created[0].opts.body, 'hey');
  assert.equal(created[0].opts.silent, false);
  assert.equal(created[0].opts.renotify, true);
});

test('alertIncomingChat prefers serviceWorker showNotification (iOS PWA)', async () => {
  const shown = [];
  const created = [];
  function FakeNotification(title, opts) {
    created.push({ title, opts });
  }
  FakeNotification.permission = 'granted';
  await alertIncomingChat(
    { title: 'Evenly', body: 'hey', tag: 'c1' },
    {
      navigator: {
        vibrate() {},
        serviceWorker: {
          ready: Promise.resolve({
            showNotification: async (title, opts) => {
              shown.push({ title, opts });
            },
          }),
        },
      },
      Notification: FakeNotification,
    },
  );
  assert.equal(created.length, 0);
  assert.equal(shown.length, 1);
  assert.equal(shown[0].title, 'Evenly');
  assert.equal(shown[0].opts.body, 'hey');
  assert.equal(shown[0].opts.silent, false);
  assert.equal(shown[0].opts.renotify, true);
  assert.deepEqual(shown[0].opts.vibrate, [80, 40, 80]);
});

test('alertIncomingChat falls back if serviceWorker.ready never resolves', async () => {
  const created = [];
  function FakeNotification(title, opts) {
    created.push({ title, opts });
  }
  FakeNotification.permission = 'granted';
  await alertIncomingChat(
    { title: 'Evenly', body: 'hey', tag: 'c1' },
    {
      navigator: {
        vibrate() {},
        serviceWorker: { ready: new Promise(() => {}) },
      },
      Notification: FakeNotification,
    },
    { readyTimeoutMs: 20 },
  );
  assert.equal(created.length, 1);
  assert.equal(created[0].title, 'Evenly');
});

test('enableChatNotifications returns push:false when subscribe cannot run', async () => {
  function FakeNotification() {}
  FakeNotification.permission = 'granted';
  FakeNotification.requestPermission = async () => 'granted';
  const result = await enableChatNotifications({
    Notification: FakeNotification,
    navigator: {},
    vapidPublicKey: 'AQID',
    getSupabase: async () => ({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    }),
  });
  assert.equal(result.permission, 'granted');
  assert.equal(result.push, false);
  assert.equal(result.reason, 'no-sw');
});

test('isIosSafariTab is true for iPhone Safari that is not a Home Screen app', () => {
  assert.equal(
    isIosSafariTab({
      navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', standalone: false },
      matchMedia: () => ({ matches: false }),
    }),
    true,
  );
  assert.equal(
    isIosSafariTab({
      navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', standalone: true },
      matchMedia: () => ({ matches: true }),
    }),
    false,
  );
});

test('chatAlertsEnableHint does not blame missing server keys when subscribe failed', () => {
  const granted = chatAlertsEnableHint({ permission: 'granted', push: false, reason: 'subscribe-failed' }, {
    navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120' },
  });
  assert.match(granted, /register this device|reload|Enable again/i);
  assert.equal(/Web Push keys on the server/i.test(granted), false);
});

test('chatAlertsEnableHint tells iPhone Safari to Add to Home Screen', () => {
  const hint = chatAlertsEnableHint(
    { permission: 'granted', push: false, reason: 'subscribe-failed' },
    {
      navigator: {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1',
        standalone: false,
      },
      matchMedia: () => ({ matches: false }),
    },
  );
  assert.match(hint, /Home Screen/i);
});

test('chatAlertsEnableHint confirms lock-screen banners when push subscribed', () => {
  const hint = chatAlertsEnableHint({ permission: 'granted', push: true, reason: 'ok' });
  assert.match(hint, /banner/i);
  assert.equal(/while Evenly is open/i.test(hint), false);
});

test('alertIncomingChat falls through when the service worker never acks', async () => {
  const shown = [];
  class FakeChannel {
    constructor() {
      this.port1 = { onmessage: null };
      this.port2 = {};
    }
  }
  function FakeNotification() {
    throw new Error('should use registration.showNotification');
  }
  FakeNotification.permission = 'granted';
  await alertIncomingChat(
    { title: 'Evenly', body: 'hey', tag: 'c1' },
    {
      MessageChannel: FakeChannel,
      chatNotifyAckTimeoutMs: 20,
      navigator: {
        vibrate() {},
        serviceWorker: {
          controller: {
            postMessage() {},
          },
          ready: Promise.resolve({
            showNotification: async (title, opts) => {
              shown.push({ title, opts });
            },
          }),
        },
      },
      Notification: FakeNotification,
    },
    { readyTimeoutMs: 50 },
  );
  assert.equal(shown.length, 1);
  assert.equal(shown[0].title, 'Evenly');
  assert.equal(shown[0].opts.requireInteraction, true);
});

test('alertIncomingChat still vibrates when notification permission is denied', async () => {
  const vibrated = [];
  function FakeNotification() {
    throw new Error('should not construct');
  }
  FakeNotification.permission = 'denied';
  await alertIncomingChat(
    { title: 'Evenly', body: 'hey', tag: 'c1' },
    {
      navigator: { vibrate: (p) => vibrated.push(p) },
      Notification: FakeNotification,
    },
  );
  assert.equal(vibrated.length, 1);
});
