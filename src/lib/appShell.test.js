import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appShellContentSx,
  appShellRootSx,
  isPublicExemptRoute,
  isPullToRefreshDisabledForRoute,
  shouldUsePullToRefreshLayout,
} from './appShell.js';

test('groups and receipts routes keep pull-to-refresh enabled', () => {
  assert.equal(isPullToRefreshDisabledForRoute('/'), false);
  assert.equal(isPullToRefreshDisabledForRoute('/groups/g1/receipts'), false);
  assert.equal(isPullToRefreshDisabledForRoute('/groups/g1/people'), false);
  assert.equal(isPullToRefreshDisabledForRoute('/shared-settlement/demo'), true);
  assert.equal(isPullToRefreshDisabledForRoute('/share/abc-uuid'), true);
  assert.equal(isPullToRefreshDisabledForRoute('/privacy'), true);
  assert.equal(isPullToRefreshDisabledForRoute('/terms'), true);
});

test('chat thread disables pull-to-refresh so the composer stays usable', () => {
  assert.equal(isPullToRefreshDisabledForRoute('/chat'), false);
  assert.equal(isPullToRefreshDisabledForRoute('/chat/abc'), true);
});

test('public legal and auth routes skip profile gate and bootstrap', () => {
  assert.equal(isPublicExemptRoute('/login'), true);
  assert.equal(isPublicExemptRoute('/privacy'), true);
  assert.equal(isPublicExemptRoute('/copyright'), true);
  assert.equal(isPublicExemptRoute('/shared-settlement/abc'), true);
  assert.equal(isPublicExemptRoute('/share/abc-uuid'), true);
  assert.equal(isPublicExemptRoute('/share'), true);
  assert.equal(isPublicExemptRoute('/groups/g1/receipts'), false);
});

test('all non-login app routes use the shared pull-to-refresh layout', () => {
  assert.equal(shouldUsePullToRefreshLayout(false), true);
  assert.equal(shouldUsePullToRefreshLayout(true), false);
});

test('app shell stays viewport-bounded so the inner scroller owns wheel scroll', () => {
  assert.equal(appShellRootSx.height, '100dvh');
  assert.equal(appShellRootSx.overflow, 'hidden');
  assert.equal(appShellContentSx.minHeight, 0);
  assert.equal(appShellContentSx.overflow, 'hidden');
});
