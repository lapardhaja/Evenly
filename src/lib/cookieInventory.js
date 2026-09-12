import { COOKIE_NOTICE_KEY } from './cookieNotice.js';
import {
  EVENLY_CLOUD_CACHE_LAST_USER_KEY,
  EVENLY_CLOUD_CACHE_PREFIX,
  EVENLY_DATA_LEGACY_KEY,
} from './evenlyStorageKey.js';
import { THEME_MODE_STORAGE_KEY } from './themeModeKey.js';
import { REMEMBER_LOGIN_ID_KEY } from './loginDevicePrefs.js';
import { EVENLY_AUTH_PENDING_KEY } from './supabaseAuthCallback.js';
import { PRELOAD_RELOAD_KEY } from './pwaReloadKey.js';

/**
 * First-party storage inventory for the Cookie Policy.
 * Category is always strictly necessary today — Evenly does not run advertising or analytics cookies.
 *
 * @typedef {{
 *   name: string,
 *   store: string,
 *   purpose: string,
 *   duration: string,
 *   type: 'Strictly necessary',
 * }} CookieInventoryRow
 */

export const COOKIE_POLICY_SCOPE =
  'This inventory covers HTTP cookies, localStorage, sessionStorage, Cache Storage (the PWA service worker), the Push API, and similar browser stores Evenly or its auth SDK uses on this origin.';

/** @type {CookieInventoryRow[]} */
export const COOKIE_INVENTORY = [
  {
    name: COOKIE_NOTICE_KEY,
    store: 'localStorage',
    purpose:
      'Remembers that you acknowledged the cookie notice so we do not prompt on every page load.',
    duration: 'Until you clear site data for this origin',
    type: 'Strictly necessary',
  },
  {
    name: THEME_MODE_STORAGE_KEY,
    store: 'localStorage',
    purpose: 'Stores light, dark, or system appearance so the UI matches your last choice.',
    duration: 'Until you clear site data or change the setting',
    type: 'Strictly necessary',
  },
  {
    name: EVENLY_DATA_LEGACY_KEY,
    store: 'localStorage',
    purpose:
      'Local-only builds store groups and receipts on-device. Cloud builds delete this key after a successful signed-in load.',
    duration: 'Until you clear site data, or until a successful cloud sync removes it',
    type: 'Strictly necessary',
  },
  {
    name: `${EVENLY_DATA_LEGACY_KEY}:user:*`,
    store: 'localStorage',
    purpose: 'Legacy per-user local copies of group data (removed after a successful cloud load).',
    duration: 'Until cleared or purged after cloud load',
    type: 'Strictly necessary',
  },
  {
    name: `${EVENLY_CLOUD_CACHE_PREFIX}*`,
    store: 'localStorage',
    purpose:
      'Short resume buffer of group data for the signed-in user so a discarded tab can restore the working set.',
    duration: 'Until you sign out, the buffer is overwritten, or you clear site data',
    type: 'Strictly necessary',
  },
  {
    name: EVENLY_CLOUD_CACHE_LAST_USER_KEY,
    store: 'localStorage',
    purpose: 'Remembers which user the resume buffer belongs to across tab discards.',
    duration: 'Until you sign out or clear site data',
    type: 'Strictly necessary',
  },
  {
    name: EVENLY_AUTH_PENDING_KEY,
    store: 'sessionStorage',
    purpose:
      'Holds password-reset or email-confirm tokens for one navigation so the PWA service worker cannot drop them.',
    duration: 'Until the tab is closed or the handshake finishes',
    type: 'Strictly necessary',
  },
  {
    name: PRELOAD_RELOAD_KEY,
    store: 'sessionStorage',
    purpose:
      'Prevents a reload loop if a stale PWA cache misses a new JavaScript chunk after a deploy.',
    duration: 'Until the tab is closed',
    type: 'Strictly necessary',
  },
  {
    name: REMEMBER_LOGIN_ID_KEY,
    store: 'localStorage',
    purpose:
      'Optional. Stores the email or username you typed when you choose “remember me” on sign-in.',
    duration: 'Until you turn the option off or clear site data',
    type: 'Strictly necessary',
  },
  {
    name: 'sb-*-auth-token',
    store: 'localStorage (Supabase Auth)',
    purpose:
      'Session JWT issued by Supabase Auth so you stay signed in on this browser. The name includes the project ref.',
    duration: 'Until the session expires, you sign out, or you clear site data',
    type: 'Strictly necessary',
  },
  {
    name: 'Push subscription / push_subscriptions',
    store: 'Browser Push API + Postgres',
    purpose:
      'If you enable message alerts, the browser keeps a push endpoint and Evenly stores it so we can wake the device for new chat messages. Not used for advertising.',
    duration:
      'Until you disable alerts, revoke notification permission, or we delete a gone endpoint',
    type: 'Strictly necessary',
  },
  {
    name: 'PWA caches (Workbox)',
    store: 'Cache Storage',
    purpose:
      'Precaches the app shell so Evenly loads quickly and the UI works offline. Does not store your receipts in the cache as a database.',
    duration: 'Until a new deploy replaces the cache or you clear site data',
    type: 'Strictly necessary',
  },
];

export function cookieInventoryNames() {
  return COOKIE_INVENTORY.map((row) => row.name);
}
