import { describe, it } from 'node:test';
import assert from 'node:assert';

/** Same parsing as applySupabaseSessionFromHash (path + query in hash) */
function extractTokensFromAppHash(fullHash) {
  const q = fullHash.indexOf('?');
  if (q < 0) return null;
  const params = new URLSearchParams(fullHash.slice(q + 1));
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token };
}

describe('supabaseRecoveryFromHash parsing', () => {
  it('parses HashRouter recovery URL', () => {
    const h =
      '#/reset-password?access_token=atok&refresh_token=rtok&type=recovery&expires_in=3600&token_type=bearer';
    const t = extractTokensFromAppHash(h);
    assert.deepStrictEqual(t, { access_token: 'atok', refresh_token: 'rtok' });
  });

  it('returns null when no query', () => {
    assert.strictEqual(extractTokensFromAppHash('#/reset-password'), null);
  });
});
