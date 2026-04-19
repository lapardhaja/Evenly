/**
 * Stable key for a settle-up transfer (for persistence / checkbox state).
 * Uses tab delimiter so UUIDs in from/to are unambiguous (hyphens in UUIDs break "a-b-c" parsing).
 */
export function transferStorageKey(t) {
  const from = String(t?.from ?? '');
  const to = String(t?.to ?? '');
  let amt = Number(t?.amount);
  if (!Number.isFinite(amt)) amt = 0;
  const rounded = Math.round(amt * 100) / 100;
  return `${from}\t${to}\t${rounded}`;
}

/**
 * Merge legacy hyphen keys (ambiguous with UUIDs; best-effort) and prune to current transfers.
 * @param {string[]} rawList
 * @param {Array<{ from: string, to: string, amount: number }>} transfers
 * @returns {string[]}
 */
export function normalizeStoredSettledKeys(rawList, transfers) {
  const valid = new Set(transfers.map((t) => transferStorageKey(t)));
  const out = new Set();
  const inputs = Array.isArray(rawList) ? rawList.filter((x) => typeof x === 'string') : [];
  for (const k of inputs) {
    if (valid.has(k)) {
      out.add(k);
      continue;
    }
    if (k.includes('\t')) continue;
    for (const t of transfers) {
      const legacy = `${t.from}-${t.to}-${t.amount}`;
      const legacy2 = `${t.from}-${t.to}-${(Math.round(Number(t.amount) * 100) / 100).toFixed(2)}`;
      if (k === legacy || k === legacy2) {
        out.add(transferStorageKey(t));
        break;
      }
    }
  }
  return [...out].filter((k) => valid.has(k));
}
