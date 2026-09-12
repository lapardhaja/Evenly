export const DELETE_ACCOUNT_CONFIRM = 'DELETE';

export function canSubmitAccountDeletion(typed) {
  return String(typed || '').trim() === DELETE_ACCOUNT_CONFIRM;
}

export async function requestAccountDeletion({ accessToken, confirm, fetchImpl = fetch }) {
  if (!canSubmitAccountDeletion(confirm)) {
    throw new Error('Type DELETE to confirm.');
  }
  if (!accessToken) {
    throw new Error('Sign in again, then delete your account.');
  }
  const origin = String(import.meta.env?.VITE_SCAN_RECEIPT_URL || '').replace(/\/$/, '');
  const url = `${origin}/api/delete-account`;
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ confirm: DELETE_ACCOUNT_CONFIRM }),
  });
  if (res.status === 204 || res.ok) return;
  if (res.status === 429) {
    throw new Error('Too many attempts. Wait and try again.');
  }
  if (res.status === 503) {
    throw new Error('Account deletion is unavailable. Email support.');
  }
  throw new Error('Could not delete account. Try again or email support.');
}
