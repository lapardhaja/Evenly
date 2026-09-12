import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildChatPushPayload,
  recipientUserIds,
  isGonePushStatus,
  bearerToken,
  vapidReady,
} from './chatPushCore.js';

test('recipientUserIds drops the sender', () => {
  assert.deepEqual(
    recipientUserIds(['a', 'b', 'c'], 'b'),
    ['a', 'c'],
  );
});

test('buildChatPushPayload uses sender name and message preview', () => {
  const p = buildChatPushPayload({
    senderName: 'Amanda Henman',
    message: { conversation_id: 'c1', type: 'text', body: 'on my way' },
  });
  assert.equal(p.title, 'Amanda Henman');
  assert.equal(p.body, 'on my way');
  assert.equal(p.tag, 'c1');
  assert.equal(p.conversationId, 'c1');
  assert.equal(p.path, '#/chat/c1');
});

test('buildChatPushPayload labels photos', () => {
  const p = buildChatPushPayload({
    senderName: 'Sam',
    message: { conversation_id: 'c3', type: 'image', body: '' },
  });
  assert.equal(p.body, 'Sent a photo');
});

test('isGonePushStatus treats 404/410 as drop subscription', () => {
  assert.equal(isGonePushStatus(410), true);
  assert.equal(isGonePushStatus(404), true);
  assert.equal(isGonePushStatus(201), false);
});

test('bearerToken reads Authorization header', () => {
  assert.equal(bearerToken({ headers: { authorization: 'Bearer abc.def' } }), 'abc.def');
  assert.equal(bearerToken({ headers: {} }), '');
});

test('vapidReady requires public, private, and subject', () => {
  assert.equal(vapidReady({}), false);
  assert.equal(
    vapidReady({
      VAPID_PUBLIC_KEY: 'pub',
      VAPID_PRIVATE_KEY: 'priv',
      VAPID_SUBJECT: 'mailto:a@b.c',
    }),
    true,
  );
});
