import currency from 'currency.js';

/**
 * Plain-text summary for messaging (copy / system share).
 * Keeps wording simple for group chats.
 */
export function formatSettlementSummaryText({
  groupName,
  transfers,
  peopleById,
  missingPayerReceiptTitles = [],
}) {
  const title = (groupName && String(groupName).trim()) || 'Group';
  const lines = [`${title} — Settle up`, ''];

  if (!transfers?.length) {
    lines.push('Everyone is settled up — no payments needed.');
  } else {
    transfers.forEach((t) => {
      const from = peopleById?.[t.from]?.name?.trim() || 'Someone';
      const to = peopleById?.[t.to]?.name?.trim() || 'Someone';
      const amt = currency(t.amount).format();
      lines.push(`${from} pays ${to} ${amt}`);
    });
  }

  if (missingPayerReceiptTitles.length > 0) {
    lines.push('');
    if (missingPayerReceiptTitles.length === 1) {
      lines.push(
        `Note: "${missingPayerReceiptTitles[0]}" has no payer set — totals may be off until you set one.`,
      );
    } else {
      lines.push(
        `Note: ${missingPayerReceiptTitles.length} receipts have no payer set — totals may be off until you set them.`,
      );
    }
  }

  lines.push('', '— Evenly');
  return lines.join('\n');
}
