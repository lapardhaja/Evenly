export function normalizeMemberRole(role) {
  if (role === 'owner' || role === 'member') return role;
  return null;
}

export function canDeleteGroup(role) {
  return normalizeMemberRole(role) === 'owner';
}

export function groupListBadge(role, ownerUserId, currentUserId) {
  const r = normalizeMemberRole(role);
  if (r === 'owner') return 'owned';
  if (r === 'member') return 'shared';
  if (ownerUserId && currentUserId && ownerUserId === currentUserId) return 'owned';
  if (ownerUserId && currentUserId && ownerUserId !== currentUserId) return 'shared';
  return 'owned';
}
