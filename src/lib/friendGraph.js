/** Pure friend-list merge for Friends / Search. No Supabase. */

export function profileDisplayName(profile) {
  if (!profile) return '';
  const f = profile.first_name?.trim();
  const l = profile.last_name?.trim();
  if (f && l) return `${f} ${l}`;
  if (f) return f;
  if (l) return l;
  return profile.display_name?.trim() || profile.username || '';
}

export function buildFriendGraph(incoming, outgoing, friends, requestProfiles) {
  const nameById = {};
  for (const pr of requestProfiles || []) {
    if (!pr?.user_id) continue;
    nameById[pr.user_id] = profileDisplayName(pr) || pr.user_id;
  }
  return {
    incoming: incoming || [],
    outgoing: outgoing || [],
    friends: friends || [],
    nameById,
  };
}
