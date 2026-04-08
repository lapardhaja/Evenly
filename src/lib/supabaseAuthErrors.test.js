import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  classifySignUpResponse,
  formatSignUpError,
  formatSignInError,
} from './supabaseAuthErrors.js';

describe('supabaseAuthErrors', () => {
  it('classifySignUpResponse: session means logged in', () => {
    assert.strictEqual(
      classifySignUpResponse({ session: {}, user: { identities: [] } }),
      'logged_in',
    );
  });

  it('classifySignUpResponse: identities mean awaiting confirmation', () => {
    assert.strictEqual(
      classifySignUpResponse({ session: null, user: { identities: [{ provider: 'email' }] } }),
      'awaiting_confirmation',
    );
  });

  it('classifySignUpResponse: empty identities + no session means duplicate (obfuscated)', () => {
    assert.strictEqual(
      classifySignUpResponse({ session: null, user: { identities: [] } }),
      'likely_already_registered',
    );
  });

  it('detects email already registered on sign up', () => {
    const r = formatSignUpError({ message: 'User already registered', code: '' });
    assert.strictEqual(r.isEmailTaken, true);
    assert.match(r.message, /already has an account/i);
  });

  it('maps user_already_exists code', () => {
    const r = formatSignUpError({ message: 'x', code: 'user_already_exists' });
    assert.strictEqual(r.isEmailTaken, true);
  });

  it('sign in keeps invalid credentials generic', () => {
    const m = formatSignInError({ message: 'Invalid login credentials', code: 'invalid_credentials' });
    assert.match(m, /incorrect email or password/i);
    assert.ok(!/not found/i.test(m));
  });
});
