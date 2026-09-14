import test from 'node:test';
import assert from 'node:assert/strict';
import { canPreviewAttachmentInline } from './attachmentPreview.js';

test('canPreviewAttachmentInline is any image including iPhone HEIC', () => {
  assert.equal(canPreviewAttachmentInline('image/jpeg'), true);
  assert.equal(canPreviewAttachmentInline('image/png'), true);
  assert.equal(canPreviewAttachmentInline('image/webp'), true);
  assert.equal(canPreviewAttachmentInline('image/heic'), true);
  assert.equal(canPreviewAttachmentInline('image/heif'), true);
  assert.equal(canPreviewAttachmentInline('IMAGE/HEIC'), true);
  assert.equal(canPreviewAttachmentInline('application/pdf'), false);
  assert.equal(canPreviewAttachmentInline(''), false);
  assert.equal(canPreviewAttachmentInline(null), false);
});
