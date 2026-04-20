const REMEMBER_ID_KEY = 'evenly-remember-login-id';

export function getRememberedLoginId() {
  try {
    const v = localStorage.getItem(REMEMBER_ID_KEY);
    return v && typeof v === 'string' ? v : '';
  } catch {
    return '';
  }
}

export function setRememberedLoginId(id) {
  try {
    const s = typeof id === 'string' ? id.trim() : '';
    if (s) localStorage.setItem(REMEMBER_ID_KEY, s);
    else localStorage.removeItem(REMEMBER_ID_KEY);
  } catch {
    /* ignore */
  }
}
