/**
 * Group-level persist conflict checks. Local `updatedAt` is the last *server*
 * timestamp we loaded or successfully saved — not a client-edited clock.
 */

export function isStaleGroupWrite(localUpdatedAt, serverUpdatedAt) {
  if (!serverUpdatedAt) return false;
  if (!localUpdatedAt) return false;
  const localMs = Date.parse(localUpdatedAt);
  const serverMs = Date.parse(serverUpdatedAt);
  if (!Number.isFinite(localMs) || !Number.isFinite(serverMs)) return false;
  return serverMs > localMs;
}

/**
 * @param {{ localIds: string[], remoteMemberships: Array<{ group_id: string, role?: string }> }} args
 */
export function planRemoteGroupRemovals({ localIds, remoteMemberships }) {
  const local = new Set(localIds || []);
  const deleteGroupIds = [];
  const leaveGroupIds = [];
  for (const row of remoteMemberships || []) {
    if (local.has(row.group_id)) continue;
    if (row.role === 'owner') deleteGroupIds.push(row.group_id);
    else leaveGroupIds.push(row.group_id);
  }
  return { deleteGroupIds, leaveGroupIds };
}

/**
 * After persist: drop skipped groups in favor of the server copy; stamp
 * updatedAt on groups we actually wrote.
 */
export function applyPersistResult(localGroups, { skippedIds = [], writtenAt = {}, serverGroups = {} } = {}) {
  const next = { ...(localGroups || {}) };
  for (const id of skippedIds) {
    if (serverGroups[id]) next[id] = serverGroups[id];
  }
  for (const [id, iso] of Object.entries(writtenAt)) {
    if (next[id]) next[id] = { ...next[id], updatedAt: iso };
  }
  return next;
}
