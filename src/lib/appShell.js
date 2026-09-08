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
];

/** Routes that skip profile gate, data bootstrap, and pull-to-refresh layout. */
export function isPublicExemptRoute(pathname) {
  if (pathname.startsWith('/shared-settlement')) return true;
  return PUBLIC_EXEMPT_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isPullToRefreshDisabledForRoute(pathname) {
  return isPublicExemptRoute(pathname);
}

export function shouldUsePullToRefreshLayout(onLoginRoute) {
  return !onLoginRoute;
}
