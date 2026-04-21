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

export function isPullToRefreshDisabledForRoute(pathname) {
  return pathname.startsWith('/shared-settlement/');
}

export function shouldUsePullToRefreshLayout(onLoginRoute) {
  return !onLoginRoute;
}
