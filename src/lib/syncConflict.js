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
 * updatedAt on groups we actually wrote. When `dropMissingSkipped` is set
 * (successful reload), skipped IDs absent from the server snapshot are
 * removed locally (deleted group or lost membership).
 */
export function applyPersistResult(
  localGroups,
  { skippedIds = [], writtenAt = {}, serverGroups = {}, dropMissingSkipped = false } = {},
) {
  const next = { ...(localGroups || {}) };
  for (const id of skippedIds) {
    if (serverGroups[id]) {
      next[id] = serverGroups[id];
    } else if (dropMissingSkipped) {
      delete next[id];
    }
  }
  for (const [id, iso] of Object.entries(writtenAt)) {
    if (next[id]) next[id] = { ...next[id], updatedAt: iso };
  }
  return next;
}

export function conflictSyncMessage({ skippedIds = [], reloaded = true } = {}) {
  if (!skippedIds.length) return '';
  const many = skippedIds.length > 1;
  if (!reloaded) {
    return many
      ? 'Some groups were updated on another device. Couldn’t reload the server copies. Your edits were not saved. Tap Retry.'
      : 'This group was updated on another device. Couldn’t reload the server copy. Your edits were not saved. Tap Retry.';
  }
  return many
    ? 'Some groups were updated on another device. Reloaded the server copies so you don’t overwrite them.'
    : 'This group was updated on another device. Reloaded the server copy so you don’t overwrite it.';
}

export function shouldApplySkipReload({ reloaded, persistGen, currentGen }) {
  return Boolean(reloaded) && persistGen === currentGen;
}

export function withPersistPartial(err, { skippedIds = [], writtenAt = {} } = {}) {
  const wrapped = err instanceof Error ? err : new Error(String(err));
  wrapped.persistPartial = { skippedIds, writtenAt };
  return wrapped;
}
