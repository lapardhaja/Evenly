/** Who can Pay vs Request on a settle transfer row. */
export function settleRowActions({ iAmParty = false, iAmDebtor = false, isSettled = false } = {}) {
  if (!iAmParty || isSettled) return { pay: false, request: false };
  if (iAmDebtor) return { pay: true, request: false };
  return { pay: false, request: true };
}
