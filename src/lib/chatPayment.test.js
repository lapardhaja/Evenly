import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPaymentPayload,
  parsePaymentPayload,
  paymentPreviewText,
  venmoUsdAmount,
  venmoNoteForTransfer,
  clipMessageBody,
  MESSAGE_BODY_MAX,
} from './chatPayment.js';

test('buildPaymentPayload snapshots handle and rounds money', () => {
  const p = buildPaymentPayload({
    groupId: 'g1',
    fromUserId: 'u1',
    toUserId: 'u2',
    fromPersonId: 'p1',
    toPersonId: 'p2',
    amount: 24.456,
    currency: 'usd',
    transferKey: 'p1\tp2',
    venmoUsername: '@Sam_Pay',
  });
  assert.equal(p.amount, 24.46);
  assert.equal(p.currency, 'USD');
  assert.equal(p.venmo_username, 'Sam_Pay');
  assert.equal(p.status, 'requested');
  assert.equal(p.transfer_key, 'p1\tp2');
});

test('parsePaymentPayload rejects garbage', () => {
  assert.equal(parsePaymentPayload(null), null);
  assert.equal(parsePaymentPayload({ amount: 'nope' }), null);
  const ok = parsePaymentPayload({ amount: 10, status: 'paid', currency: 'EUR' });
  assert.equal(ok.status, 'paid');
  assert.equal(ok.currency, 'EUR');
});

test('paymentPreviewText', () => {
  const payload = { amount: 10, currency: 'USD', status: 'requested' };
  assert.match(paymentPreviewText(payload, { fromName: 'Alex', toName: 'Sam' }), /Alex → Sam/);
  assert.match(
    paymentPreviewText({ ...payload, status: 'paid' }, { fromName: 'Alex', toName: 'Sam' }),
    /Alex paid Sam/,
  );
});

test('venmoUsdAmount converts via USD table', () => {
  assert.equal(venmoUsdAmount(10, 'USD', { USD: 1, EUR: 0.9 }), 10);
  const fromEur = venmoUsdAmount(9, 'EUR', { USD: 1, EUR: 0.9 });
  assert.equal(fromEur, 10);
  assert.equal(venmoUsdAmount(10, 'EUR', null), null);
  assert.equal(venmoUsdAmount(10, 'JPY', { USD: 1, EUR: 0.9 }), null);
});

test('venmoNoteForTransfer is capped', () => {
  const n = venmoNoteForTransfer({ groupName: 'Trip', fromName: 'A', toName: 'B' });
  assert.equal(n, 'Evenly · Trip · A → B');
});

test('clipMessageBody', () => {
  assert.equal(clipMessageBody('  hi  '), 'hi');
  assert.equal(clipMessageBody('x'.repeat(MESSAGE_BODY_MAX + 20)).length, MESSAGE_BODY_MAX);
});
