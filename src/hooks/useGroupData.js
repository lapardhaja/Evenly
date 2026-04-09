import { useMemo, useCallback } from 'react';
import currency from 'currency.js';
import { useGroupsData } from '../context/GroupsDataContext.jsx';
import { v4 as uuidv4 } from 'uuid';
import { idMapToList } from '../functions/utils.js';
import { receiptGrandTotal, taxableSubtotalAfterDiscount } from '../functions/receiptTotals.js';

// ─── Groups list ────────────────────────────────────────────────────────

export function useGroups() {
  const { data, setData } = useGroupsData();

  const groups = useMemo(
    () =>
      Object.entries(data.groups || {}).map(([id, g]) => {
        const receipts = idMapToList(g.receipts);
        const people = idMapToList(g.people);
        const totalSpent = receipts.reduce((sum, r) => {
          const items = idMapToList(r.items);
          const sub = items.reduce((s, i) => currency(s).add(i.cost).value, 0);
          return currency(sum).add(sub).add(r.taxCost || 0).add(r.tipCost || 0).value;
        }, 0);
        return { ...g, id, receiptCount: receipts.length, peopleCount: people.length, totalSpent };
      }),
    [data.groups],
  );

  const addGroup = useCallback(
    (name) => {
      const id = uuidv4();
      setData((prev) => ({
        ...prev,
        groups: {
          ...prev.groups,
          [id]: { name, date: Date.now(), people: {}, receipts: {} },
        },
      }));
      return id;
    },
    [setData],
  );

  const deleteGroup = useCallback(
    (groupId) => {
      setData((prev) => {
        const groups = { ...prev.groups };
        delete groups[groupId];
        return { ...prev, groups };
      });
    },
    [setData],
  );

  const getGroupSnapshot = useCallback(
    (groupId) => {
      const raw = data.groups?.[groupId];
      if (!raw) return null;
      try {
        return JSON.parse(JSON.stringify(raw));
      } catch {
        return null;
      }
    },
    [data.groups],
  );

  const restoreGroup = useCallback(
    (groupId, snapshot) => {
      if (!snapshot || !groupId) return;
      setData((prev) => ({
        ...prev,
        groups: { ...prev.groups, [groupId]: snapshot },
      }));
    },
    [setData],
  );

  return { groups, addGroup, deleteGroup, getGroupSnapshot, restoreGroup };
}

// ─── Single group ───────────────────────────────────────────────────────

