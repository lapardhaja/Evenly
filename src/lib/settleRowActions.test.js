import test from 'node:test';
import assert from 'node:assert/strict';
import { paymentCardActions, settleRowActions } from './settleRowActions.js';

test('outsider and settled rows get no pay or request', () => {
  assert.deepEqual(settleRowActions({ iAmParty: false, iAmDebtor: true, isSettled: false }), {
    pay: false,
    request: false,
  });
  assert.deepEqual(settleRowActions({ iAmParty: true, iAmDebtor: false, isSettled: true }), {
    pay: false,
    request: false,
  });
});

test('debtor (I owe) gets Pay only', () => {
  assert.deepEqual(settleRowActions({ iAmParty: true, iAmDebtor: true, isSettled: false }), {
    pay: true,
    request: false,
  });
});

test('creditor (I am owed) gets Request only', () => {
  assert.deepEqual(settleRowActions({ iAmParty: true, iAmDebtor: false, isSettled: false }), {
    pay: false,
    request: true,
  });
});

test('payment card: debtor can Pay and I paid; creditor cannot', () => {
  assert.deepEqual(
    paymentCardActions({ isParty: true, isDebtor: true, status: 'requested' }),
    { pay: true, markPaid: true },
  );
  assert.deepEqual(
    paymentCardActions({ isParty: true, isDebtor: false, status: 'requested' }),
    { pay: false, markPaid: false },
  );
});

test('payment card: outsiders and paid rows get no pay actions', () => {
  assert.deepEqual(
    paymentCardActions({ isParty: false, isDebtor: true, status: 'requested' }),
    { pay: false, markPaid: false },
  );
  assert.deepEqual(
    paymentCardActions({ isParty: true, isDebtor: true, status: 'paid' }),
    { pay: false, markPaid: false },
  );
});
