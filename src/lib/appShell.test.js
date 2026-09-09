import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appShellContentSx,
  appShellRootSx,
  chatComposerBarSx,
  chatFillChildSx,
  chatMessagesSx,
  chatThreadPageSx,
  chatThreadRootSx,
  isChatComposerRoute,
  isPublicExemptRoute,
  isPullToRefreshDisabledForRoute,
  pullToRefreshFillSx,
  shouldShowAppLegalFooter,
  shouldUsePullToRefreshLayout,
} from './appShell.js';
import { scrollChatToBottom } from './chatScroll.js';

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

test('chat thread page is a bounded flex column; only the message pane scrolls', () => {
  assert.equal(chatThreadPageSx.flex, 1);
  assert.equal(chatThreadPageSx.minHeight, 0);
  assert.equal(chatThreadPageSx.overflow, 'hidden');
  assert.equal(chatThreadPageSx.display, 'flex');
  assert.equal(chatThreadRootSx.flex, 1);
  assert.equal(chatThreadRootSx.minHeight, 0);
  assert.equal(chatThreadRootSx.overflow, 'hidden');
  assert.equal(chatMessagesSx.overflow, 'auto');
  assert.equal(chatMessagesSx.minHeight, 0);
  assert.equal(chatMessagesSx.flex, 1);
  assert.equal(chatMessagesSx.overscrollBehaviorY, 'contain');
  assert.equal(chatComposerBarSx.flexShrink, 0);
  assert.equal(chatFillChildSx.overflow, 'hidden');
  assert.equal(chatFillChildSx.minHeight, 0);
  assert.equal(pullToRefreshFillSx.overflow, 'hidden');
  assert.equal(pullToRefreshFillSx.WebkitOverflowScrolling, undefined);
});

test('scrollChatToBottom moves the list, not the page via scrollIntoView', () => {
  const el = {
    scrollHeight: 800,
    scrollTop: 0,
    scrollIntoView() {
      throw new Error('must not scrollIntoView — that scrolls the page');
    },
  };
  scrollChatToBottom(el);
  assert.equal(el.scrollTop, 800);
  scrollChatToBottom(null);
});

test('html/body/#root lock document scroll so chat cannot pan the page', async () => {
  const { readFileSync } = await import('node:fs');
  const { dirname, join } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../index.css'), 'utf8');
  assert.match(css, /html,\s*body,\s*#root\s*\{[^}]*overflow:\s*hidden/s);
});
