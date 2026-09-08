import test from 'node:test';
import assert from 'node:assert/strict';
import {
  publicSharePath,
  publicShareAbsoluteUrl,
  assertPublicSharePayload,
  publicSharePayloadToGroup,
} from './publicGroupShare.js';
import { computeNetBalances, minimizeTransfers } from '../functions/settlement.js';

test('publicSharePath is the hash-router path', () => {
  assert.equal(publicSharePath('abc-uuid'), '/share/abc-uuid');
});

test('publicShareAbsoluteUrl uses origin, pathname, and hash', () => {
  const prev = globalThis.window;
  globalThis.window = { location: { origin: 'https://app.example', pathname: '/evenly/' } };
  try {
    assert.equal(
      publicShareAbsoluteUrl('sid'),
      'https://app.example/evenly/#/share/sid',
    );
  } finally {
    globalThis.window = prev;
  }
});

test('assertPublicSharePayload rejects missing id, people, or receipts', () => {
  assert.throws(() => assertPublicSharePayload(null), /share not found/);
  assert.throws(() => assertPublicSharePayload({ id: 'x' }), /share not found/);
  assert.throws(() => assertPublicSharePayload({ id: 'x', people: [] }), /share not found/);
});

test('publicSharePayloadToGroup maps allocations so settlement splits the bill', () => {
  const payload = {
    id: 's1',
    group_id: 'g1',
    name: 'Trip',
    display_currency: 'USD',
    include_attachments: true,
    people: [
      { id: 'p1', name: 'Ann' },
      { id: 'p2', name: 'Bob' },
    ],
    receipts: [
      {
        id: 'r1',
        title: 'Dinner',
        date_ms: 1,
        paid_by_id: 'p1',
        currency_code: 'USD',
        tax_behavior: 'exclusive',
        tax_cost: 0,
        tip_cost: 0,
        discount_cost: 0,
        items: [{ id: 'i1', name: 'Pizza', cost: 10, quantity: 1, position: 0 }],
        allocations: [
          { person_id: 'p1', item_id: 'i1', quantity: 1 },
          { person_id: 'p2', item_id: 'i1', quantity: 1 },
        ],
        attachments: [{ id: 'a1', mime_type: 'image/jpeg', file_name: 'x.jpg' }],
      },
    ],
  };
  const group = publicSharePayloadToGroup(assertPublicSharePayload(payload));
  assert.equal(group.name, 'Trip');
  assert.equal(group.people.p1.name, 'Ann');
  assert.equal(group.receipts.r1.paidById, 'p1');
  assert.equal(group.receipts.r1.personToItemQuantityMap.p2.i1, 1);

  const transfers = minimizeTransfers(computeNetBalances(group));
  assert.equal(transfers.length, 1);
  assert.equal(transfers[0].from, 'p2');
  assert.equal(transfers[0].to, 'p1');
  assert.equal(transfers[0].amount, 5);
});
