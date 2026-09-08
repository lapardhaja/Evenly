import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  EVENLY_DATA_LEGACY_KEY,
  EVENLY_CLOUD_CACHE_PREFIX,
  cloudCacheKey,
  hasGroupsData,
  normalizeGroupsData,
  readCloudUserCache,
  writeCloudUserCache,
  rememberCloudCacheUserId,
  readLastCloudCacheUserId,
  clearLastCloudCacheUserId,
  purgeEvenlyDataFromLocalStorage,
  resolveCloudFailureData,
  shouldKeepCloudDataWithoutUser,
  shouldKeepDataReadyOnAuthLoading,
  shouldFlushCloudPersist,
} from './evenlyStorageKey.js';

function createMemoryStorage() {
  const map = new Map();
  return {
    get length() {
      return map.size;
    },
    key(i) {
      return [...map.keys()][i] ?? null;
    },
    getItem(k) {
      return map.has(String(k)) ? map.get(String(k)) : null;
    },
    setItem(k, v) {
      map.set(String(k), String(v));
    },
    removeItem(k) {
      map.delete(String(k));
    },
    clear() {
      map.clear();
    },
  };
}

describe('evenlyStorageKey', () => {
  beforeEach(() => {
    globalThis.localStorage = createMemoryStorage();
    globalThis.sessionStorage = createMemoryStorage();
  });

  it('exports legacy key constant', () => {
    assert.equal(typeof EVENLY_DATA_LEGACY_KEY, 'string');
    assert.equal(EVENLY_DATA_LEGACY_KEY, 'evenly:data:v2');
  });

  it('builds a per-user cloud cache key (not the legacy v2 key)', () => {
    const uid = 'user-abc';
    assert.equal(cloudCacheKey(uid), `evenly:cache:v1:user:${uid}`);
    assert.equal(cloudCacheKey(uid), `${EVENLY_CLOUD_CACHE_PREFIX}${uid}`);
    assert.notEqual(cloudCacheKey(uid).startsWith('evenly:data:v2'), true);
    assert.equal(cloudCacheKey(''), null);
    assert.equal(cloudCacheKey(null), null);
  });

  it('hasGroupsData is true only when groups exist', () => {
    assert.equal(hasGroupsData(null), false);
    assert.equal(hasGroupsData({ groups: {} }), false);
    assert.equal(hasGroupsData({ groups: { g1: { name: 'Trip' } } }), true);
    assert.equal(normalizeGroupsData({ groups: { a: 1 }, extra: true }).groups.a, 1);
    assert.deepEqual(normalizeGroupsData(null), { groups: {} });
  });

  it('writes and reads a signed-in user cache blob', () => {
    const uid = 'u1';
    const data = { groups: { g1: { name: 'Dinner', receipts: {} } } };
    writeCloudUserCache(uid, data);
    const stored = localStorage.getItem(cloudCacheKey(uid));
    assert.ok(stored);
    const parsed = JSON.parse(stored);
    assert.deepEqual(parsed.groups, data.groups);
    const read = readCloudUserCache(uid);
    assert.deepEqual(read.groups, data.groups);
    assert.equal(read.pendingPersist, true);
  });

  it('writeCloudUserCache can clear pendingPersist after a successful flush', () => {
    const uid = 'u1';
    writeCloudUserCache(uid, { groups: { g1: {} } }, { pendingPersist: true });
    assert.equal(readCloudUserCache(uid).pendingPersist, true);
    writeCloudUserCache(uid, { groups: { g1: {} } }, { pendingPersist: false });
    assert.equal(readCloudUserCache(uid).pendingPersist, false);
  });

  it('readCloudUserCache returns null for missing or corrupt entries', () => {
    assert.equal(readCloudUserCache('missing'), null);
    localStorage.setItem(cloudCacheKey('bad'), '{not json');
    assert.equal(readCloudUserCache('bad'), null);
    localStorage.setItem(cloudCacheKey('empty'), JSON.stringify({ foo: 1 }));
    assert.equal(readCloudUserCache('empty'), null);
  });

  it('remembers last cloud user id in localStorage (survives tab discard)', () => {
    assert.equal(readLastCloudCacheUserId(), null);
    rememberCloudCacheUserId('u42');
    assert.equal(localStorage.getItem('evenly:cache:v1:lastUser'), 'u42');
    assert.equal(readLastCloudCacheUserId(), 'u42');
    clearLastCloudCacheUserId();
    assert.equal(readLastCloudCacheUserId(), null);
  });

  it('falls back to a cached user id when lastUser is missing', () => {
    writeCloudUserCache('u-fallback', { groups: { g1: { name: 'Cached' } } });
    assert.equal(readLastCloudCacheUserId(), 'u-fallback');
  });

  it('purgeEvenlyDataFromLocalStorage removes legacy keys only, not the cloud cache', () => {
    const uid = 'u-keep';
    const cacheKey = cloudCacheKey(uid);
    localStorage.setItem(EVENLY_DATA_LEGACY_KEY, JSON.stringify({ groups: { old: {} } }));
    localStorage.setItem('evenly:data:v2:user:someone', JSON.stringify({ groups: {} }));
    writeCloudUserCache(uid, { groups: { keep: { name: 'Keep me' } } });

    purgeEvenlyDataFromLocalStorage();

    assert.equal(localStorage.getItem(EVENLY_DATA_LEGACY_KEY), null);
    assert.equal(localStorage.getItem('evenly:data:v2:user:someone'), null);
    const cached = readCloudUserCache(uid);
    assert.ok(cached);
    assert.equal(cached.groups.keep.name, 'Keep me');
    assert.ok(localStorage.getItem(cacheKey));
  });

  it('failed load keeps in-memory groups and does not wipe', () => {
    const inMemory = { groups: { live: { name: 'Unsaved' } } };
    const cached = { groups: { stale: { name: 'Cache' } } };
    const resolved = resolveCloudFailureData(inMemory, cached);
    assert.deepEqual(resolved.groups, inMemory.groups);
    assert.notDeepEqual(resolved, { groups: {} });
  });

  it('failed load hydrates from user cache when in-memory is empty', () => {
    const cached = { groups: { c1: { name: 'From cache' } } };
    const resolved = resolveCloudFailureData({ groups: {} }, cached);
    assert.equal(resolved.groups.c1.name, 'From cache');
  });

  it('failed load with no memory and no cache stays empty (does not invent groups)', () => {
    assert.deepEqual(resolveCloudFailureData({ groups: {} }, null), { groups: {} });
  });

  it('does not wipe on a null-session flicker when last user or cache exists', () => {
    const cached = { groups: { g1: { name: 'Trip' } } };
    assert.equal(
      shouldKeepCloudDataWithoutUser({
        inMemory: { groups: {} },
        cached,
        lastUserId: 'u1',
      }),
      true,
    );
    assert.equal(
      shouldKeepCloudDataWithoutUser({
        inMemory: { groups: { g1: {} } },
        cached: null,
        lastUserId: null,
      }),
      true,
    );
    assert.equal(
      shouldKeepCloudDataWithoutUser({
        inMemory: { groups: {} },
        cached: null,
        lastUserId: null,
      }),
      false,
    );
  });

  it('keeps dataReady when authLoading flickers after cache or in-memory data exists', () => {
    assert.equal(
      shouldKeepDataReadyOnAuthLoading({
        inMemory: { groups: { g1: {} } },
        cached: null,
        dataReady: false,
      }),
      true,
    );
    assert.equal(
      shouldKeepDataReadyOnAuthLoading({
        inMemory: { groups: {} },
        cached: { groups: { g1: {} } },
        dataReady: false,
      }),
      true,
    );
    assert.equal(
      shouldKeepDataReadyOnAuthLoading({
        inMemory: { groups: {} },
        cached: null,
        dataReady: true,
      }),
      true,
    );
    assert.equal(
      shouldKeepDataReadyOnAuthLoading({
        inMemory: { groups: {} },
        cached: null,
        dataReady: false,
      }),
      false,
    );
  });

  it('flushes persist when there is working-set data or a successful server hydrate', () => {
    assert.equal(shouldFlushCloudPersist({ data: { groups: { g1: {} } }, serverHydrated: false }), true);
    assert.equal(shouldFlushCloudPersist({ data: { groups: {} }, serverHydrated: true }), true);
    assert.equal(shouldFlushCloudPersist({ data: { groups: {} }, serverHydrated: false }), false);
  });
});
