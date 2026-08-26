import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MODEL,
  FALLBACK_MODELS,
  geminiModelQueue,
  isRetiredGeminiModelError,
  generateContentWithFallback,
} from './geminiScanModels.js';

test('defaults to GA 3.5 Flash-Lite, not a preview id', () => {
  assert.equal(DEFAULT_MODEL, 'gemini-3.5-flash-lite');
  assert.ok(!DEFAULT_MODEL.includes('preview'));
  assert.deepEqual(FALLBACK_MODELS, ['gemini-3.1-flash-lite']);
});

test('queue tries preferred then default then fallbacks, no dupes', () => {
  assert.deepEqual(geminiModelQueue(undefined), [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
  ]);
  assert.deepEqual(geminiModelQueue('gemini-3.5-flash-lite'), [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
  ]);
  assert.deepEqual(geminiModelQueue('gemini-3.1-flash-lite-preview'), [
    'gemini-3.1-flash-lite-preview',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
  ]);
});

test('retired model: 404 and NOT_FOUND / no longer available', () => {
  assert.equal(isRetiredGeminiModelError(404, {}), true);
  assert.equal(
    isRetiredGeminiModelError(400, {
      error: { status: 'NOT_FOUND', message: 'models/x is no longer available' },
    }),
    true,
  );
  assert.equal(
    isRetiredGeminiModelError(502, { error: { message: 'safety filter' } }),
    false,
  );
  assert.equal(isRetiredGeminiModelError(429, { error: { status: 'RESOURCE_EXHAUSTED' } }), false);
});

test('fallback fetch: skip retired model, succeed on next', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (url.includes('gemini-3.1-flash-lite-preview')) {
      return {
        ok: false,
        status: 404,
        json: async () => ({
          error: {
            code: 404,
            status: 'NOT_FOUND',
            message: 'This model models/gemini-3.1-flash-lite-preview is no longer available.',
          },
        }),
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }),
    };
  };

  const result = await generateContentWithFallback({
    fetchImpl,
    apiKey: 'k',
    models: geminiModelQueue('gemini-3.1-flash-lite-preview'),
    requestBody: { contents: [] },
  });

  assert.equal(result.ok, true);
  assert.equal(result.model, 'gemini-3.5-flash-lite');
  assert.equal(calls.length, 2);
  assert.match(calls[0], /gemini-3\.1-flash-lite-preview/);
  assert.match(calls[1], /gemini-3\.5-flash-lite/);
});

test('does not fallback on non-404 Gemini errors', async () => {
  let n = 0;
  const fetchImpl = async () => {
    n += 1;
    return {
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'Invalid image' } }),
    };
  };

  const result = await generateContentWithFallback({
    fetchImpl,
    apiKey: 'k',
    models: ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'],
    requestBody: { contents: [] },
  });

  assert.equal(result.ok, false);
  assert.equal(n, 1);
  assert.equal(result.status, 400);
  assert.equal(result.errorMessage, 'Invalid image');
});
