const SKIP_LINE =
  /^(subtotal|sub\s*total|total|tax|sales\s*tax|change|cash|visa|mastercard|amex|discover|debit|credit|thank|gratuity|tip\s*:|balance|amount\s*due|items?\s*\d|#\d{4,}|phone|tel:|www\.|http|date|time|store|cashier|register|receipt)/i;

function normalizeMoney(str) {
  const s = str.replace(/,/g, '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Heuristic line-item parser from OCR full text.
 */
export function parseReceiptLines(fullText) {
  if (!fullText || typeof fullText !== 'string') return [];

  const lines = fullText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items = [];

  for (const line of lines) {
    if (line.length < 3) continue;
    if (SKIP_LINE.test(line)) continue;
    // Price-only line (already two decimals or whole dollars)
    if (/^\$?\d+(?:[.,]\d{2})?$/.test(line)) continue;
    if (/^\d{8,}$/.test(line.replace(/\s/g, ''))) continue;

    // Trailing price: "1 NOODLES  $11.98" or "1 VEG BURGER  $25" (whole dollars OK)
    const trailing = line.match(/^(.+?)\s+(\$?)(\d+(?:[.,]\d{2})?)\s*$/);
    if (!trailing) continue;

    let name = trailing[1].trim().replace(/\s+/g, ' ');
    const cost = normalizeMoney(trailing[3]);
    if (name.length < 2 || !Number.isFinite(cost) || cost <= 0 || cost > 100_000) continue;

    let quantity = 1;
    const qtyPrefix = name.match(/^(\d{1,3})\s+(.+)$/);
    if (qtyPrefix) {
      const q = parseInt(qtyPrefix[1], 10);
      if (q >= 1 && q <= 999) {
        quantity = q;
        name = qtyPrefix[2].trim();
      }
    }

    if (name.length < 2) continue;

    items.push({
      name: name.slice(0, 200),
      cost,
      quantity,
    });
  }

  return items;
}
