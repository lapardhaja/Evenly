import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeItemName,
  personMatchKey,
  everyoneShares,
  justMeShares,
  matchLastItemShares,
  applyLastReceipt,
  quantityMapsFromIndexedItems,
  buildScannedReceiptRecord,
} from './scanAssign.js';

test('normalizeItemName collapses case and space', () => {
  assert.equal(normalizeItemName('  Pad  Thai '), 'pad thai');
});

test('personMatchKey prefers linkedUserId', () => {
  assert.equal(personMatchKey({ id: 'p1', name: 'Alex', linkedUserId: 'u1' }), 'u:u1');
  assert.equal(personMatchKey({ id: 'p1', name: 'Alex' }), 'n:alex');
});

test('everyoneShares and justMeShares', () => {
  assert.deepEqual(everyoneShares(['a', 'b']), { a: 1, b: 1 });
  assert.deepEqual(justMeShares('a'), { a: 1 });
});

test('matchLastItemShares remaps by linked user then name', () => {
  const shares = matchLastItemShares({
    lastSharesByPersonKey: { 'u:u1': 1, 'n:sam': 1 },
    newPeople: [
      { id: 'np1', name: 'Alex', linkedUserId: 'u1' },
      { id: 'np2', name: 'Sam' },
    ],
  });
  assert.deepEqual(shares, { np1: 1, np2: 1 });
});

test('applyLastReceipt copies shares for renamed-id same-name items', () => {
  const lastReceipt = {
    items: { old: { name: 'Pad Thai', quantity: 1 } },
    itemToPersonQuantityMap: { old: { op1: 1 } },
    people: [{ id: 'op1', name: 'Alex', linkedUserId: 'u1' }],
  };
  const got = applyLastReceipt({
    lastReceipt,
    newItems: [{ name: 'pad thai', quantity: 1 }],
    newPeople: [{ id: 'np1', name: 'ALEX', linkedUserId: 'u1' }],
  });
  assert.deepEqual(got, { 0: { np1: 1 } });
});

test('quantityMapsFromIndexedItems writes both maps', () => {
  const maps = quantityMapsFromIndexedItems(
    [{ id: 'i1' }, { id: 'i2' }],
    { 0: { p1: 1 }, 1: { p1: 1, p2: 1 } },
  );
  assert.equal(maps.itemToPersonQuantityMap.i1.p1, 1);
  assert.equal(maps.personToItemQuantityMap.p2.i2, 1);
});
