/**
 * Supabase friends + profiles (requires migrations/20260419120000_profiles_and_friends.sql).
 */

import { getSupabase } from './supabaseClient.js';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;

export function isValidUsername(s) {
  return typeof s === 'string' && USERNAME_RE.test(s.trim());
}

export async function fetchMyProfile() {
  const sb = getSupabase();
  if (!sb) return null;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data, error } = await sb.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertMyProfile({ username, displayName }) {
  const sb = getSupabase();
  if (!sb) throw new Error('Not configured');
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const un = typeof username === 'string' ? username.trim() : '';
  if (!isValidUsername(un)) throw new Error('Username must be 3–30 letters, numbers, or underscores.');
  const email = user.email ? user.email.toLowerCase().trim() : null;
  const { error } = await sb.from('profiles').upsert(
    {
      user_id: user.id,
      username: un,
      display_name: displayName?.trim() || un,
      email_lookup: email,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) throw error;
}

export async function searchPeople(query) {
  const sb = getSupabase();
  if (!sb) return [];
  const q = String(query || '').trim();
  if (q.length < 2) return [];
  if (q.includes('@')) {
    const { data, error } = await sb.rpc('find_profile_by_email_exact', { lookup_email: q });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return row?.user_id ? [row] : [];
  }
  const { data, error } = await sb.rpc('search_profiles_by_username', {
    prefix: q,
    lim: 25,
  });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function sendFriendRequest(toUserId) {
  const sb = getSupabase();
  if (!sb) throw new Error('Not configured');
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error('Not signed in');
  if (toUserId === user.id) throw new Error('You can’t add yourself.');
  const { error } = await sb.from('friend_requests').insert({
    from_user_id: user.id,
    to_user_id: toUserId,
    status: 'pending',
  });
  if (error) throw error;
}

export async function listIncomingRequests() {
  const sb = getSupabase();
  if (!sb) return [];
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return [];
  const { data, error } = await sb
    .from('friend_requests')
    .select('id, from_user_id, created_at')
    .eq('to_user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listOutgoingRequests() {
  const sb = getSupabase();
  if (!sb) return [];
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return [];
  const { data, error } = await sb
    .from('friend_requests')
    .select('id, to_user_id, created_at')
    .eq('from_user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function acceptFriendRequest(requestId) {
  const sb = getSupabase();
  if (!sb) throw new Error('Not configured');
  const { error } = await sb.rpc('accept_friend_request', { request_id: requestId });
  if (error) throw error;
}

export async function declineFriendRequest(requestId) {
  const sb = getSupabase();
  if (!sb) throw new Error('Not configured');
  const { error } = await sb.rpc('decline_friend_request', { request_id: requestId });
  if (error) throw error;
}

export async function cancelFriendRequest(requestId) {
  const sb = getSupabase();
  if (!sb) throw new Error('Not configured');
  const { error } = await sb.rpc('cancel_friend_request', { request_id: requestId });
  if (error) throw error;
}

export async function listFriends() {
  const sb = getSupabase();
  if (!sb) return [];
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return [];
  const { data: rows, error } = await sb
    .from('friendships')
    .select('user_a, user_b')
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);
  if (error) throw error;
  const friendIds = (rows || []).map((r) => (r.user_a === user.id ? r.user_b : r.user_a));
  if (friendIds.length === 0) return [];
  const { data: profs, error: pErr } = await sb
    .from('profiles')
    .select('user_id, username, display_name')
    .in('user_id', friendIds);
  if (pErr) throw pErr;
  return profs || [];
}

export async function removeFriend(otherUserId) {
  const sb = getSupabase();
  if (!sb) throw new Error('Not configured');
  const { error } = await sb.rpc('remove_friendship', { other_user_id: otherUserId });
  if (error) throw error;
}

export async function getProfilesByIds(ids) {
  if (!ids?.length) return [];
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('profiles')
    .select('user_id, username, display_name')
    .in('user_id', ids);
  if (error) throw error;
  return data || [];
}
