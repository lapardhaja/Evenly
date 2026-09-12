import { formatMoneyWithCode } from './currencies.js';

export const FX_RECEIPT_DATE_CAPTION = 'Each receipt converts at that day’s rate.';

export const GROUP_TOTAL_FX_DATE_COPY = 'Totals convert at each receipt’s date.';

export const GROUP_TOTAL_FX_FAILED_COPY =
  'Couldn’t convert all totals to one currency. Amounts may mix currencies.';

export const SETTLE_FX_DATE_COPY =
  `${FX_RECEIPT_DATE_CAPTION} Wrong currency on a receipt? Fix it there.`;

export function groupListTotalDisplay({ convertedTotal, totalSpent, displayCurrency }) {
  const amount = convertedTotal != null ? convertedTotal : totalSpent;
  return formatMoneyWithCode(amount, displayCurrency);
}

export function groupListFxBanner({ fxReady, groups, convertedTotals }) {
  if (!fxReady || !groups?.length) {
    return { failed: false, dated: false };
  }
  const anyFailed = groups.some((g) => convertedTotals[g.id] == null);
  const anyConverted = groups.some((g) => convertedTotals[g.id] != null);
  return {
    failed: anyFailed,
    dated: anyConverted,
  };
}
