export const APP_SHELL_HEIGHT = '100dvh';

export const appShellRootSx = {
  flexGrow: 1,
  height: APP_SHELL_HEIGHT,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

export const appShellContentSx = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

export const PUBLIC_EXEMPT_ROUTES = [
  '/login',
  '/update-password',
  '/profile-setup',
  '/privacy',
  '/terms',
  '/cookies',
  '/copyright',
  '/security',
  '/share',
];

/** Routes that skip profile gate, data bootstrap, and pull-to-refresh layout. */
export function isPublicExemptRoute(pathname) {
  if (pathname.startsWith('/shared-settlement')) return true;
  return PUBLIC_EXEMPT_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** DM thread (`/chat/:id`) or group Chat tab — composer must dock to the layout bottom. */
export function isChatComposerRoute(pathname) {
  if (pathname === '/dev/chat-layout') return true;
  if (pathname.startsWith('/chat/')) return pathname.length > '/chat/'.length;
  return /^\/groups\/[^/]+\/chat\/?$/.test(pathname);
}

export function isPullToRefreshDisabledForRoute(pathname) {
  if (isPublicExemptRoute(pathname)) return true;
  if (isChatComposerRoute(pathname)) return true;
  return false;
}

export function shouldUsePullToRefreshLayout(onLoginRoute) {
  return !onLoginRoute;
}

/** In-flow legal strip steals height and parks the composer mid-screen. Hide it on threads. */
export function shouldShowAppLegalFooter(pathname) {
  return !isChatComposerRoute(pathname);
}

/** Inner wrapper under `#evenly-main-scroll` on composer routes — must not become a scroller. */
export const chatFillChildSx = {
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
};

/** Fill the shell content box. Flex-only — height 100% fails when the parent is a flex item. */
export const chatThreadPageSx = {
  py: 1,
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  height: '100%',
  overflow: 'hidden',
  width: '100%',
  boxSizing: 'border-box',
};

/** Inbox + thread: fill the phone, use a wide column on desktop (MUI sm is 600px). */
export const CHAT_CONTAINER_MAX_WIDTH = 'lg';

export const chatBubbleMaxWidthSx = {
  maxWidth: { xs: '85%', md: 560, lg: 640 },
  // max-content, not fit-content: Safari min-content is the longest word, which
  // wraps "Hey team" in a shrink-to-fit outgoing column.
  width: 'max-content',
};

export const chatThreadRootSx = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  height: '100%',
  overflow: 'hidden',
};

export const CHAT_COMPOSER_MOBILE_CLEARANCE =
  'calc(92px + env(safe-area-inset-bottom, 0px) + var(--evenly-vv-bottom, 0px) + var(--evenly-cookie-banner-offset, 0px))';

export const chatMessagesSx = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  overscrollBehaviorY: 'contain',
  WebkitOverflowScrolling: 'touch',
  px: { xs: 0.5, md: 1.5 },
  pt: { xs: 1, md: 1.5 },
  pb: { xs: CHAT_COMPOSER_MOBILE_CLEARANCE, md: 1.5 },
};

export const chatComposerBarSx = {
  display: 'flex',
  gap: 1,
  alignItems: 'flex-end',
  flexShrink: 0,
  mt: 'auto',
  position: { xs: 'fixed', md: 'relative' },
  left: { xs: 0, md: 'auto' },
  right: { xs: 0, md: 'auto' },
  bottom: {
    xs: 'calc(var(--evenly-cookie-banner-offset, 0px) + var(--evenly-vv-bottom, 0px))',
    md: 'auto',
  },
  zIndex: { xs: 8, md: 1 },
  bgcolor: 'background.default',
  px: { xs: 1, md: 0 },
  pt: 1,
  pb: {
    xs: 'max(10px, calc(env(safe-area-inset-bottom, 0px) - var(--evenly-vv-bottom, 0px)))',
    md: 1,
  },
  borderTop: { xs: '1px solid', md: 0 },
  borderColor: 'divider',
};

export const pullToRefreshFillSx = {
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  overscrollBehaviorY: 'none',
  position: 'relative',
};

/** Default main scroller (groups, friends, inbox). Flex column so a short page still fills the viewport. */
export const pullToRefreshScrollSx = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  overscrollBehaviorY: 'contain',
  WebkitOverflowScrolling: 'touch',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
};

/** Wrap page + legal footer so the strip sits at the bottom of a short desktop viewport. */
export const appShellFooterPinSx = {
  minHeight: '100%',
  flex: '1 0 auto',
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
  width: '100%',
};

export const appShellFooterPinMainSx = {
  flex: '1 0 auto',
};

export const appLegalFooterSx = {
  py: 2,
  px: 2,
  pb: {
    xs: 'calc(88px + var(--evenly-tab-bar-offset, 0px) + env(safe-area-inset-bottom, 0px) + var(--evenly-cookie-banner-offset, 0px))',
    sm: 'calc(24px + var(--evenly-cookie-banner-offset, 0px))',
  },
  textAlign: 'center',
  borderTop: '1px solid',
  borderColor: 'divider',
  flexShrink: 0,
  mt: 'auto',
};

export const APP_TAB_BAR_HEIGHT_PX = 56;

/** Instagram order. Phone uses MUI icons; desktop header uses emoji + label. */
export const APP_TABS = [
  { id: 'home', label: 'Home', emoji: '🏠' },
  { id: 'search', label: 'Search', emoji: '🔍' },
  { id: 'groups', label: 'Groups', emoji: '👥' },
  { id: 'messages', label: 'Messages', emoji: '💬' },
  { id: 'profile', label: 'Profile', emoji: '👤' },
];

/** Which primary tab a path belongs to. Empty = none (legal, scan, invites). */
export function appTabFromPath(pathname) {
  const p = pathname || '/';
  if (p === '/' || p === '') return 'home';
  if (p.startsWith('/search')) return 'search';
  if (p.startsWith('/groups')) return 'groups';
  if (p.startsWith('/chat')) return 'messages';
  if (p.startsWith('/profile')) return 'profile';
  return '';
}

/**
 * Phone tab bar: Home / Search / Groups / Messages / Profile (Instagram order).
 * Hidden on auth, legal, scan, invite, and chat composer so those stay full-bleed.
 */
export function shouldShowAppTabBar(pathname) {
  if (isPublicExemptRoute(pathname)) return false;
  if (isChatComposerRoute(pathname)) return false;
  if (pathname.startsWith('/scan')) return false;
  if (pathname.startsWith('/join') || pathname.startsWith('/add')) return false;
  if (pathname.startsWith('/dev/')) return false;
  return true;
}
