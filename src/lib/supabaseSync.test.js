import test from 'node:test';
import assert from 'node:assert/strict';
import { persistNormalizedData, removeStoredAttachments } from './supabaseSync.js';

test('removeStoredAttachments skips storage remove when no paths', async () => {
  const removed = [];
  const supabase = {
    from() {
      return {
        select() {
          return {
            eq: async () => ({ data: [], error: null }),
          };
        },
      };
    },
    storage: {
      from() {
        return {
          remove: async (paths) => {
            removed.push(...paths);
            return { error: null };
          },
        };
      },
    },
  };
  await removeStoredAttachments(supabase, { receiptId: 'r1' });
  assert.deepEqual(removed, []);
});

test('removeStoredAttachments selects by receipt_id then removes storage_path values', async () => {
  const removed = [];
  let eqCol;
  let eqVal;
  const supabase = {
    from(table) {
      assert.equal(table, 'receipt_attachments');
      return {
        select(cols) {
          assert.equal(cols, 'storage_path');
          return {
            eq: async (col, val) => {
              eqCol = col;
              eqVal = val;
              return {
                data: [
                  { storage_path: 'g/r/a.jpg' },
                  { storage_path: null },
                  { storage_path: 'g/r/b.pdf' },
                ],
                error: null,
              };
            },
          };
        },
      };
    },
    storage: {
      from(bucket) {
        assert.equal(bucket, 'receipt-attachments');
        return {
          remove: async (paths) => {
            removed.push(...paths);
            return { error: null };
          },
        };
      },
    },
  };
  await removeStoredAttachments(supabase, { receiptId: 'rid' });
  assert.equal(eqCol, 'receipt_id');
  assert.equal(eqVal, 'rid');
  assert.deepEqual(removed, ['g/r/a.jpg', 'g/r/b.pdf']);
});

test('removeStoredAttachments selects by group_id for whole-group deletes', async () => {
  let eqCol;
  const supabase = {
    from() {
      return {
        select() {
          return {
            eq: async (col) => {
              eqCol = col;
              return { data: [{ storage_path: 'g/x/y.jpg' }], error: null };
            },
          };
        },
      };
    },
    storage: {
      from() {
        return {
          remove: async () => ({ error: null }),
        };
      },
    },
  };
  await removeStoredAttachments(supabase, { groupId: 'gid' });
  assert.equal(eqCol, 'group_id');
});

test('persistNormalizedData removes storage before deleting a receipt', async () => {
  const events = [];
  const supabase = {
    from(table) {
      const builder = {
        select() {
          return builder;
        },
        in() {
          return builder;
        },
        eq(col, val) {
          builder._eq = [col, val];
          return builder;
        },
        then(resolve, reject) {
          return Promise.resolve()
            .then(() => {
              if (table === 'group_members') {
                return { data: [{ group_id: 'g1', role: 'owner' }], error: null };
              }
              if (table === 'group_people') {
                return { data: [], error: null };
              }
              if (table === 'receipts' && builder._selecting !== 'delete') {
                return { data: [{ id: 'old-receipt' }], error: null };
              }
              if (table === 'receipt_attachments') {
                events.push(`select-attachments:${builder._eq?.[0]}=${builder._eq?.[1]}`);
                return { data: [{ storage_path: 'g1/old-receipt/att.jpg' }], error: null };
              }
              if (table === 'receipt_items') {
                return { data: [], error: null };
              }
              return { data: [], error: null };
            })
            .then(resolve, reject);
        },
        delete() {
          events.push(`delete:${table}:${builder._eq?.[1] ?? ''}`);
          const del = {
            eq(col, val) {
              events.push(`delete:${table}:${val}`);
              return Promise.resolve({ error: null });
            },
          };
          return del;
        },
        update() {
          return {
            eq: async () => ({ error: null }),
          };
        },
        insert: async () => ({ error: null }),
        upsert: async () => ({ error: null }),
      };
      builder.select = (cols) => {
        builder._cols = cols;
        return builder;
      };
      return builder;
    },
    storage: {
      from() {
        return {
          remove: async (paths) => {
            events.push(`storage-remove:${paths.join(',')}`);
            return { error: null };
          },
        };
      },
    },
  };

  await persistNormalizedData(supabase, 'user-1', {
    groups: {
      g1: {
        name: 'Trip',
        date: 1,
        displayCurrency: 'USD',
        settledTransfers: [],
        people: {},
        receipts: {},
      },
    },
  });

  const attIdx = events.findIndex((e) => e.startsWith('select-attachments:receipt_id='));
  const storageIdx = events.indexOf('storage-remove:g1/old-receipt/att.jpg');
  const deleteIdx = events.findIndex((e) => e === 'delete:receipts:old-receipt');
  assert.ok(attIdx >= 0, `expected attachment select, got ${events.join('|')}`);
  assert.ok(storageIdx >= 0, `expected storage remove, got ${events.join('|')}`);
  assert.ok(deleteIdx >= 0, `expected receipt delete, got ${events.join('|')}`);
  assert.ok(storageIdx < deleteIdx, 'storage must be removed before receipt row delete');
});

test('persistNormalizedData removes storage before owner deletes a group', async () => {
  const events = [];
  const supabase = {
    from(table) {
      const builder = {
        _eq: [],
        select() {
          return builder;
        },
        in() {
          return builder;
        },
        eq(col, val) {
          builder._eq = [col, val];
          return builder;
        },
        then(resolve, reject) {
          return Promise.resolve()
            .then(() => {
              if (table === 'group_members') {
                return { data: [{ group_id: 'gone', role: 'owner' }], error: null };
              }
              if (table === 'receipt_attachments') {
                events.push(`select-attachments:${builder._eq[0]}=${builder._eq[1]}`);
                return { data: [{ storage_path: 'gone/r/a.jpg' }], error: null };
              }
              return { data: [], error: null };
            })
            .then(resolve, reject);
        },
        delete() {
          return {
            eq(col, val) {
              events.push(`delete:${table}:${val}`);
              return Promise.resolve({ error: null });
            },
          };
        },
        update() {
          return { eq: async () => ({ error: null }) };
        },
        insert: async () => ({ error: null }),
        upsert: async () => ({ error: null }),
      };
      return builder;
    },
    storage: {
      from() {
        return {
          remove: async (paths) => {
            events.push(`storage-remove:${paths.join(',')}`);
            return { error: null };
          },
        };
      },
    },
  };

  await persistNormalizedData(supabase, 'user-1', { groups: {} });

  const storageIdx = events.indexOf('storage-remove:gone/r/a.jpg');
  const deleteIdx = events.indexOf('delete:groups:gone');
  assert.equal(
    events.find((e) => e.startsWith('select-attachments:')),
    'select-attachments:group_id=gone',
  );
  assert.ok(storageIdx >= 0 && deleteIdx >= 0, events.join('|'));
  assert.ok(storageIdx < deleteIdx);
});
