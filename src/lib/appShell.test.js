import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appShellContentSx,
  appShellRootSx,
  chatComposerBarSx,
  chatThreadPageSx,
  chatThreadRootSx,
  isChatComposerRoute,
  isPublicExemptRoute,
  isPullToRefreshDisabledForRoute,
  shouldShowAppLegalFooter,
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
  assert.equal(isPullToRefreshDisabledForRoute('/groups/g1/chat'), true);
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

test('DM thread is a composer route; inbox and groups are not', () => {
  assert.equal(isChatComposerRoute('/chat/abc'), true);
  assert.equal(isChatComposerRoute('/chat'), false);
  assert.equal(isChatComposerRoute('/groups/g1/chat'), true);
  assert.equal(isChatComposerRoute('/groups/g1/receipts'), false);
  assert.equal(isChatComposerRoute('/'), false);
});

test('legal footer is hidden on composer routes so the bar can sit on the layout bottom', () => {
  assert.equal(shouldShowAppLegalFooter('/chat/abc'), false);
  assert.equal(shouldShowAppLegalFooter('/groups/g1/chat'), false);
  assert.equal(shouldShowAppLegalFooter('/chat'), true);
  assert.equal(shouldShowAppLegalFooter('/'), true);
});

test('chat thread page fills the shell content box instead of a 100dvh-88px guess', () => {
  assert.equal(chatThreadPageSx.flex, 1);
  assert.equal(chatThreadPageSx.height, '100%');
  assert.equal(chatThreadPageSx.minHeight, 0);
  assert.equal(chatThreadPageSx.maxHeight, '100%');
  assert.equal(Object.prototype.hasOwnProperty.call(chatThreadPageSx, 'minHeight') && chatThreadPageSx.minHeight !== 'calc(100dvh - 88px)', true);
  assert.equal(chatThreadRootSx.flex, 1);
  assert.equal(chatThreadRootSx.minHeight, 0);
  assert.equal(chatComposerBarSx.flexShrink, 0);
});
