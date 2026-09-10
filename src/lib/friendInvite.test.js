import test from 'node:test';
import assert from 'node:assert/strict';
import {
  friendlyFriendInviteError,
  friendlyFriendRequestError,
  friendSearchAction,
} from './friendInvite.js';

test('friendlyFriendInviteError does not dump RPC jargon', () => {
  assert.match(friendlyFriendInviteError('not a group member'), /in this group/i);
  assert.equal(/not a group member/i.test(friendlyFriendInviteError('not a group member')), false);
  assert.match(friendlyFriendInviteError({ message: 'not friends' }), /Friends/i);
  assert.match(friendlyFriendInviteError('not authenticated'), /Sign in/i);
});

test('friendlyFriendRequestError maps unique pending rows', () => {
  assert.match(friendlyFriendRequestError({ code: '23505', message: 'duplicate key' }), /already sent/i);
});

test('friendSearchAction prefers Accept when they already requested you', () => {
  const incomingFrom = new Map([['u2', 'req-1']]);
  assert.deepEqual(
    friendSearchAction({
      userId: 'u2',
      friendIds: new Set(),
      outgoingTo: new Set(),
      incomingFrom,
    }),
    { kind: 'accept', requestId: 'req-1' },
  );
  assert.equal(
    friendSearchAction({
      userId: 'u3',
      friendIds: new Set(['u2']),
      outgoingTo: new Set(),
      incomingFrom,
    }).kind,
    'request',
  );
  assert.equal(
    friendSearchAction({
      userId: 'u2',
      friendIds: new Set(['u2']),
      outgoingTo: new Set(),
      incomingFrom,
    }).kind,
    'friends',
  );
});
