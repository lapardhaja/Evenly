import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertAttachmentFile,
  buildStoragePath,
  extensionForMime,
  inferAttachmentMime,
  ATTACHMENT_MAX_BYTES,
  SIGNED_URL_REFRESH_MS,
  SIGNED_URL_TTL_SECONDS,
} from './receiptAttachments.js';

test('assertAttachmentFile accepts jpeg under cap', () => {
  assert.doesNotThrow(() =>
    assertAttachmentFile({ type: 'image/jpeg', size: 1000, name: 'a.jpg' }),
  );
});

test('assertAttachmentFile rejects pdf oversize and bad mime', () => {
  assert.throws(() =>
    assertAttachmentFile({ type: 'application/pdf', size: ATTACHMENT_MAX_BYTES + 1, name: 'a.pdf' }),
  );
  assert.throws(() =>
    assertAttachmentFile({ type: 'text/plain', size: 10, name: 'a.txt' }),
  );
});

test('inferAttachmentMime uses extension when iOS sends octet-stream', () => {
  assert.equal(inferAttachmentMime({ type: 'image/heic', name: 'IMG_1.HEIC' }), 'image/heic');
  assert.equal(
    inferAttachmentMime({ type: 'application/octet-stream', name: 'IMG_1.heic' }),
    'image/heic',
  );
  assert.equal(inferAttachmentMime({ type: 'application/octet-stream', name: 'scan.PDF' }), 'application/pdf');
  assert.doesNotThrow(() =>
    assertAttachmentFile({ type: 'application/octet-stream', size: 1000, name: 'IMG_1.heic' }),
  );
});

test('signed URL refresh is inside the TTL window', () => {
  assert.equal(SIGNED_URL_TTL_SECONDS, 120);
  assert.equal(SIGNED_URL_REFRESH_MS, 90_000);
  assert.ok(SIGNED_URL_REFRESH_MS < SIGNED_URL_TTL_SECONDS * 1000);
});

test('buildStoragePath', () => {
  assert.equal(
    buildStoragePath('g', 'r', 'a', 'image/png'),
    'g/r/a.png',
  );
  assert.equal(extensionForMime('application/pdf'), 'pdf');
});
