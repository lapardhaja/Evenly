import test from 'node:test';
import assert from 'node:assert/strict';
import { sessionAfterAuthEvent } from './authSession.js';

test('SIGNED_OUT clears the session', () => {
  assert.equal(sessionAfterAuthEvent('SIGNED_OUT', null, { id: 'u1' }), null);
});

test('a session-bearing event replaces the previous session', () => {
  const next = { user: { id: 'u2' } };
  assert.equal(sessionAfterAuthEvent('SIGNED_IN', next, null), next);
  assert.equal(sessionAfterAuthEvent('INITIAL_SESSION', next, null), next);
  assert.equal(sessionAfterAuthEvent('TOKEN_REFRESHED', next, { user: { id: 'u1' } }), next);
});

test('null INITIAL_SESSION does not wipe a session getSession already restored', () => {
  const prev = { user: { id: 'u1' } };
  assert.equal(sessionAfterAuthEvent('INITIAL_SESSION', null, prev), prev);
});

test('null SIGNED_IN without a previous session stays signed out', () => {
  assert.equal(sessionAfterAuthEvent('SIGNED_IN', null, null), null);
});
