/** Map RPC / unique-constraint failures into copy a human can act on. */

export function friendlyFriendInviteError(raw) {
  const m = String(raw?.message || raw || '');
  const lower = m.toLowerCase();
  if (lower.includes('not a group member')) {
    return 'You have to be in this group to add people. Open it from Groups and try again.';
  }
  if (lower.includes('not friends')) {
    return 'You’re not friends yet. Send a request from Friends, wait until they accept, then add them here.';
  }
  if (lower.includes('not authenticated')) {
    return 'Sign in again, then try adding them.';
  }
  if (lower.includes('cannot add self')) {
    return 'That’s you — pick someone else.';
  }
  return m.trim() || 'Couldn’t add them to the group.';
}

export function friendlyFriendRequestError(raw) {
  const code = raw?.code;
  const m = String(raw?.message || raw || '');
  const lower = m.toLowerCase();
  if (code === '23505' || lower.includes('duplicate') || lower.includes('friend_requests_pending')) {
    return 'Request already sent. Wait for them to accept.';
  }
  if (lower.includes('you can’t add yourself') || lower.includes('you can\'t add yourself')) {
    return m;
  }
  return m.trim() || 'Couldn’t send the request.';
}

export function friendSearchAction({ userId, friendIds, outgoingTo, incomingFrom }) {
  if (friendIds?.has(userId)) return { kind: 'friends' };
  if (outgoingTo?.has(userId)) return { kind: 'pending' };
  const incomingId = incomingFrom?.get?.(userId);
  if (incomingId) return { kind: 'accept', requestId: incomingId };
  return { kind: 'request' };
}
