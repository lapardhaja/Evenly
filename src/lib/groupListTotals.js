import { formatMoneyWithCode } from './currencies.js';

export const GROUP_TOTAL_FX_FAILED_COPY =
  'Couldn’t convert all totals to one currency. Amounts may mix currencies.';

export function groupListTotalDisplay({ convertedTotal, totalSpent, displayCurrency }) {
  const amount = convertedTotal != null ? convertedTotal : totalSpent;
  return formatMoneyWithCode(amount, displayCurrency);
}

export function groupListFxFailed({ fxReady, groups, convertedTotals }) {
  if (!fxReady || !groups?.length) return false;
  return groups.some((g) => convertedTotals[g.id] == null);
}
