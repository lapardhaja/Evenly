import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSettlementSharePayload,
  encodeSettlementShareToken,
  parseSettlementShareToken,
  parseSettlementShareTokenAsync,
  settlementSharePath,
} from './settlementShareLink.js';

test('roundtrip encode/decode', async () => {
  const payload = buildSettlementSharePayload({
    groupName: 'Dinner crew',
    note: 'Pay by Friday!',
    transfers: [
      { from: 'Alex', to: 'Sam', amount: 12.34 },
      { from: 'Jordan', to: 'Sam', amount: 5 },
    ],
    warnings: ['One receipt has no payer set.'],
  });
  const token = await encodeSettlementShareToken(payload);
  assert.ok(token.length > 0);
  assert.ok(!token.includes('/'));
  assert.ok(!token.includes('+'));
  const parsed = await parseSettlementShareTokenAsync(token);
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

test('parse invalid token', async () => {
  assert.equal(parseSettlementShareToken('').ok, false);
  assert.equal(parseSettlementShareToken('!!!').ok, false);
  assert.equal((await parseSettlementShareTokenAsync('!!!')).ok, false);
});

test('settlementSharePath', () => {
  assert.ok(settlementSharePath('abc').startsWith('/shared-settlement/'));
});

test('empty transfers still valid payload', async () => {
  const payload = buildSettlementSharePayload({
    groupName: 'G',
    transfers: [],
  });
  const parsed = await parseSettlementShareTokenAsync(await encodeSettlementShareToken(payload));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.transfers.length, 0);
});

test('settle currency in payload', async () => {
  const payload = buildSettlementSharePayload({
    groupName: 'Trip',
    transfers: [{ from: 'A', to: 'B', amount: 10 }],
    settleCurrencyCode: 'EUR',
  });
  assert.equal(payload.v, 2);
  assert.equal(payload.cur, 'EUR');
  const parsed = await parseSettlementShareTokenAsync(await encodeSettlementShareToken(payload));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.currencyCode, 'EUR');
});

test('compressed token is shorter for large payload', async () => {
  const transfers = [];
  for (let i = 0; i < 40; i += 1) {
    transfers.push({
      from: `Person From Number ${i} Long Name`,
      to: `Person To Number ${i} Long Name`,
      amount: 12.34 + i * 0.01,
    });
  }
  const payload = buildSettlementSharePayload({
    groupName: 'Big group settlement',
    note: 'Please pay everyone thanks',
    transfers,
    warnings: ['Receipt A has no payer.', 'Receipt B has no payer.'],
  });
  const jsonOnly = JSON.stringify(payload);
  const rawB64 = Buffer.from(jsonOnly, 'utf8').toString('base64url');
  const token = await encodeSettlementShareToken(payload);
  assert.ok(
    token.startsWith('z1.'),
    `expected compressed prefix, got length ${token.length} vs raw ${rawB64.length}`,
  );
  assert.ok(token.length < rawB64.length * 0.85, 'compressed should be much smaller than raw JSON b64');
  const parsed = await parseSettlementShareTokenAsync(token);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.transfers.length, 40);
});
