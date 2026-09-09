import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyChatOpenMessage,
  applyShowNotificationMessage,
  parsePushEventData,
  shouldShowChatPush,
  chatNotificationClickUrl,
} from './chatPushSw.js';

test('applyChatOpenMessage stores the open thread', () => {
  const next = applyChatOpenMessage({ openConversationId: 'old' }, {
    type: 'evenly-chat-open',
    conversationId: 'c1',
  });
  assert.equal(next.openConversationId, 'c1');
});

test('applyShowNotificationMessage reads title and options', () => {
  const payload = applyShowNotificationMessage({
    type: 'evenly-show-notification',
    title: 'Evenly',
    options: { body: 'hey', tag: 'c1' },
  });
  assert.deepEqual(payload, { title: 'Evenly', options: { body: 'hey', tag: 'c1' } });
  assert.equal(applyShowNotificationMessage({ type: 'evenly-chat-open' }), null);
});

test('applyChatOpenMessage ignores other messages', () => {
  const prev = { openConversationId: 'c1' };
  assert.equal(applyChatOpenMessage(prev, { type: 'other' }), prev);
});

test('shouldShowChatPush is true when the app is closed', () => {
  assert.equal(
    shouldShowChatPush(
      { openConversationId: 'c1' },
      { conversationId: 'c1', windowClients: [] },
    ),
    true,
  );
});

test('shouldShowChatPush is true when a different thread is focused', () => {
  assert.equal(
    shouldShowChatPush(
      { openConversationId: 'c1' },
      {
        conversationId: 'c2',
        windowClients: [{ focused: true, visibilityState: 'visible' }],
      },
    ),
    true,
  );
});

test('shouldShowChatPush is false when that thread is focused and visible', () => {
  assert.equal(
    shouldShowChatPush(
      { openConversationId: 'c1' },
      {
        conversationId: 'c1',
        windowClients: [{ focused: true, visibilityState: 'visible' }],
      },
    ),
    false,
  );
});

test('shouldShowChatPush is true when the thread is open but the PWA is backgrounded', () => {
  assert.equal(
    shouldShowChatPush(
      { openConversationId: 'c1' },
      {
        conversationId: 'c1',
        windowClients: [{ focused: false, visibilityState: 'hidden' }],
      },
    ),
    true,
  );
});

test('parsePushEventData reads json payload', () => {
  const data = parsePushEventData({
    json: () => ({
      title: 'Amanda',
      body: 'hey',
      conversationId: 'c1',
      path: '#/chat/c1',
    }),
  });
  assert.equal(data.title, 'Amanda');
  assert.equal(data.body, 'hey');
  assert.equal(data.conversationId, 'c1');
  assert.equal(data.path, '#/chat/c1');
});

test('parsePushEventData falls back when payload is empty', () => {
  const data = parsePushEventData(null);
  assert.equal(data.title, 'Evenly');
  assert.equal(data.body, 'New message');
  assert.equal(data.path, '#/chat');
});

test('chatNotificationClickUrl uses the origin plus hash route', () => {
  assert.equal(
    chatNotificationClickUrl('https://evenly.example', '#/chat/c1'),
    'https://evenly.example/#/chat/c1',
  );
});
