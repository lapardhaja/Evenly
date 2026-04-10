import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSettlementSharePayload,
  encodeSettlementShareToken,
  parseSettlementShareToken,
  settlementSharePath,
} from './settlementShareLink.js';

test('roundtrip encode/decode', () => {
  const payload = buildSettlementSharePayload({
    groupName: 'Dinner crew',
    note: 'Pay by Friday!',
    transfers: [
      { from: 'Alex', to: 'Sam', amount: 12.34 },
      { from: 'Jordan', to: 'Sam', amount: 5 },
    ],
    warnings: ['One receipt has no payer set.'],
  });
  const token = encodeSettlementShareToken(payload);
  assert.ok(token.length > 0);
  assert.ok(!token.includes('/'));
  assert.ok(!token.includes('+'));
  const parsed = parseSettlementShareToken(token);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.currencyCode, 'USD');
  assert.equal(parsed.data.groupName, 'Dinner crew');
  assert.equal(parsed.data.note, 'Pay by Friday!');
  assert.equal(parsed.data.transfers.length, 2);
  assert.equal(parsed.data.transfers[0].from, 'Alex');
  assert.equal(parsed.data.transfers[0].to, 'Sam');
  assert.equal(parsed.data.transfers[0].cents, 1234);
  assert.equal(parsed.data.transfers[1].cents, 500);
  assert.equal(parsed.data.warnings.length, 1);
});

test('parse invalid token', () => {
  assert.equal(parseSettlementShareToken('').ok, false);
  assert.equal(parseSettlementShareToken('!!!').ok, false);
});

test('settlementSharePath', () => {
  assert.ok(settlementSharePath('abc').startsWith('/shared-settlement/'));
});

test('empty transfers still valid payload', () => {
  const payload = buildSettlementSharePayload({
    groupName: 'G',
    transfers: [],
  });
  const parsed = parseSettlementShareToken(encodeSettlementShareToken(payload));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.transfers.length, 0);
});

test('settle currency in payload', () => {
  const payload = buildSettlementSharePayload({
    groupName: 'Trip',
    transfers: [{ from: 'A', to: 'B', amount: 10 }],
    settleCurrencyCode: 'EUR',
  });
  assert.equal(payload.v, 2);
  assert.equal(payload.cur, 'EUR');
  const parsed = parseSettlementShareToken(encodeSettlementShareToken(payload));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.currencyCode, 'EUR');
});
