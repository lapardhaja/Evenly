/** Old guest / pre-server-only keys — removed after successful cloud load when using Supabase. */
export const EVENLY_DATA_LEGACY_KEY = 'evenly:data:v2';
const USER_KEY_PREFIX = 'evenly:data:v2:user:';

/**
 * Remove all Evenly app-data keys from localStorage (server-only mode cleanup).
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
