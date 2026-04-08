import { describe, it } from 'node:test';
import assert from 'node:assert';
import { extractAuthParamsFromWindow } from './supabaseRecoveryFromHash.js';

describe('supabaseRecoveryFromHash', () => {
  it('parses ? query after path in hash', () => {
    globalThis.window = {
      location: {
        hash: '#/reset-password?access_token=atok&refresh_token=rtok&type=recovery',
        search: '',
      },
    };
    const p = extractAuthParamsFromWindow();
    assert.strictEqual(p.access_token, 'atok');
    assert.strictEqual(p.refresh_token, 'rtok');
    delete globalThis.window;
  });

  it('parses & after path (no ?) — common Supabase redirect shape', () => {
    globalThis.window = {
      location: {
        hash: '#/reset-password&access_token=atok&refresh_token=rtok&type=recovery',
        search: '',
      },
    };
    const p = extractAuthParamsFromWindow();
    assert.strictEqual(p.access_token, 'atok');
    assert.strictEqual(p.refresh_token, 'rtok');
    delete globalThis.window;
  });

  it('merges search params (e.g. ?code= for PKCE on path)', () => {
    globalThis.window = {
      location: {
        hash: '#/reset-password',
        search: '?code=abc123',
      },
    };
    const p = extractAuthParamsFromWindow();
    assert.strictEqual(p.code, 'abc123');
    delete globalThis.window;
  });
});
