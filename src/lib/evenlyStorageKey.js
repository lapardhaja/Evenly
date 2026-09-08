/** Old guest / pre-server-only keys — removed after successful cloud load when using Supabase. */
export const EVENLY_DATA_LEGACY_KEY = 'evenly:data:v2';
const USER_KEY_PREFIX = 'evenly:data:v2:user:';

/** Resume buffer for signed-in cloud users. Not purged with legacy keys. */
export const EVENLY_CLOUD_CACHE_PREFIX = 'evenly:cache:v1:user:';
/** Survives iOS Chrome tab discard (sessionStorage often does not). */
export const EVENLY_CLOUD_CACHE_LAST_USER_KEY = 'evenly:cache:v1:lastUser';

/**
 * Remove all Evenly app-data keys from localStorage (server-only mode cleanup).
 * Does not remove `evenly:cache:v1:user:*` resume buffers.
 */
export function purgeEvenlyDataFromLocalStorage() {
  if (typeof localStorage === 'undefined') return;
  const toRemove = [];
  try {
    toRemove.push(EVENLY_DATA_LEGACY_KEY);
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith(USER_KEY_PREFIX)) toRemove.push(k);
    }
    for (const k of toRemove) {
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}

/** Read legacy guest blob (only when Supabase is not configured). */
export function readLegacyEvenlyData() {
  try {
    const item = localStorage.getItem(EVENLY_DATA_LEGACY_KEY);
    if (!item) return { groups: {} };
    const parsed = JSON.parse(item);
    return parsed && typeof parsed === 'object' && parsed.groups ? parsed : { groups: {} };
  } catch {
    return { groups: {} };
  }
}

export function writeLegacyEvenlyData(data) {
  try {
    localStorage.setItem(EVENLY_DATA_LEGACY_KEY, JSON.stringify(data));
  } catch {
    /* quota */
  }
}

export function cloudCacheKey(userId) {
  if (!userId || typeof userId !== 'string') return null;
  return `${EVENLY_CLOUD_CACHE_PREFIX}${userId}`;
}

export function hasGroupsData(data) {
  return Boolean(
    data?.groups && typeof data.groups === 'object' && Object.keys(data.groups).length > 0,
  );
}

export function normalizeGroupsData(data) {
  if (data && typeof data === 'object' && data.groups && typeof data.groups === 'object') {
    return { groups: data.groups };
  }
  return { groups: {} };
}

/**
 * @param {string} userId
 * @returns {{ groups: Record<string, unknown>, pendingPersist: boolean } | null}
 */
export function readCloudUserCache(userId) {
  const key = cloudCacheKey(userId);
  if (!key || typeof localStorage === 'undefined') return null;
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    const parsed = JSON.parse(item);
    if (!parsed || typeof parsed !== 'object' || !parsed.groups || typeof parsed.groups !== 'object') {
      return null;
    }
    return {
      groups: parsed.groups,
      pendingPersist: Boolean(parsed.pendingPersist),
    };
  } catch {
    return null;
  }
}

/**
 * @param {string} userId
 * @param {{ groups?: Record<string, unknown> } | null | undefined} data
 * @param {{ pendingPersist?: boolean }} [meta]
 */
export function writeCloudUserCache(userId, data, meta = {}) {
  const key = cloudCacheKey(userId);
  if (!key || typeof localStorage === 'undefined') return;
  try {
    const pendingPersist = meta.pendingPersist !== undefined ? Boolean(meta.pendingPersist) : true;
    localStorage.setItem(
      key,
      JSON.stringify({
        groups: normalizeGroupsData(data).groups,
        pendingPersist,
      }),
    );
  } catch {
    /* quota */
  }
}

export function rememberCloudCacheUserId(userId) {
  if (!userId || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(EVENLY_CLOUD_CACHE_LAST_USER_KEY, userId);
  } catch {
    /* ignore */
  }
}

function firstCachedCloudUserId() {
  if (typeof localStorage === 'undefined') return null;
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith(EVENLY_CLOUD_CACHE_PREFIX)) {
        return k.slice(EVENLY_CLOUD_CACHE_PREFIX.length) || null;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function readLastCloudCacheUserId() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const stored = localStorage.getItem(EVENLY_CLOUD_CACHE_LAST_USER_KEY);
    if (stored) return stored;
    return firstCachedCloudUserId();
  } catch {
    return firstCachedCloudUserId();
  }
}

export function clearLastCloudCacheUserId() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(EVENLY_CLOUD_CACHE_LAST_USER_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Keep last-known groups on a transient auth/network failure.
 * Prefer in-memory when it already has groups; otherwise use the user cache.
 */
export function resolveCloudFailureData(inMemory, cached) {
  if (hasGroupsData(inMemory)) return normalizeGroupsData(inMemory);
  if (cached?.groups && typeof cached.groups === 'object') {
    return { groups: cached.groups };
  }
  if (inMemory?.groups && typeof inMemory.groups === 'object') {
    return { groups: inMemory.groups };
  }
  return { groups: {} };
}

/**
 * A missing user should not wipe working data during a session flicker.
 * Only wipe when there is no last user, no in-memory groups, and no cache.
 */
export function shouldKeepCloudDataWithoutUser({ inMemory, cached, lastUserId }) {
  if (lastUserId) return true;
  if (hasGroupsData(inMemory)) return true;
  if (hasGroupsData(cached)) return true;
  return false;
}

/**
 * Whether to keep the existing UI up when authLoading flickers true.
 */
export function shouldKeepDataReadyOnAuthLoading({ inMemory, cached, dataReady }) {
  if (dataReady) return true;
  if (hasGroupsData(inMemory) || hasGroupsData(cached)) return true;
  return false;
}

/** Persist working-set rows, not a failed-load empty wipe. */
export function shouldFlushCloudPersist({ data, serverHydrated }) {
  return hasGroupsData(data) || Boolean(serverHydrated);
}
