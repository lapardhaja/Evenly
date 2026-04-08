import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mergeCloudWithLocalOnlyGroups, getEvenlyDataStorageKey } from './evenlyStorageKey.js';

describe('evenlyStorageKey', () => {
  it('getEvenlyDataStorageKey scopes by user', () => {
    assert.ok(getEvenlyDataStorageKey('u1').includes('u1'));
    assert.ok(!getEvenlyDataStorageKey('u1').includes('u2'));
  });

  it('merge keeps cloud when ids overlap', () => {
    const cloud = { groups: { a: { name: 'Cloud A' } } };
    const local = { groups: { a: { name: 'Local A' }, b: { name: 'B' } } };
    const m = mergeCloudWithLocalOnlyGroups(cloud, local);
    assert.strictEqual(m.groups.a.name, 'Cloud A');
    assert.strictEqual(m.groups.b.name, 'B');
  });
});
