import test from 'node:test';
import assert from 'node:assert/strict';
import { transferStorageKey, normalizeStoredSettledKeys } from './settledTransfersKey.js';

test('transferStorageKey is pair-only (no amount)', () => {
  const k = transferStorageKey({ from: 'a', to: 'b', amount: 99.99 });
  assert.equal(k, 'a\tb');
});

test('same pair matches even if amount changes (FX / rounding)', () => {
  const uuid1 = '11111111-1111-1111-1111-111111111111';
  const uuid2 = '22222222-2222-2222-2222-222222222222';
  const stored = [`${uuid1}\t${uuid2}`];
  const transfersNew = [{ from: uuid1, to: uuid2, amount: 14.32 }];
  const out = normalizeStoredSettledKeys(stored, transfersNew);
  assert.equal(out.length, 1);
  assert.equal(out[0], transferStorageKey(transfersNew[0]));
});

test('migrates old tab key with amount to pair key', () => {
  const uuid1 = '11111111-1111-1111-1111-111111111111';
  const uuid2 = '22222222-2222-2222-2222-222222222222';
  const oldKey = `${uuid1}\t${uuid2}\t14.33`;
  const transfers = [{ from: uuid1, to: uuid2, amount: 14.32 }];
  const out = normalizeStoredSettledKeys([oldKey], transfers);
  assert.equal(out[0], `${uuid1}\t${uuid2}`);
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
