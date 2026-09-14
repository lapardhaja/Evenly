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
  CHAT_CONTAINER_MAX_WIDTH,
  chatBubbleMaxWidthSx,
  chatMediaBubbleSx,
  isChatComposerRoute,
  isPublicExemptRoute,
  isPullToRefreshDisabledForRoute,
  pullToRefreshFillSx,
  pullToRefreshScrollSx,
  shouldShowAppLegalFooter,
  shouldUsePullToRefreshLayout,
  appLegalFooterSx,
  appShellFooterPinSx,
  appShellFooterPinMainSx,
  appTabFromPath,
  shouldShowAppTabBar,
  shouldShowDesktopNav,
  APP_TABS,
} from './appShell.js';
import { scrollChatToBottom, isChatNearBottom, pinChatToLatestAfterLayout } from './chatScroll.js';

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
  assert.equal(isPublicExemptRoute('/security'), true);
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
  assert.equal(isChatComposerRoute('/dev/chat-layout'), true);
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

test('legal footer pin column fills the scrollport so a short desktop page still sits the strip at the bottom', () => {
  assert.equal(appShellFooterPinSx.minHeight, '100%');
  assert.equal(appShellFooterPinSx.flex, '1 0 auto');
  assert.equal(appShellFooterPinSx.display, 'flex');
  assert.equal(appShellFooterPinSx.flexDirection, 'column');
  assert.equal(appShellFooterPinMainSx.flex, '1 0 auto');
  assert.equal(appLegalFooterSx.mt, 'auto');
  assert.equal(appLegalFooterSx.flexShrink, 0);
});

test('legal footer keeps fat mobile clearance and only a small desktop pad plus cookie offset', () => {
  assert.match(appLegalFooterSx.pb.xs, /88px/);
  assert.match(appLegalFooterSx.pb.xs, /evenly-tab-bar-offset/);
  assert.match(appLegalFooterSx.pb.sm, /24px/);
  assert.equal(appLegalFooterSx.pb.sm.includes('88px'), false);
  assert.match(appLegalFooterSx.pb.sm, /evenly-cookie-banner-offset/);
  assert.equal(pullToRefreshScrollSx.display, 'flex');
  assert.equal(pullToRefreshScrollSx.flexDirection, 'column');
  assert.equal(pullToRefreshScrollSx.overflow, 'auto');
});

test('Layout pins the legal footer under a min-height 100% column', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../core/Layout.jsx', import.meta.url), 'utf8');
  assert.match(src, /appShellFooterPinSx/);
  assert.match(src, /appShellFooterPinMainSx/);
  assert.match(src, /appLegalFooterSx/);
  assert.match(src, /hideAppBar/);
  assert.match(src, /isChatComposerRoute/);
  assert.match(src, /AppTabBar/);
  assert.match(src, /DesktopAppNav/);
  assert.match(src, /shouldShowAppTabBar/);
  assert.match(src, /shouldShowDesktopNav/);
  assert.match(src, /evenly-tab-bar-offset/);
});

