const REMEMBER_ID_KEY = 'evenly-remember-login-id';
const PREF_SAVE_PASSWORD_KEY = 'evenly-pref-offer-save-password';

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

export function getPrefOfferSavePassword() {
  try {
    return localStorage.getItem(PREF_SAVE_PASSWORD_KEY) === '1';
  } catch {
    return false;
  }
}

export function setPrefOfferSavePassword(on) {
  try {
    if (on) localStorage.setItem(PREF_SAVE_PASSWORD_KEY, '1');
    else localStorage.removeItem(PREF_SAVE_PASSWORD_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Lets the browser / OS save the password (iOS Keychain, Google Password Manager).
 * User may then unlock with Face ID / fingerprint to autofill — we never store the password.
 */
export function canOfferDevicePasswordSave() {
  if (typeof window === 'undefined') return false;
  return (
    window.isSecureContext &&
    typeof window.PasswordCredential === 'function' &&
    typeof window.navigator?.credentials?.store === 'function'
  );
}

export async function storePasswordWithBrowser({ id, password }) {
  if (typeof window === 'undefined') return false;
  if (!window.isSecureContext) return false;
  const PasswordCredential = window.PasswordCredential;
  const nav = window.navigator;
  if (!PasswordCredential || !nav?.credentials?.store) return false;
  if (!id || !password) return false;
  try {
    const cred = new PasswordCredential({
      id: String(id).trim(),
      password: String(password),
      name: String(id).trim(),
    });
    await nav.credentials.store(cred);
    return true;
  } catch {
    return false;
  }
}
