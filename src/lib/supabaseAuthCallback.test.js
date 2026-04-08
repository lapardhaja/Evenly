import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseHashForAuth, extractAuthParamsFromWindow } from './supabaseAuthCallback.js';

describe('supabaseAuthCallback', () => {
  it('parses ?query in hash', () => {
    const p = parseHashForAuth('#/update-password?access_token=a&refresh_token=r');
    assert.strictEqual(p.access_token, 'a');
    assert.strictEqual(p.refresh_token, 'r');
  });

  it('parses & after path', () => {
    const p = parseHashForAuth('#/update-password&access_token=a&refresh_token=r');
    assert.strictEqual(p.access_token, 'a');
    assert.strictEqual(p.refresh_token, 'r');
  });

  it('parses double-hash fragment', () => {
    const p = parseHashForAuth('#/update-password#access_token=a&refresh_token=r&type=recovery');
    assert.strictEqual(p.access_token, 'a');
    assert.strictEqual(p.refresh_token, 'r');
  });

  it('extractAuthParamsFromWindow merges search', () => {
    globalThis.window = {
      location: { hash: '', search: '?token_hash=th&type=recovery' },
    };
    const p = extractAuthParamsFromWindow();
    assert.strictEqual(p.token_hash, 'th');
    assert.strictEqual(p.type, 'recovery');
    delete globalThis.window;
  });
});
