/**
 * Supabase may return HTTP 200 with no session for (a) new user awaiting email confirm,
 * or (b) duplicate signup when Confirm email + Confirm phone are both on (obfuscated user).
 * Real new signups include at least one identity; duplicates use an empty identities array.
 *
 * @param {{ user?: { identities?: unknown[] } | null; session?: unknown | null } | null | undefined} data
 * @returns {'logged_in' | 'awaiting_confirmation' | 'likely_already_registered'}
 */
export function classifySignUpResponse(data) {
  if (data?.session) return 'logged_in';
  const identities = data?.user?.identities;
  const hasIdentity = Array.isArray(identities) && identities.length > 0;
  if (hasIdentity) return 'awaiting_confirmation';
  return 'likely_already_registered';
}

/**
 * Map Supabase Auth errors to safe, clear UI copy.
 * @param {import('@supabase/supabase-js').AuthError | Error | null | undefined} err
 * @returns {{ isEmailTaken: boolean, message: string }}
 */
export function formatSignUpError(err) {
  const raw = String(err?.message || '');
  const code = String(err?.code || '');

  // Supabase / GoTrue variants for "this email is already registered"
  const emailTaken =
    code === 'user_already_exists' ||
    /user already registered/i.test(raw) ||
    /already registered/i.test(raw) ||
    /email address is already/i.test(raw) ||
    /already exists/i.test(raw);

  if (emailTaken) {
    return {
      isEmailTaken: true,
      message: 'That email is already in use. Sign in or use a different email.',
    };
  }

  const generic = 'Something went wrong. Try again.';
  if (!raw) return { isEmailTaken: false, message: generic };
  if (/supabase|gotrue|fetch|network|500|401|403/i.test(raw) && raw.length > 80) {
    return { isEmailTaken: false, message: generic };
  }
  return { isEmailTaken: false, message: raw };
}

/**
 * Sign-in: keep message generic (do not reveal whether the email exists).
 */
export function formatSignInError(err) {
  const raw = String(err?.message || '');
  const code = String(err?.code || '');

  if (
    code === 'invalid_credentials' ||
    /invalid login credentials/i.test(raw) ||
    /invalid email or password/i.test(raw)
  ) {
    return 'Wrong email or password.';
  }

  if (/email not confirmed/i.test(raw)) {
    return 'Confirm your email from your inbox, then try again.';
  }

  if (!raw) return 'Couldn’t sign in. Try again.';
  if (/supabase|gotrue|fetch|network/i.test(raw) && raw.length > 80) {
    return 'Couldn’t sign in. Try again.';
  }
  return raw;
}
