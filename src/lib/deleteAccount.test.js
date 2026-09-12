import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DELETE_ACCOUNT_CONFIRM,
  canSubmitAccountDeletion,
  requestAccountDeletion,
} from './deleteAccount.js';

test('canSubmitAccountDeletion requires DELETE', () => {
  assert.equal(canSubmitAccountDeletion('DELETE'), true);
  assert.equal(canSubmitAccountDeletion(' DELETE '), true);
  assert.equal(canSubmitAccountDeletion('delete'), false);
  assert.equal(canSubmitAccountDeletion(''), false);
});

test('requestAccountDeletion POSTs bearer + confirm', async () => {
  const calls = [];
  await requestAccountDeletion({
    accessToken: 'tok',
    confirm: DELETE_ACCOUNT_CONFIRM,
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return { status: 204, ok: true };
    },
  });
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/api\/delete-account$/);
  assert.equal(calls[0].init.headers.Authorization, 'Bearer tok');
  assert.equal(JSON.parse(calls[0].init.body).confirm, 'DELETE');
});

test('requestAccountDeletion maps 429', async () => {
  await assert.rejects(
    () =>
      requestAccountDeletion({
        accessToken: 'tok',
        confirm: 'DELETE',
        fetchImpl: async () => ({ status: 429, ok: false }),
      }),
    /too many attempts/i,
  );
});