test('chat column uses a desktop-width container, not the phone sm cap', () => {
  assert.equal(CHAT_CONTAINER_MAX_WIDTH, 'lg');
  assert.notEqual(CHAT_CONTAINER_MAX_WIDTH, 'sm');
  assert.deepEqual(chatBubbleMaxWidthSx.maxWidth, { xs: '85%', md: 560, lg: 640 });
  assert.equal(chatBubbleMaxWidthSx.width, 'max-content');
  assert.equal(chatMediaBubbleSx.width.xs, '75%');
  assert.equal(chatMediaBubbleSx.width.sm, 280);
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
  assert.equal(chatComposerBarSx.mt, 'auto');
  assert.deepEqual(chatComposerBarSx.position, { xs: 'fixed', md: 'relative' });
  assert.match(String(chatComposerBarSx.bottom.xs), /evenly-vv-bottom/);
  assert.match(String(chatComposerBarSx.pb.xs), /evenly-vv-bottom/);
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

test('isChatNearBottom is true at the latest messages', () => {
  assert.equal(
    isChatNearBottom({ scrollHeight: 1000, scrollTop: 920, clientHeight: 80 }),
    true,
  );
  assert.equal(
    isChatNearBottom({ scrollHeight: 1000, scrollTop: 0, clientHeight: 80 }),
    false,
  );
  assert.equal(isChatNearBottom(null), true);
});

test('pinChatToLatestAfterLayout retries after layout frames so open lands on the latest', () => {
  const frames = [];
  const el = {
    _h: 200,
    get scrollHeight() {
      return this._h;
    },
    scrollTop: 0,
  };
  pinChatToLatestAfterLayout(el, (fn) => {
    frames.push(fn);
    return frames.length;
  });
  assert.equal(el.scrollTop, 200);
  el._h = 900;
  frames[0]();
  assert.equal(el.scrollTop, 900);
  el._h = 1200;
  frames[1]();
  assert.equal(el.scrollTop, 1200);
});

test('chat pages use the desktop container maxWidth', async () => {
  const { readFileSync } = await import('node:fs');
  const { dirname, join } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const dir = join(dirname(fileURLToPath(import.meta.url)), '../pages');
  const thread = readFileSync(join(dir, 'ChatThreadPage.jsx'), 'utf8');
  const inbox = readFileSync(join(dir, 'ChatInboxPage.jsx'), 'utf8');
  const group = readFileSync(join(dir, 'GroupDetailPage.jsx'), 'utf8');
  assert.match(thread, /CHAT_CONTAINER_MAX_WIDTH/);
  assert.match(inbox, /CHAT_CONTAINER_MAX_WIDTH/);
  assert.match(group, /CHAT_CONTAINER_MAX_WIDTH/);
  assert.equal(thread.includes('maxWidth="sm"'), false);
});

test('html/body/#root lock document scroll so chat cannot pan the page', async () => {
  const { readFileSync } = await import('node:fs');
  const { dirname, join } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const dir = dirname(fileURLToPath(import.meta.url));
  const css = readFileSync(join(dir, '../index.css'), 'utf8');
  const html = readFileSync(join(dir, '../../index.html'), 'utf8');
  assert.match(css, /html,\s*body,\s*#root\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(html, /interactive-widget=resizes-content/);
});

test('chat thread is Instagram-style with voice notes and a pill composer', async () => {
  const { readFileSync } = await import('node:fs');
  const { dirname, join } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const thread = readFileSync(join(root, 'components/ChatThread.jsx'), 'utf8');
  const composer = readFileSync(join(root, 'components/ChatComposer.jsx'), 'utf8');
  const recordBar = readFileSync(join(root, 'components/VoiceRecordBar.jsx'), 'utf8');
  const page = readFileSync(join(root, 'pages/ChatThreadPage.jsx'), 'utf8');
  const shell = readFileSync(join(root, 'lib/appShell.js'), 'utf8');
  const sql = readFileSync(
    join(root, '../supabase/migrations/20260912233000_chat_voice_notes.sql'),
    'utf8',
  );
  assert.match(thread, /chatClusterMeta/);
  assert.match(thread, /showAvatar/);
  assert.match(thread, /ChatComposer/);
  assert.match(thread, /ChatAudioBubble/);
  assert.match(thread, /showName/);
  assert.match(thread, /alignItems: 'flex-end'/);
  assert.match(thread, /width: '100%'/);
  assert.match(shell, /width: 'max-content'/);
  assert.match(thread, /chatBubbleMaxWidthSx/);
  assert.match(thread, /chatMediaBubbleSx/);
  assert.match(thread, /width: 'max-content'/);
  assert.match(thread, /overflowWrap: 'break-word'/);
  assert.doesNotMatch(thread, /wordBreak: 'break-word'/);
  assert.doesNotMatch(thread, /incomingText/);
  assert.match(thread, /visualViewport/);
  assert.match(composer, /Message\.\.\./);
  assert.match(composer, /Voice message/);
  assert.match(composer, /Take photo/);
  assert.match(composer, /Photo library/);
  assert.match(composer, /Attach file/);
  assert.match(composer, /startVoiceCapture/);
  assert.match(composer, /VoiceRecordBar/);
  assert.match(composer, /demoRecording/);
  assert.match(recordBar, /Discard voice note/);
  assert.match(recordBar, /Pause voice note/);
  assert.match(recordBar, /Send voice note/);
  assert.doesNotMatch(composer, /StopCircle/);
  assert.doesNotMatch(composer, /start\(200\)/);
  assert.match(thread, /ResizeObserver/);
  assert.match(composer, /fontSize: '16px'/);
  assert.match(composer, /tabIndex=\{-1\}/);
  assert.doesNotMatch(composer, /0\.95rem/);
  assert.match(sql, /'audio'/);
  assert.match(sql, /audio\/webm/);
  assert.match(page, /subtitle/);
});

test('appTabFromPath maps Instagram tabs; friends live under profile', () => {
  assert.equal(appTabFromPath('/'), 'home');
  assert.equal(appTabFromPath('/groups'), 'groups');
  assert.equal(appTabFromPath('/groups/g1/settle'), 'groups');
  assert.equal(appTabFromPath('/chat'), 'messages');
  assert.equal(appTabFromPath('/chat/abc'), 'messages');
  assert.equal(appTabFromPath('/friends'), '');
  assert.equal(appTabFromPath('/search'), 'search');
  assert.equal(appTabFromPath('/profile'), 'profile');
});

test('APP_TABS is Home Search Groups Messages Profile with emojis', () => {
  assert.deepEqual(
    APP_TABS.map((t) => t.id),
    ['home', 'search', 'groups', 'messages', 'profile'],
  );
  assert.equal(APP_TABS[0].emoji, '🏠');
  assert.equal(APP_TABS[1].emoji, '🔍');
  assert.equal(APP_TABS[2].emoji, '👥');
  assert.equal(APP_TABS[3].emoji, '💬');
  assert.equal(APP_TABS[4].emoji, '👤');
});

test('shouldShowAppTabBar hides scan, composer, and legal', () => {
  assert.equal(shouldShowAppTabBar('/'), true);
  assert.equal(shouldShowAppTabBar('/groups'), true);
  assert.equal(shouldShowAppTabBar('/chat'), true);
  assert.equal(shouldShowAppTabBar('/friends'), true);
  assert.equal(shouldShowAppTabBar('/search'), true);
  assert.equal(shouldShowAppTabBar('/profile'), true);
  assert.equal(shouldShowAppTabBar('/login'), false);
  assert.equal(shouldShowAppTabBar('/privacy'), false);
  assert.equal(shouldShowAppTabBar('/scan'), false);
  assert.equal(shouldShowAppTabBar('/chat/abc'), false);
  assert.equal(shouldShowAppTabBar('/groups/g1/chat'), false);
  assert.equal(shouldShowAppTabBar('/dev/home-balances'), false);
});

test('shouldShowDesktopNav keeps the left rail on chat threads', () => {
  assert.equal(shouldShowDesktopNav('/'), true);
  assert.equal(shouldShowDesktopNav('/groups'), true);
  assert.equal(shouldShowDesktopNav('/chat'), true);
  assert.equal(shouldShowDesktopNav('/chat/abc'), true);
  assert.equal(shouldShowDesktopNav('/groups/g1/chat'), true);
  assert.equal(shouldShowDesktopNav('/friends'), true);
  assert.equal(shouldShowDesktopNav('/login'), false);
  assert.equal(shouldShowDesktopNav('/privacy'), false);
  assert.equal(shouldShowDesktopNav('/scan'), false);
  assert.equal(shouldShowDesktopNav('/dev/home-balances'), false);
});
