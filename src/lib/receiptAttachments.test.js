import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertAttachmentFile,
  buildStoragePath,
  extensionForMime,
  ATTACHMENT_MAX_BYTES,
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

test('buildStoragePath', () => {
  assert.equal(
    buildStoragePath('g', 'r', 'a', 'image/png'),
    'g/r/a.png',
  );
  assert.equal(extensionForMime('application/pdf'), 'pdf');
});
