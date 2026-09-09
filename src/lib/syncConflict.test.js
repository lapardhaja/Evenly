import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isStaleGroupWrite,
  planRemoteGroupRemovals,
  applyPersistResult,
} from './syncConflict.js';

describe('isStaleGroupWrite', () => {
  it('is not stale when the server has no timestamp (insert)', () => {
    assert.equal(isStaleGroupWrite('2026-09-08T12:00:00.000Z', null), false);
  });

  it('is not stale for legacy local blobs with no updatedAt', () => {
    assert.equal(isStaleGroupWrite(null, '2026-09-08T12:00:00.000Z'), false);
  });

  it('is stale when the server copy is newer than the last load', () => {
    assert.equal(
      isStaleGroupWrite('2026-09-08T12:00:00.000Z', '2026-09-08T12:00:05.000Z'),
      true,
    );
  });

  it('is not stale when timestamps are equal or local matches server', () => {
    const t = '2026-09-08T12:00:00.000Z';
    assert.equal(isStaleGroupWrite(t, t), false);
    assert.equal(isStaleGroupWrite('2026-09-08T12:00:05.000Z', t), false);
  });
});

describe('planRemoteGroupRemovals', () => {
  it('owners delete groups missing locally; members leave instead', () => {
    const plan = planRemoteGroupRemovals({
      localIds: ['keep'],
      remoteMemberships: [
        { group_id: 'keep', role: 'owner' },
        { group_id: 'owned-gone', role: 'owner' },
        { group_id: 'shared-gone', role: 'member' },
      ],
    });
    assert.deepEqual(plan.deleteGroupIds, ['owned-gone']);
    assert.deepEqual(plan.leaveGroupIds, ['shared-gone']);
  });

  it('does not delete a group that is still in the local blob', () => {
    const plan = planRemoteGroupRemovals({
      localIds: ['g1'],
      remoteMemberships: [{ group_id: 'g1', role: 'owner' }],
    });
    assert.deepEqual(plan.deleteGroupIds, []);
    assert.deepEqual(plan.leaveGroupIds, []);
  });
});

describe('applyPersistResult', () => {
  it('replaces skipped groups from the server and stamps written updatedAt', () => {
    const local = {
      stale: { name: 'old', receipts: { r1: { title: 'mine' } } },
      mine: { name: 'mine', receipts: {}, updatedAt: 't0' },
    };
    const next = applyPersistResult(local, {
      skippedIds: ['stale'],
      writtenAt: { mine: 't1' },
      serverGroups: {
        stale: { name: 'server', receipts: { r2: { title: 'theirs' } }, updatedAt: 't9' },
      },
    });
    assert.equal(next.stale.name, 'server');
    assert.equal(next.stale.receipts.r2.title, 'theirs');
    assert.equal(next.mine.updatedAt, 't1');
    assert.equal(next.mine.name, 'mine');
  });

  it('keeps the local skipped group when no server copy is available', () => {
    const local = { stale: { name: 'old' } };
    const next = applyPersistResult(local, {
      skippedIds: ['stale'],
      writtenAt: {},
      serverGroups: {},
    });
    assert.equal(next.stale.name, 'old');
  });
});
