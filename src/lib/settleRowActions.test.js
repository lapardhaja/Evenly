import test from 'node:test';
import assert from 'node:assert/strict';
import { settleRowActions } from './settleRowActions.js';

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
