import { describe, it } from 'node:test';
import assert from 'node:assert';
import { extractAuthParamsFromWindow, parseHashForAuth } from './supabaseAuthCallback.js';

describe('supabaseAuthCallback', () => {
  it('parses hash with ? tokens', () => {
    globalThis.window = {
      location: {
        hash: '#/update-password?access_token=a&refresh_token=r',
        search: '',
      },
    };
    const p = extractAuthParamsFromWindow();
    assert.strictEqual(p.access_token, 'a');
    assert.strictEqual(p.refresh_token, 'r');
    delete globalThis.window;
  });

  it('parses hash with & tokens after path', () => {
    globalThis.window = {
      location: {
        hash: '#/update-password&access_token=a&refresh_token=r',
        search: '',
      },
    };
    const p = extractAuthParamsFromWindow();
    assert.strictEqual(p.access_token, 'a');
    assert.strictEqual(p.refresh_token, 'r');
    delete globalThis.window;
  });

  it('parses double-hash GoTrue redirect (route#tokens)', () => {
    const p = parseHashForAuth('#/update-password#access_token=a&refresh_token=r&type=recovery');
    assert.strictEqual(p.access_token, 'a');
    assert.strictEqual(p.refresh_token, 'r');
    assert.strictEqual(p.type, 'recovery');
  });

  it('merges query string (token_hash flow)', () => {
    globalThis.window = {
      location: {
        hash: '',
        search: '?token_hash=th&type=recovery',
      },
    };
    const p = extractAuthParamsFromWindow();
    assert.strictEqual(p.token_hash, 'th');
    assert.strictEqual(p.type, 'recovery');
    delete globalThis.window;
  });
});
