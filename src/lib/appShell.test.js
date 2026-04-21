import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appShellContentSx,
  appShellRootSx,
  isPullToRefreshDisabledForRoute,
  shouldUsePullToRefreshLayout,
} from './appShell.js';

test('groups and receipts routes keep pull-to-refresh enabled', () => {
  assert.equal(isPullToRefreshDisabledForRoute('/'), false);
  assert.equal(isPullToRefreshDisabledForRoute('/groups/g1/receipts'), false);
  assert.equal(isPullToRefreshDisabledForRoute('/groups/g1/people'), false);
  assert.equal(isPullToRefreshDisabledForRoute('/shared-settlement/demo'), true);
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
