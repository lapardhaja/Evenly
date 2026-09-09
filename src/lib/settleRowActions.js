/** Who can Pay vs Request on a settle transfer row. */
export function settleRowActions({ iAmParty = false, iAmDebtor = false, isSettled = false } = {}) {
  if (!iAmParty || isSettled) return { pay: false, request: false };
  if (iAmDebtor) return { pay: true, request: false };
  return { pay: false, request: true };
}

/** Chat payment card: debtor pays; creditor does not get Pay / I paid. */
export function paymentCardActions({ isParty = false, isDebtor = false, status = '' } = {}) {
  if (!isParty || status !== 'requested') return { pay: false, markPaid: false };
  if (isDebtor) return { pay: true, markPaid: true };
  return { pay: false, markPaid: false };
}
