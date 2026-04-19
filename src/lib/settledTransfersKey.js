/**
 * Stable key for a settle-up transfer checkbox (persisted per group).
 * Uses only payer/debtor IDs + tab delimiter — NOT the amount — so FX rounding
 * or rate reloads don't clear "marked settled" after reopening the app.
 */
export function transferStorageKey(t) {
  const from = String(t?.from ?? '');
  const to = String(t?.to ?? '');
  return `${from}\t${to}`;
}

/**
 * Merge stored keys with current transfers; drop keys that don't match any transfer pair.
 * Migrates: legacy `from-to-amount` (hyphen), legacy tab `from\tto\tamount`.
 * @param {string[]} rawList
 * @param {Array<{ from: string, to: string, amount: number }>} transfers
 * @returns {string[]}
 */
export function normalizeStoredSettledKeys(rawList, transfers) {
  const validPairs = new Set(transfers.map((t) => transferStorageKey(t)));
  const out = new Set();
  const inputs = Array.isArray(rawList) ? rawList.filter((x) => typeof x === 'string') : [];

  for (const k of inputs) {
    if (validPairs.has(k)) {
      out.add(k);
      continue;
    }
    // Newer amount-included tab format (3 parts): migrate to pair-only
    const tabParts = k.split('\t');
    if (tabParts.length === 3) {
      const pair = `${tabParts[0]}\t${tabParts[1]}`;
      if (validPairs.has(pair)) out.add(pair);
      continue;
    }
    if (tabParts.length === 2 && validPairs.has(k)) {
      out.add(k);
      continue;
    }
    // Legacy hyphen: uuid-uuid-amount (fragile; match known transfer pairs)
    if (!k.includes('\t')) {
      for (const t of transfers) {
        const legacy = `${t.from}-${t.to}-${t.amount}`;
        const legacy2 = `${t.from}-${t.to}-${(Math.round(Number(t.amount) * 100) / 100).toFixed(2)}`;
        if (k === legacy || k === legacy2) {
          out.add(transferStorageKey(t));
          break;
        }
      }
    }
  }
  return [...out].filter((key) => validPairs.has(key));
}
