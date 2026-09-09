/** Pure friend-request realtime helpers (no Supabase client import — unit-testable under node:test). */

export const FRIEND_REQUEST_REALTIME_FILTER = {
  event: '*',
  schema: 'public',
  table: 'friend_requests',
};

export function isIncomingPendingFriendRequest(payload, myUserId) {
  if (!payload || !myUserId) return false;
  if (payload.eventType !== 'INSERT') return false;
  const row = payload.new;
  if (!row || row.to_user_id !== myUserId) return false;
  return !row.status || row.status === 'pending';
}

export function incomingFriendRequestSnackText(displayName) {
  const name = typeof displayName === 'string' ? displayName.trim() : '';
  return name ? `${name} sent a friend request` : 'New friend request';
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient | null | undefined} client
 * @param {(payload: object) => void} onChange
 * @param {string} [channelName]
 * @returns {() => void}
 */
export function subscribeToFriendRequests(client, onChange, channelName = 'evenly-friend-requests') {
  if (!client) return () => {};
  const channel = client
    .channel(channelName)
    .on('postgres_changes', FRIEND_REQUEST_REALTIME_FILTER, (payload) => {
      onChange?.(payload);
    })
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}
