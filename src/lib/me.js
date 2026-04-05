/**
 * @param {{ id: string, name: string }[]} participants
 * @param {string} meName
 * @returns {string | null}
 */
export function findMeParticipantId(participants, meName) {
  const t = meName.trim().toLowerCase();
  if (!t) return null;
  const p = participants.find((x) => x.name.trim().toLowerCase() === t);
  return p ? p.id : null;
}
