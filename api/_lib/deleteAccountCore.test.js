import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DELETE_ACCOUNT_CONFIRM,
  assertDeleteAccountRequest,
  collectChatImagePaths,
  chunkPaths,
  deleteAccountWithAdmin,
} from './deleteAccountCore.js';

test('delete confirm is exact DELETE', () => {
  assert.equal(DELETE_ACCOUNT_CONFIRM, 'DELETE');
  assert.equal(assertDeleteAccountRequest({ confirm: 'DELETE' }).ok, true);
  assert.equal(assertDeleteAccountRequest({ confirm: 'delete' }).ok, false);
  assert.equal(assertDeleteAccountRequest({}).ok, false);
});

test('collectChatImagePaths reads payload.storage_path', () => {
  const paths = collectChatImagePaths([
    { payload: { storage_path: 'c1/m1.jpg' } },
    { payload: {} },
    { payload: null },
  ]);
  assert.deepEqual(paths, ['c1/m1.jpg']);
});

test('chunkPaths splits storage deletes', () => {
  assert.deepEqual(chunkPaths(['a', 'b', 'c'], 2), [['a', 'b'], ['c']]);
});

test('deleteAccountWithAdmin deletes the Auth user before storage remove', async () => {
  const order = [];
  const admin = {
    from(table) {
      return {
        select() {
          return {
            eq() {
              if (table === 'groups') {
                return { data: [{ id: 'g1' }] };
              }
              return {
                eq() {
                  return { data: [{ payload: { storage_path: 'c/m.jpg' } }] };
                },
              };
            },
            in() {
              return { data: [{ storage_path: 'g1/r/a.jpg' }] };
            },
          };
        },
      };
    },
    auth: {
      admin: {
        async deleteUser(id) {
          order.push(`user:${id}`);
          return { error: null };
        },
      },
    },
    storage: {
      from(bucket) {
        return {
          async remove(paths) {
            order.push(`${bucket}:${paths.join(',')}`);
            return { error: null };
          },
        };
      },
    },
  };
  await deleteAccountWithAdmin(admin, 'user-1');
  assert.equal(order[0], 'user:user-1');
  assert.ok(order.includes('receipt-attachments:g1/r/a.jpg'));
  assert.ok(order.includes('chat-attachments:c/m.jpg'));
});
