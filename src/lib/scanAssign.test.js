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

test('buildScannedReceiptRecord attaches shares and paidById', () => {
  const rec = buildScannedReceiptRecord(
    [{ name: 'Soup', cost: 8, quantity: 1 }],
    { paidById: 'p1', sharesByIndex: { 0: { p1: 1, p2: 1 } }, taxCost: 0, tipCost: 0, discountCost: 0 },
    { displayCurrency: 'USD', now: 1, makeId: () => 'i1', allowedPersonIds: ['p1', 'p2'] },
  );
  const itemId = Object.keys(rec.items)[0];
  assert.equal(itemId, 'i1');
  assert.equal(rec.paidById, 'p1');
  assert.equal(rec.itemToPersonQuantityMap[itemId].p2, 1);
});

test('buildScannedReceiptRecord drops unknown people and bad rows', () => {
  const rec = buildScannedReceiptRecord(
    [
      { name: '  ', cost: 8, quantity: 1 },
      { name: 'Soup', cost: -1, quantity: 1 },
      { name: 'Bread', cost: 3, quantity: 1 },
    ],
    { paidById: 'ghost', sharesByIndex: { 0: { p1: 1 } } },
    { displayCurrency: 'usd', now: 9, makeId: () => 'i1', allowedPersonIds: ['p1'] },
  );
  assert.equal(rec.paidById, '');
  assert.equal(Object.keys(rec.items).length, 1);
  assert.equal(rec.items.i1.name, 'Bread');
});
