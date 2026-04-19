import test from 'node:test';
import assert from 'node:assert/strict';
import { transferStorageKey, normalizeStoredSettledKeys } from './settledTransfersKey.js';

test('transferStorageKey uses tabs and rounds amount', () => {
  const k = transferStorageKey({ from: 'a', to: 'b', amount: 14.333 });
  assert.equal(k, 'a\tb\t14.33');
});

test('normalizeStoredSettledKeys maps legacy hyphen key when UUIDs match', () => {
  const uuid1 = '11111111-1111-1111-1111-111111111111';
  const uuid2 = '22222222-2222-2222-2222-222222222222';
  const transfers = [{ from: uuid1, to: uuid2, amount: 14.33 }];
  const legacy = `${uuid1}-${uuid2}-14.33`;
  const out = normalizeStoredSettledKeys([legacy], transfers);
  assert.equal(out.length, 1);
  assert.equal(out[0], transferStorageKey(transfers[0]));
});
