export function normalizeItemName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function personMatchKey(person) {
  const linked = typeof person?.linkedUserId === 'string' ? person.linkedUserId.trim() : '';
  if (linked) return `u:${linked}`;
  return `n:${normalizeItemName(person?.name)}`;
}

export function everyoneShares(personIds) {
  const shares = {};
  for (const id of personIds || []) {
    if (id) shares[id] = 1;
  }
  return shares;
}

export function justMeShares(personId) {
  if (!personId) return {};
  return { [personId]: 1 };
}

export function toggleShare(shares, personId, itemQty) {
  const current = Number(shares?.[personId]) || 0;
  if (Math.floor(Number(itemQty) || 0) !== 1) return current;
  return current > 0 ? 0 : 1;
}

export function matchLastItemShares({ lastSharesByPersonKey, newPeople }) {
  if (!lastSharesByPersonKey || !newPeople?.length) return null;
  const shares = {};
  for (const person of newPeople) {
    if (!person?.id) continue;
    const qty = lastSharesByPersonKey[personMatchKey(person)];
    const q = Number(qty);
    if (!Number.isFinite(q) || q < 1) continue;
    shares[person.id] = q;
  }
  return Object.keys(shares).length ? shares : null;
}

export function applyLastReceipt({ lastReceipt, newItems, newPeople }) {
  const result = {};
  const lastItems = lastReceipt?.items || {};
  const lastI2p = lastReceipt?.itemToPersonQuantityMap || {};
  const lastPeople = lastReceipt?.people || [];
  const peopleById = {};
  lastPeople.forEach((p) => {
    if (p?.id) peopleById[p.id] = p;
  });

  const lastIdsByName = {};
  Object.entries(lastItems).forEach(([id, item]) => {
    const key = normalizeItemName(item?.name);
    if (!key) return;
    if (!lastIdsByName[key]) lastIdsByName[key] = [];
    lastIdsByName[key].push(id);
  });

  (newItems || []).forEach((row, index) => {
    const key = normalizeItemName(row?.name);
    const ids = lastIdsByName[key];
    if (!ids || ids.length !== 1) return;
    const lastShares = lastI2p[ids[0]] || {};
    const lastSharesByPersonKey = {};
    Object.entries(lastShares).forEach(([pid, qty]) => {
      const person = peopleById[pid];
      if (!person) return;
      const q = Number(qty);
      if (!Number.isFinite(q) || q < 1) return;
      lastSharesByPersonKey[personMatchKey(person)] = q;
    });
    const shares = matchLastItemShares({ lastSharesByPersonKey, newPeople });
    if (shares) result[index] = shares;
  });
  return result;
}

export function quantityMapsFromIndexedItems(itemsWithIds, sharesByIndex) {
  const itemToPersonQuantityMap = {};
  const personToItemQuantityMap = {};
  (itemsWithIds || []).forEach((row, index) => {
    const itemId = row?.id;
    if (!itemId) return;
    const shares = sharesByIndex?.[index] || sharesByIndex?.[String(index)] || {};
    Object.entries(shares).forEach(([pid, qty]) => {
      const q = Number(qty);
      if (!pid || !Number.isFinite(q) || q < 1) return;
      if (!itemToPersonQuantityMap[itemId]) itemToPersonQuantityMap[itemId] = {};
      itemToPersonQuantityMap[itemId][pid] = q;
      if (!personToItemQuantityMap[pid]) personToItemQuantityMap[pid] = {};
      personToItemQuantityMap[pid][itemId] = q;
    });
  });
  return { personToItemQuantityMap, itemToPersonQuantityMap };
}
