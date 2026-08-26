import test from 'node:test';
import assert from 'node:assert/strict';
import { userMessageForScanFailure } from './scanReceipt.js';

test('5xx model-gone is not "try another photo"', () => {
  const msg = userMessageForScanFailure(502, {
    error: 'This model models/gemini-3.1-flash-lite-preview is no longer available.',
  });
  assert.match(msg, /receipt scan is unavailable/i);
  assert.ok(!/another photo/i.test(msg));
});

test('4xx readable API errors pass through when they are not secrets', () => {
  assert.equal(
    userMessageForScanFailure(400, { error: 'Only image uploads are supported (e.g. JPEG, PNG), not PDF.' }),
    'Only image uploads are supported (e.g. JPEG, PNG), not PDF.',
  );
});
