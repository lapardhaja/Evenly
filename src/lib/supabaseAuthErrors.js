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
      message:
        'That email already has an account. Sign in instead, or use a different email.',
    };
  }

  return {
    isEmailTaken: false,
    message: raw || 'Something went wrong. Please try again.',
  };
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
    return 'Incorrect email or password. Try again or use “Sign up” if you need a new account.';
  }

  if (/email not confirmed/i.test(raw)) {
    return 'Confirm your email first (check your inbox), then try signing in.';
  }

  return raw || 'Sign in failed. Please try again.';
}
