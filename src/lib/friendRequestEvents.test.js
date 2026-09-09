import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FRIEND_REQUEST_REALTIME_FILTER,
  incomingFriendRequestSnackText,
  isIncomingPendingFriendRequest,
  subscribeToFriendRequests,
} from './friendRequestEvents.js';

test('realtime filter listens to all friend_requests changes', () => {
  assert.deepEqual(FRIEND_REQUEST_REALTIME_FILTER, {
    event: '*',
    schema: 'public',
    table: 'friend_requests',
  });
});

test('incoming pending INSERT is a notification for the recipient', () => {
  assert.equal(
    isIncomingPendingFriendRequest(
      {
        eventType: 'INSERT',
        new: { to_user_id: 'me', from_user_id: 'them', status: 'pending' },
      },
      'me',
    ),
    true,
  );
});

test('outgoing INSERT is not an incoming notification', () => {
  assert.equal(
    isIncomingPendingFriendRequest(
      {
        eventType: 'INSERT',
        new: { to_user_id: 'them', from_user_id: 'me', status: 'pending' },
      },
      'me',
    ),
    false,
  );
});

test('accept/decline UPDATE is not a new-request notification', () => {
  assert.equal(
    isIncomingPendingFriendRequest(
      {
        eventType: 'UPDATE',
        new: { to_user_id: 'me', from_user_id: 'them', status: 'accepted' },
      },
      'me',
    ),
    false,
  );
});

test('snack text uses the sender name when present', () => {
  assert.equal(incomingFriendRequestSnackText('Alex'), 'Alex sent a friend request');
  assert.equal(incomingFriendRequestSnackText('  '), 'New friend request');
  assert.equal(incomingFriendRequestSnackText(null), 'New friend request');
});

test('subscribeToFriendRequests is a no-op without a client', () => {
  const unsub = subscribeToFriendRequests(null, () => {});
  assert.equal(typeof unsub, 'function');
  unsub();
});

test('subscribeToFriendRequests binds postgres_changes and tears down the channel', () => {
  const handlers = [];
  const removed = [];
  const channel = {
    on(type, filter, fn) {
      handlers.push({ type, filter, fn });
      return channel;
    },
    subscribe() {
      return channel;
    },
  };
  const client = {
    channel(name) {
      assert.equal(name, 'evenly-friend-requests');
      return channel;
    },
    removeChannel(ch) {
      removed.push(ch);
    },
  };
  const seen = [];
  const unsub = subscribeToFriendRequests(client, (p) => seen.push(p));
  assert.equal(handlers.length, 1);
  assert.equal(handlers[0].type, 'postgres_changes');
  assert.deepEqual(handlers[0].filter, FRIEND_REQUEST_REALTIME_FILTER);
  handlers[0].fn({ eventType: 'INSERT', new: { to_user_id: 'me' } });
  assert.equal(seen.length, 1);
  unsub();
  assert.equal(removed.length, 1);
  assert.equal(removed[0], channel);
});