export function useGroup(groupId) {
  const { data, setData } = useGroupsData();

  const group = useMemo(() => {
    if (!data.groups?.[groupId]) return null;
    return { ...data.groups[groupId], id: groupId };
  }, [data.groups, groupId]);

  const people = useMemo(() => idMapToList(group?.people), [group?.people]);

  const receipts = useMemo(() => {
    return idMapToList(group?.receipts).map((r) => {
      const items = idMapToList(r.items);
      const subTotal = items.reduce((s, i) => currency(s).add(i.cost).value, 0);
      const total = receiptGrandTotal(subTotal, r.discountCost, r.taxCost, r.tipCost);
      return { ...r, total, subTotal };
    });
  }, [group?.receipts]);

  const updateGroup = useCallback(
    (key, value) => {
      setData((prev) => ({
        ...prev,
        groups: {
          ...prev.groups,
          [groupId]: { ...prev.groups[groupId], [key]: value },
        },
      }));
    },
    [groupId, setData],
  );

  const renameGroup = useCallback(
    (name) => updateGroup('name', name),
    [updateGroup],
  );

  // ── People CRUD ───────────────────────────────────────────────────

  const addPerson = useCallback(
    (name) => {
      const id = uuidv4();
      setData((prev) => {
        const g = { ...prev.groups[groupId] };
        g.people = { ...g.people, [id]: { name } };
        return { ...prev, groups: { ...prev.groups, [groupId]: g } };
      });
      return id;
    },
    [groupId, setData],
  );

  const updatePerson = useCallback(
    (person) => {
      setData((prev) => {
        const g = { ...prev.groups[groupId] };
        const { id, ...rest } = person;
        g.people = { ...g.people, [id]: rest };
        return { ...prev, groups: { ...prev.groups, [groupId]: g } };
      });
    },
    [groupId, setData],
  );

  const removePerson = useCallback(
    (personId) => {
      setData((prev) => {
        const g = { ...prev.groups[groupId] };
        const people = { ...g.people };
        delete people[personId];

        const receipts = { ...g.receipts };
        Object.keys(receipts).forEach((rid) => {
          const r = { ...receipts[rid] };
          if (r.paidById === personId) r.paidById = '';
          const p2i = { ...r.personToItemQuantityMap };
          delete p2i[personId];
          const i2p = { ...r.itemToPersonQuantityMap };
          Object.keys(i2p).forEach((iid) => {
            const m = { ...i2p[iid] };
            delete m[personId];
            i2p[iid] = m;
          });
          r.personToItemQuantityMap = p2i;
          r.itemToPersonQuantityMap = i2p;
          receipts[rid] = r;
        });

        g.people = people;
        g.receipts = receipts;
        return { ...prev, groups: { ...prev.groups, [groupId]: g } };
      });
    },
    [groupId, setData],
  );

  // ── Receipts CRUD ─────────────────────────────────────────────────

  const addReceipt = useCallback(
    (title) => {
      const id = uuidv4();
      setData((prev) => {
        const g = { ...prev.groups[groupId] };
        g.receipts = {
          ...g.receipts,
          [id]: {
            title,
            date: Date.now(),
            locked: false,
            paidById: '',
            items: {},
            personToItemQuantityMap: {},
            itemToPersonQuantityMap: {},
            personPaidMap: {},
            taxCost: 0,
            tipCost: 0,
            discountCost: 0,
          },
        };
        return { ...prev, groups: { ...prev.groups, [groupId]: g } };
      });
      return id;
    },
    [groupId, setData],
  );

  /** Create a receipt and seed line items (e.g. from scan). Optional taxCost / tipCost / discountCost. */
  const addReceiptWithItems = useCallback(
    (title, lineItems, charges = {}) => {
      const receiptId = uuidv4();
      const items = {};
      for (const row of lineItems) {
        const name = String(row.name || '').trim();
        if (!name) continue;
        const cost = Number(row.cost);
        const quantity = Math.max(1, Math.min(999, Number(row.quantity) || 1));
        if (!Number.isFinite(cost) || cost <= 0) continue;
        items[uuidv4()] = { name, cost, quantity };
      }
      const taxCost = currency(charges.taxCost ?? 0).value;
      const tipCost = currency(charges.tipCost ?? 0).value;
      const discountCost = currency(charges.discountCost ?? 0).value;
      let dateMs = Date.now();
      if (charges.receiptDate && typeof charges.receiptDate === 'string') {
        const iso = charges.receiptDate.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
          const parsed = new Date(`${iso}T12:00:00`).getTime();
          if (!Number.isNaN(parsed)) dateMs = parsed;
        }
      }
      setData((prev) => {
        const g = { ...prev.groups[groupId] };
        g.receipts = {
          ...g.receipts,
          [receiptId]: {
            title,
            date: dateMs,
            locked: false,
            paidById: '',
            items,
            personToItemQuantityMap: {},
            itemToPersonQuantityMap: {},
            personPaidMap: {},
            taxCost: Number.isFinite(taxCost) && taxCost >= 0 ? taxCost : 0,
            tipCost: Number.isFinite(tipCost) && tipCost >= 0 ? tipCost : 0,
            discountCost:
              Number.isFinite(discountCost) && discountCost >= 0 ? discountCost : 0,
          },
        };
        return { ...prev, groups: { ...prev.groups, [groupId]: g } };
      });
      return receiptId;
    },
    [groupId, setData],
  );

  const deleteReceipt = useCallback(
    (receiptId) => {
      setData((prev) => {
        const g = { ...prev.groups[groupId] };
        const receipts = { ...g.receipts };
        delete receipts[receiptId];
        g.receipts = receipts;
        return { ...prev, groups: { ...prev.groups, [groupId]: g } };
      });
    },
    [groupId, setData],
  );

  const getReceiptSnapshot = useCallback(
    (rid) => {
      const raw = data.groups?.[groupId]?.receipts?.[rid];
      if (!raw) return null;
      try {
        return JSON.parse(JSON.stringify(raw));
      } catch {
        return null;
      }
    },
    [data.groups, groupId],
  );

  const restoreReceipt = useCallback(
    (rid, snapshot) => {
      if (!snapshot || !rid) return;
      setData((prev) => {
        const g = { ...prev.groups[groupId] };
        g.receipts = { ...g.receipts, [rid]: snapshot };
        return { ...prev, groups: { ...prev.groups, [groupId]: g } };
      });
    },
    [groupId, setData],
  );

  return {
    group,
    people,
    receipts,
    renameGroup,
    addPerson,
    updatePerson,
    removePerson,
    addReceipt,
    addReceiptWithItems,
    deleteReceipt,
    getReceiptSnapshot,
    restoreReceipt,
  };
}

