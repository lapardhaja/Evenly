import { getSupabase, isSupabaseConfigured } from './supabaseClient.js';
import { friendlyFriendInviteError } from './friendInvite.js';

function clientOrThrow() {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
  const client = getSupabase();
  if (!client) throw new Error('Supabase not configured');
  return client;
}

export async function addFriendToGroup(groupId, friendUserId) {
  const supabase = clientOrThrow();
  const { error } = await supabase.rpc('add_friend_to_group', {
    p_group_id: groupId,
    p_friend_user_id: friendUserId,
  });
  if (error) throw new Error(friendlyFriendInviteError(error));
}

export async function leaveGroup(groupId) {
  const supabase = clientOrThrow();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) throw new Error('Not signed in');

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .eq('role', 'member');
  if (error) throw error;
}

export async function removeMember(groupId, userId) {
  const supabase = clientOrThrow();
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .eq('role', 'member');
  if (error) throw error;
}
