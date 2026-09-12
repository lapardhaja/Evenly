import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAT_NAME_GUTTER_PX,
  chatBubbleRadii,
  chatClusterMeta,
  isSameSender,
} from './chatLayout.js';

const them = (id) => ({ id, sender_id: 'them' });
const me = (id) => ({ id, sender_id: 'me' });

test('isSameSender requires both sender ids', () => {
  assert.equal(isSameSender(them('a'), them('b')), true);
  assert.equal(isSameSender(them('a'), me('b')), false);
  assert.equal(isSameSender(null, them('a')), false);
});

test('group incoming run: name on first, avatar on last', () => {
  const rows = [them('1'), them('2'), me('3'), them('4')];
  const a = chatClusterMeta(rows, 0, { myUserId: 'me', isGroup: true });
  const b = chatClusterMeta(rows, 1, { myUserId: 'me', isGroup: true });
  const c = chatClusterMeta(rows, 2, { myUserId: 'me', isGroup: true });
  const d = chatClusterMeta(rows, 3, { myUserId: 'me', isGroup: true });
  assert.deepEqual(
    { showName: a.showName, showAvatar: a.showAvatar, lastInRun: a.lastInRun },
    { showName: true, showAvatar: false, lastInRun: false },
  );
  assert.deepEqual(
    { showName: b.showName, showAvatar: b.showAvatar, lastInRun: b.lastInRun },
    { showName: false, showAvatar: true, lastInRun: true },
  );
  assert.equal(c.mine, true);
  assert.equal(c.showName, false);
  assert.equal(c.showAvatar, false);
  assert.equal(d.showName, true);
  assert.equal(d.showAvatar, true);
});

test('1:1 chats never put a name on bubbles', () => {
  const rows = [them('1')];
  const a = chatClusterMeta(rows, 0, { myUserId: 'me', isGroup: false });
  assert.equal(a.showName, false);
  assert.equal(a.showAvatar, true);
});

test('outgoing tail sits on the bottom-right corner', () => {
  const r = chatBubbleRadii({ mine: true, firstInRun: true, lastInRun: true, isMedia: false });
  assert.equal(r.borderBottomRightRadius, 4);
  assert.equal(r.borderTopLeftRadius, 22);
  const incoming = chatBubbleRadii({
    mine: false,
    firstInRun: true,
    lastInRun: true,
    isMedia: false,
  });
  assert.equal(incoming.borderBottomLeftRadius, 4);
  assert.equal(incoming.borderTopRightRadius, 22);
});

test('name gutter clears the 28px avatar', () => {
  assert.equal(CHAT_NAME_GUTTER_PX, 36);
});