// ─── Single receipt within a group ──────────────────────────────────────

export function useGroupReceipt(groupId, receiptId) {
  const { data, setData } = useGroupsData();

  const group = data.groups?.[groupId];
  const receipt = useMemo(() => {
    if (!group?.receipts?.[receiptId]) return null;
    return { ...group.receipts[receiptId], id: receiptId };
  }, [group, receiptId]);

  const people = useMemo(() => idMapToList(group?.people), [group?.people]);

  /** Per-receipt "marked paid" for settle-up tracking (not stored on group person). */
  const peopleWithPaid = useMemo(
    () =>
      people.map((p) => ({
        ...p,
        paid: !!(receipt?.personPaidMap && receipt.personPaidMap[p.id]),
      })),
    [people, receipt?.personPaidMap],
  );

  const items = useMemo(() => idMapToList(receipt?.items), [receipt?.items]);

  const subTotal = useMemo(
    () => items.reduce((s, i) => currency(s).add(i.cost).value, 0),
    [items],
  );

  const taxableBaseAfterDiscount = useMemo(
    () => taxableSubtotalAfterDiscount(subTotal, receipt?.discountCost),
    [subTotal, receipt?.discountCost],
  );

  const total = useMemo(
    () =>
      receiptGrandTotal(
        subTotal,
        receipt?.discountCost,
        receipt?.taxCost,
        receipt?.tipCost,
      ),
    [subTotal, receipt?.taxCost, receipt?.tipCost, receipt?.discountCost],
  );

  const mutateReceipt = useCallback(
    (fn) => {
      setData((prev) => {
        const g = { ...prev.groups[groupId] };
        const receipts = { ...g.receipts };
        receipts[receiptId] = fn({ ...receipts[receiptId] });
        g.receipts = receipts;
        return { ...prev, groups: { ...prev.groups, [groupId]: g } };
      });
    },
    [groupId, receiptId, setData],
  );

  const updateReceiptProperty = useCallback(
    (key, value) => mutateReceipt((r) => ({ ...r, [key]: value })),
    [mutateReceipt],
  );

  const getPersonCountForItem = useCallback(
    (itemId) => {
      if (!receipt) return 0;
      const map = receipt.itemToPersonQuantityMap?.[itemId] || {};
      return Object.values(map).reduce((s, v) => s + (v || 0), 0);
    },
    [receipt],
  );

  const getItemQuantityForPerson = useCallback(
    (personId, itemId) => {
      if (!receipt) return 0;
      return receipt.personToItemQuantityMap?.[personId]?.[itemId] || 0;
    },
    [receipt],
  );

  const setPersonItemQuantity = useCallback(
    (personId, itemId, quantity) => {
      mutateReceipt((r) => {
        const p2i = { ...r.personToItemQuantityMap };
        const i2p = { ...r.itemToPersonQuantityMap };
        if (!p2i[personId]) p2i[personId] = {};
        if (!i2p[itemId]) i2p[itemId] = {};
        p2i[personId] = { ...p2i[personId], [itemId]: quantity };
        i2p[itemId] = { ...i2p[itemId], [personId]: quantity };
        if (quantity <= 0) {
          delete p2i[personId][itemId];
          delete i2p[itemId][personId];
        }
        return { ...r, personToItemQuantityMap: p2i, itemToPersonQuantityMap: i2p };
      });
    },
    [mutateReceipt],
  );

  const isEveryoneAssignedToItem = useCallback(
    (itemId) => {
      const item = receipt?.items?.[itemId];
      if (!item || people.length === 0) return false;
      if (Math.floor(Number(item.quantity) || 0) !== 1) return false;
      const personIds = people.map((p) => p.id);
      return personIds.every((id) => getItemQuantityForPerson(id, itemId) === 1);
    },
    [receipt?.items, people, getItemQuantityForPerson],
  );

  /**
   * For items with quantity 1 only: give each person share weight 1, or clear if already all on.
   */
  const assignAllPeopleToItem = useCallback(
    (itemId) => {
      const item = receipt?.items?.[itemId];
      if (!item || people.length === 0) return;
      if (Math.floor(Number(item.quantity) || 0) !== 1) return;
      const personIds = people.map((p) => p.id);
      /** @type {Record<string, number>} */
      const targets = {};
      personIds.forEach((id) => {
        targets[id] = 1;
      });
      const allMatch = isEveryoneAssignedToItem(itemId);
      mutateReceipt((r) => {
        const p2i = { ...r.personToItemQuantityMap };
        const i2p = { ...r.itemToPersonQuantityMap };
        if (!i2p[itemId]) i2p[itemId] = {};
        personIds.forEach((pid) => {
          const q = allMatch ? 0 : targets[pid];
          if (!p2i[pid]) p2i[pid] = {};
          if (q <= 0) {
            const nextP = { ...p2i[pid] };
            delete nextP[itemId];
            p2i[pid] = nextP;
            const nextI = { ...i2p[itemId] };
            delete nextI[pid];
            i2p[itemId] = nextI;
          } else {
            p2i[pid] = { ...p2i[pid], [itemId]: q };
            i2p[itemId] = { ...i2p[itemId], [pid]: q };
          }
        });
        return { ...r, personToItemQuantityMap: p2i, itemToPersonQuantityMap: i2p };
      });
    },
    [receipt, people, mutateReceipt, isEveryoneAssignedToItem],
  );

  const setPersonPaid = useCallback(
    (personId, paid) => {
      mutateReceipt((r) => ({
        ...r,
        personPaidMap: { ...(r.personPaidMap || {}), [personId]: !!paid },
      }));
    },
    [mutateReceipt],
  );

  const personSubTotalMap = useMemo(() => {
    const map = {};
    people.forEach((person) => {
      let personSub = 0;
      items.forEach((item) => {
        const qty = getItemQuantityForPerson(person.id, item.id);
        if (qty <= 0) return;
        const totalShares = getPersonCountForItem(item.id);
        if (totalShares <= 0) return;
        personSub = currency(personSub).add(
          currency(item.cost).multiply(qty).divide(totalShares),
        ).value;
      });
      map[person.id] = { subTotal: personSub };
    });
    return map;
  }, [people, items, getItemQuantityForPerson, getPersonCountForItem]);

  const getChargeForPerson = useCallback(
    (chargeKey, personId) => {
      if (subTotal <= 0) return 0;
      const personSub = personSubTotalMap[personId]?.subTotal || 0;
      const ratio = personSub / subTotal;
      return currency(receipt?.[chargeKey] || 0).multiply(ratio).value;
    },
    [subTotal, personSubTotalMap, receipt],
  );

  const getTotalForPerson = useCallback(
    (personId) => {
      const personSub = personSubTotalMap[personId]?.subTotal || 0;
      const tax = getChargeForPerson('taxCost', personId);
      const tip = getChargeForPerson('tipCost', personId);
      if (subTotal <= 0) return 0;
      const afterDiscount = currency(personSub)
        .multiply(taxableBaseAfterDiscount)
        .divide(subTotal).value;
      return currency(afterDiscount).add(tax).add(tip).value;
    },
    [personSubTotalMap, getChargeForPerson, subTotal, taxableBaseAfterDiscount],
  );

  const getItemCostForPerson = useCallback(
    (personId, itemId) => {
      const item = receipt?.items?.[itemId];
      if (!item) return { subTotal: 0, shares: 0, totalShares: 0 };
      const shares = getItemQuantityForPerson(personId, itemId);
      const totalShares = getPersonCountForItem(itemId);
      if (totalShares <= 0) return { subTotal: 0, shares, totalShares };
      return {
        subTotal: currency(item.cost).multiply(shares).divide(totalShares).value,
        shares,
        totalShares,
      };
    },
    [receipt, getItemQuantityForPerson, getPersonCountForItem],
  );

  const updateReceiptItemValue = useCallback(
    (itemId, key, value) => {
      mutateReceipt((r) => {
        const items = { ...r.items };
        items[itemId] = { ...items[itemId], [key]: key === 'name' ? value : Number(value) };
        return { ...r, items };
      });
    },
    [mutateReceipt],
  );

  const addItem = useCallback(
    ({ name, cost, quantity }) => {
      const id = uuidv4();
      mutateReceipt((r) => {
        const items = { ...r.items };
        items[id] = { name, cost: Number(cost), quantity: Number(quantity) || 1 };
        return { ...r, items };
      });
      return id;
    },
    [mutateReceipt],
  );

  const removeItem = useCallback(
    (itemId) => {
      mutateReceipt((r) => {
        const items = { ...r.items };
        delete items[itemId];
        const i2p = { ...r.itemToPersonQuantityMap };
        delete i2p[itemId];
        const p2i = { ...r.personToItemQuantityMap };
        Object.keys(p2i).forEach((pid) => {
          const m = { ...p2i[pid] };
          delete m[itemId];
          p2i[pid] = m;
        });
        return { ...r, items, itemToPersonQuantityMap: i2p, personToItemQuantityMap: p2i };
      });
    },
    [mutateReceipt],
  );

  const updateChargeValue = useCallback(
    (key, value) => mutateReceipt((r) => ({ ...r, [key]: currency(value).value })),
    [mutateReceipt],
  );

  const updateChargeValueByPct = useCallback(
    (key, pctStr, base) => {
      const pct = parseFloat(pctStr) || 0;
      const val = currency(base).multiply(pct / 100).value;
      updateChargeValue(key, val);
    },
    [updateChargeValue],
  );

  const deleteReceipt = useCallback(() => {
    setData((prev) => {
      const g = { ...prev.groups[groupId] };
      const receipts = { ...g.receipts };
      delete receipts[receiptId];
      g.receipts = receipts;
      return { ...prev, groups: { ...prev.groups, [groupId]: g } };
    });
  }, [groupId, receiptId, setData]);

  return {
    receipt,
    people: peopleWithPaid,
    items,
    subTotal,
    taxableBaseAfterDiscount,
    total,
    personSubTotalMap,
    getPersonCountForItem,
    getItemQuantityForPerson,
    setPersonItemQuantity,
    assignAllPeopleToItem,
    isEveryoneAssignedToItem,
    getChargeForPerson,
    getTotalForPerson,
    getItemCostForPerson,
    updateReceiptProperty,
    updateReceiptItemValue,
    addItem,
    removeItem,
    updateChargeValue,
    updateChargeValueByPct,
    deleteReceipt,
    setPersonPaid,
  };
}
