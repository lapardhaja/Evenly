import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertChatImageFile,
  buildChatImageStoragePath,
  parseImagePayload,
  isImageMessage,
  summarizeLikes,
  toggleLikeState,
  applyLikeRealtime,
  CHAT_IMAGE_MAX_BYTES,
} from './chatMedia.js';

test('buildChatImageStoragePath is conversation/message.ext', () => {
  assert.equal(
    buildChatImageStoragePath('c1', 'm1', 'image/png'),
    'c1/m1.png',
  );
});

test('assertChatImageFile rejects non-images and oversize', () => {
  assert.doesNotThrow(() => assertChatImageFile({ type: 'image/jpeg', size: 1000 }));
  assert.throws(() => assertChatImageFile({ type: 'application/pdf', size: 10 }));
  assert.throws(() =>
    assertChatImageFile({ type: 'image/jpeg', size: CHAT_IMAGE_MAX_BYTES + 1 }),
  );
});

test('parseImagePayload needs a storage path', () => {
  assert.equal(parseImagePayload(null), null);
  const p = parseImagePayload({ storage_path: 'c/m.jpg', mime_type: 'image/jpeg', width: 800, height: 600 });
  assert.equal(p.storage_path, 'c/m.jpg');
  assert.equal(p.width, 800);
});

test('isImageMessage is true for type image', () => {
  assert.equal(isImageMessage({ type: 'image', payload: { storage_path: 'c/m.jpg' } }), true);
  assert.equal(isImageMessage({ type: 'text', body: 'hi' }), false);
});

test('summarizeLikes counts and flags mine', () => {
  const map = summarizeLikes(
    [
      { message_id: 'm1', user_id: 'me' },
      { message_id: 'm1', user_id: 'u2' },
      { message_id: 'm2', user_id: 'u2' },
    ],
    'me',
  );
  assert.deepEqual(map.get('m1'), { count: 2, mine: true });
  assert.deepEqual(map.get('m2'), { count: 1, mine: false });
});

test('toggleLikeState is optimistic', () => {
  const empty = new Map();
  const liked = toggleLikeState(empty, 'm1', 'me', true);
  assert.deepEqual(liked.get('m1'), { count: 1, mine: true });
  const unliked = toggleLikeState(liked, 'm1', 'me', false);
  assert.equal(unliked.has('m1'), false);
});

test('applyLikeRealtime ignores other threads and skips duplicate self-insert', () => {
  const known = new Set(['m1']);
  const mine = new Map([['m1', { count: 1, mine: true }]]);
  assert.equal(
    applyLikeRealtime(
      mine,
      { eventType: 'INSERT', new: { message_id: 'm1', user_id: 'me' } },
      'me',
      known,
    ),
    mine,
  );
  const other = applyLikeRealtime(
    mine,
    { eventType: 'INSERT', new: { message_id: 'm9', user_id: 'u2' } },
    'me',
    known,
  );
  assert.equal(other, mine);
  const added = applyLikeRealtime(
    new Map(),
    { eventType: 'INSERT', new: { message_id: 'm1', user_id: 'u2' } },
    'me',
    known,
  );
  assert.deepEqual(added.get('m1'), { count: 1, mine: false });
  const gone = applyLikeRealtime(
    added,
    { eventType: 'DELETE', old: { message_id: 'm1', user_id: 'u2' } },
    'me',
    known,
  );
  assert.equal(gone.has('m1'), false);
});
