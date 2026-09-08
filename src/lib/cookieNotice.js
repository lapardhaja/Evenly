export const COOKIE_NOTICE_KEY = 'evenly:cookie-notice:v1';

export function hasDismissedCookieNotice() {
  try {
    return localStorage.getItem(COOKIE_NOTICE_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissCookieNotice() {
  try {
    localStorage.setItem(COOKIE_NOTICE_KEY, '1');
  } catch {
    /* ignore */
  }
}
