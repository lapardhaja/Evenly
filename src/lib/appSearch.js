export function normalizeSearchQuery(q) {
  return String(q || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function filterGroupsForSearch(groups, q, { emptyLimit = 12 } = {}) {
  const list = Array.isArray(groups) ? groups : [];
  const n = normalizeSearchQuery(q);
  if (!n) return list.slice(0, emptyLimit);
  return list.filter((g) => String(g.name || '').toLowerCase().includes(n));
}

function receiptMatchesQuery(receipt, n) {
  const title = String(receipt?.title || '').trim().toLowerCase();
  if (title.includes(n)) return true;
  for (const item of Object.values(receipt?.items || {})) {
    if (String(item?.name || '').toLowerCase().includes(n)) return true;
  }
  return false;
}

export function filterReceiptsForSearch(groupsMap, q, { limit = 20 } = {}) {
  const n = normalizeSearchQuery(q);
  if (!n || n.length < 2) return [];
  const out = [];
  for (const [groupId, g] of Object.entries(groupsMap || {})) {
    for (const [receiptId, r] of Object.entries(g?.receipts || {})) {
      if (!receiptMatchesQuery(r, n)) continue;
      out.push({
        groupId,
        groupName: g?.name || 'Group',
        receiptId,
        title: String(r?.title || '').trim() || 'Receipt',
        date: Number(r?.date) || 0,
      });
    }
  }
  out.sort((a, b) => b.date - a.date || a.title.localeCompare(b.title));
  return out.slice(0, limit);
}

export function filterGroupPeopleForSearch(groupsMap, q, { limit = 20 } = {}) {
  const n = normalizeSearchQuery(q);
  if (!n || n.length < 2) return [];
  const out = [];
  for (const [groupId, g] of Object.entries(groupsMap || {})) {
    for (const [personId, p] of Object.entries(g?.people || {})) {
      const name = String(p?.name || '').trim();
      if (!name.toLowerCase().includes(n)) continue;
      out.push({
        groupId,
        groupName: g?.name || 'Group',
        personId,
        name,
      });
    }
  }
  out.sort((a, b) => a.name.localeCompare(b.name) || a.groupName.localeCompare(b.groupName));
  return out.slice(0, limit);
}
