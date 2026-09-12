import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertChatFile,
  assertChatImageFile,
  assertChatAudioFile,
  buildChatImageStoragePath,
  classifyChatAttachment,
  chatNonTextPreview,
  formatChatByteSize,
  inferChatFileMime,
  isAudioMessage,
  isFileMessage,
  parseAudioPayload,
  parseFilePayload,
  parseImagePayload,
  isImageMessage,
  sanitizeChatFileName,
  summarizeLikes,
  toggleLikeState,
  applyLikeRealtime,
  CHAT_IMAGE_MAX_BYTES,
  CHAT_SIGNED_URL_TTL_SECONDS,
} from './chatMedia.js';

test('chat photo signed URLs expire in 10 minutes', () => {
  assert.equal(CHAT_SIGNED_URL_TTL_SECONDS, 600);
});

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

test('voice notes are classified as audio and do not collide with images', () => {
  assert.equal(classifyChatAttachment({ type: 'audio/webm', name: 'voice.webm', size: 10 }), 'audio');
  assert.equal(classifyChatAttachment({ type: 'audio/mp4', name: 'voice.m4a', size: 10 }), 'audio');
  const audioMsg = {
    type: 'audio',
    payload: { storage_path: 'c/m.webm', mime_type: 'audio/webm', duration_ms: 1500 },
  };
  assert.equal(isAudioMessage(audioMsg), true);
  assert.equal(isImageMessage(audioMsg), false);
  assert.equal(isFileMessage(audioMsg), false);
  assert.equal(parseAudioPayload(audioMsg.payload).duration_ms, 1500);
  assert.equal(chatNonTextPreview('audio'), 'Sent a voice message');
  assert.doesNotThrow(() => assertChatAudioFile({ type: 'audio/webm', name: 'voice.webm', size: 20 }));
  assert.throws(() => assertChatAudioFile({ type: 'application/pdf', name: 'a.pdf', size: 20 }));
});

test('documents are classified as file attachments', () => {
  assert.equal(classifyChatAttachment({ type: 'application/pdf', name: 'a.pdf', size: 10 }), 'file');
  assert.equal(classifyChatAttachment({ type: 'image/png', name: 'a.png', size: 10 }), 'image');
  assert.equal(inferChatFileMime({ type: '', name: 'notes.docx' }), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  assert.doesNotThrow(() => assertChatFile({ type: 'application/pdf', name: 'a.pdf', size: 20 }));
  assert.throws(() => assertChatFile({ type: 'image/jpeg', name: 'a.jpg', size: 20 }));
});

test('file payload and isImageMessage do not collide', () => {
  const fileMsg = {
    type: 'file',
    payload: { storage_path: 'c/m.pdf', mime_type: 'application/pdf', file_name: 'bill.pdf' },
  };
  assert.equal(isFileMessage(fileMsg), true);
  assert.equal(isImageMessage(fileMsg), false);
  assert.equal(parseFilePayload(fileMsg.payload).file_name, 'bill.pdf');
  assert.equal(sanitizeChatFileName('../../x.pdf'), 'x.pdf');
  assert.equal(formatChatByteSize(2048), '2 KB');
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
