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

/** Fill the shell content box (AppBar already subtracted). Do not use 100dvh − N. */
export const chatThreadPageSx = {
  py: 1,
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  height: '100%',
  maxHeight: '100%',
  boxSizing: 'border-box',
};

export const chatThreadRootSx = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  height: '100%',
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
  overscrollBehaviorY: 'contain',
  WebkitOverflowScrolling: 'touch',
  position: 'relative',
};
