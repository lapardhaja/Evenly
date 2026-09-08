import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canDeleteGroup,
  groupListBadge,
  normalizeMemberRole,
} from './groupMembership.js';

test('normalizeMemberRole', () => {
  assert.equal(normalizeMemberRole('owner'), 'owner');
  assert.equal(normalizeMemberRole('member'), 'member');
  assert.equal(normalizeMemberRole('nope'), null);
  assert.equal(normalizeMemberRole(null), null);
});

test('canDeleteGroup only owner', () => {
  assert.equal(canDeleteGroup('owner'), true);
  assert.equal(canDeleteGroup('member'), false);
  assert.equal(canDeleteGroup(null), false);
});

test('groupListBadge owned vs shared', () => {
  assert.equal(groupListBadge('owner', 'u1', 'u1'), 'owned');
  assert.equal(groupListBadge('member', 'u1', 'u2'), 'shared');
  assert.equal(groupListBadge(null, 'u1', 'u1'), 'owned');
  assert.equal(groupListBadge(null, 'u1', 'u2'), 'shared');
});
