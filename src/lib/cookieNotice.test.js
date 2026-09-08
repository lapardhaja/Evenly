import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COOKIE_NOTICE_KEY,
  hasDismissedCookieNotice,
  dismissCookieNotice,
} from './cookieNotice.js';

test('dismissCookieNotice persists', () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  store.clear();
  assert.equal(hasDismissedCookieNotice(), false);
  dismissCookieNotice();
  assert.equal(hasDismissedCookieNotice(), true);
  assert.equal(localStorage.getItem(COOKIE_NOTICE_KEY), '1');
});
