import test from 'node:test';
import assert from 'node:assert/strict';
import { COOKIE_INVENTORY, cookieInventoryNames } from './cookieInventory.js';
import { COOKIE_NOTICE_KEY } from './cookieNotice.js';
import { EVENLY_DATA_LEGACY_KEY, EVENLY_CLOUD_CACHE_LAST_USER_KEY } from './evenlyStorageKey.js';
import { THEME_MODE_STORAGE_KEY } from './themeModeKey.js';
import { REMEMBER_LOGIN_ID_KEY } from './loginDevicePrefs.js';
import { EVENLY_AUTH_PENDING_KEY } from './supabaseAuthCallback.js';
import { PRELOAD_RELOAD_KEY } from './pwaReloadKey.js';

test('cookie inventory lists live storage keys and stays strictly necessary', () => {
  const names = cookieInventoryNames();
  for (const required of [
    COOKIE_NOTICE_KEY,
    THEME_MODE_STORAGE_KEY,
    EVENLY_DATA_LEGACY_KEY,
    EVENLY_CLOUD_CACHE_LAST_USER_KEY,
    EVENLY_AUTH_PENDING_KEY,
    PRELOAD_RELOAD_KEY,
    REMEMBER_LOGIN_ID_KEY,
    'sb-*-auth-token',
  ]) {
    assert.ok(names.includes(required), `missing ${required}`);
  }
  assert.equal(COOKIE_NOTICE_KEY, 'evenly:cookie-notice:v1');
  assert.ok(COOKIE_INVENTORY.length >= 10);
  for (const row of COOKIE_INVENTORY) {
    assert.equal(row.type, 'Strictly necessary');
    assert.ok(row.name && row.store && row.purpose && row.duration);
  }
});
