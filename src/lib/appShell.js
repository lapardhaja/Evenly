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
  '/share',
];

/** Routes that skip profile gate, data bootstrap, and pull-to-refresh layout. */
export function isPublicExemptRoute(pathname) {
  if (pathname.startsWith('/shared-settlement')) return true;
  return PUBLIC_EXEMPT_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** DM thread (`/chat/:id`) or group Chat tab — composer must dock to the layout bottom. */
export function isChatComposerRoute(pathname) {
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
  overflow: 'hidden',
  width: '100%',
  boxSizing: 'border-box',
};

/** Inbox + thread: fill the phone, use a wide column on desktop (MUI sm is 600px). */
export const CHAT_CONTAINER_MAX_WIDTH = 'lg';

export const chatBubbleMaxWidthSx = {
  maxWidth: { xs: '85%', md: 560, lg: 640 },
};

export const chatThreadRootSx = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
};

export const chatMessagesSx = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  overscrollBehaviorY: 'contain',
  WebkitOverflowScrolling: 'touch',
  px: { xs: 0.5, md: 1.5 },
  py: { xs: 1, md: 1.5 },
};

export const chatComposerBarSx = {
  display: 'flex',
  gap: 1,
  alignItems: 'flex-end',
  flexShrink: 0,
  pt: 1,
  pb: 1,
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
    xs: 'calc(88px + env(safe-area-inset-bottom, 0px) + var(--evenly-cookie-banner-offset, 0px))',
    sm: 'calc(24px + var(--evenly-cookie-banner-offset, 0px))',
  },
  textAlign: 'center',
  borderTop: '1px solid',
  borderColor: 'divider',
  flexShrink: 0,
  mt: 'auto',
};
