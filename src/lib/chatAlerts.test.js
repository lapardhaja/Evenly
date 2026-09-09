import test from 'node:test';
import assert from 'node:assert/strict';
import {
  incomingChatPreview,
  parseIncomingChatMessage,
  shouldAlertIncomingChat,
  alertIncomingChat,
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

test('alertIncomingChat vibrates and posts a notification when allowed', () => {
  const vibrated = [];
  const created = [];
  function FakeNotification(title, opts) {
    created.push({ title, opts });
  }
  FakeNotification.permission = 'granted';
  alertIncomingChat(
    { title: 'Evenly', body: 'hey', tag: 'c1' },
    {
      navigator: { vibrate: (p) => vibrated.push(p) },
      Notification: FakeNotification,
    },
  );
  assert.deepEqual(vibrated[0], [40, 60, 40]);
  assert.equal(created.length, 1);
  assert.equal(created[0].title, 'Evenly');
  assert.equal(created[0].opts.body, 'hey');
  assert.equal(created[0].opts.silent, false);
});

test('alertIncomingChat still vibrates when notification permission is denied', () => {
  const vibrated = [];
  function FakeNotification() {
    throw new Error('should not construct');
  }
  FakeNotification.permission = 'denied';
  alertIncomingChat(
    { title: 'Evenly', body: 'hey', tag: 'c1' },
    {
      navigator: { vibrate: (p) => vibrated.push(p) },
      Notification: FakeNotification,
    },
  );
  assert.equal(vibrated.length, 1);
});
