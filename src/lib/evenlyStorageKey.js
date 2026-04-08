/** Legacy key used when not signed in (guest / before accounts). */
export const EVENLY_DATA_LEGACY_KEY = 'evenly:data:v2';

/** Per-user cache when signed in so two accounts on one browser don’t share data. */
export function getEvenlyDataStorageKey(userId) {
  if (!userId) return EVENLY_DATA_LEGACY_KEY;
  return `evenly:data:v2:user:${userId}`;
}

export function readEvenlyDataJson(key) {
  try {
    const item = localStorage.getItem(key);
    if (!item) return { groups: {} };
    const parsed = JSON.parse(item);
    return parsed && typeof parsed === 'object' && parsed.groups ? parsed : { groups: {} };
  } catch {
    return { groups: {} };
  }
}

export function writeEvenlyDataJson(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* quota */
  }
}

/**
 * Merge: start from cloud; add any groups that exist only in local (same id = cloud wins).
 */
export function mergeCloudWithLocalOnlyGroups(cloudData, localData) {
  const cloudGroups = cloudData?.groups && typeof cloudData.groups === 'object' ? cloudData.groups : {};
  const localGroups = localData?.groups && typeof localData.groups === 'object' ? localData.groups : {};
  const merged = { ...cloudGroups };
  for (const [id, g] of Object.entries(localGroups)) {
    if (!(id in merged)) merged[id] = g;
  }
  return { groups: merged };
}
