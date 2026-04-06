import { useMemo, useCallback } from 'react';
import useLocalStorage from './useLocalStorage.js';
import currency from 'currency.js';
import { v4 as uuidv4 } from 'uuid';
import { idMapToList } from '../functions/utils.js';

const STORAGE_KEY = 'evenly:data:v2';

const defaultData = () => ({ groups: {} });

// ─── Groups list ────────────────────────────────────────────────────────

export function useGroups() {
  const [data, setData] = useLocalStorage(STORAGE_KEY, defaultData());

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

  return { groups, addGroup, deleteGroup };
}

// ─── Single group ───────────────────────────────────────────────────────

export function useGroup(groupId) {
  const [data, setData] = useLocalStorage(STORAGE_KEY, defaultData());

  const group = useMemo(() => {
    if (!data.groups?.[groupId]) return null;
    return { ...data.groups[groupId], id: groupId };
  }, [data.groups, groupId]);

  const people = useMemo(() => idMapToList(group?.people), [group?.people]);

  const receipts = useMemo(() => {
    return idMapToList(group?.receipts).map((r) => {
      const items = idMapToList(r.items);
      const subTotal = items.reduce((s, i) => currency(s).add(i.cost).value, 0);
      const total = currency(subTotal).add(r.taxCost || 0).add(r.tipCost || 0).value;
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
            taxCost: 0,
            tipCost: 0,
          },
        };
        return { ...prev, groups: { ...prev.groups, [groupId]: g } };
      });
      return id;
    },
    [groupId, setData],
  );

  /** Create a receipt and seed line items (e.g. from OCR). */
  const addReceiptWithItems = useCallback(
    (title, lineItems) => {
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
      setData((prev) => {
        const g = { ...prev.groups[groupId] };
        g.receipts = {
          ...g.receipts,
          [receiptId]: {
            title,
            date: Date.now(),
            locked: false,
            paidById: '',
            items,
            personToItemQuantityMap: {},
            itemToPersonQuantityMap: {},
            taxCost: 0,
            tipCost: 0,
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
  };
}

// ─── Single receipt within a group ──────────────────────────────────────

export function useGroupReceipt(groupId, receiptId) {
  const [data, setData] = useLocalStorage(STORAGE_KEY, defaultData());

  const group = data.groups?.[groupId];
  const receipt = useMemo(() => {
    if (!group?.receipts?.[receiptId]) return null;
    return { ...group.receipts[receiptId], id: receiptId };
  }, [group, receiptId]);

  const people = useMemo(() => idMapToList(group?.people), [group?.people]);
  const items = useMemo(() => idMapToList(receipt?.items), [receipt?.items]);

  const subTotal = useMemo(
    () => items.reduce((s, i) => currency(s).add(i.cost).value, 0),
    [items],
  );
  const total = useMemo(
    () => currency(subTotal).add(receipt?.taxCost || 0).add(receipt?.tipCost || 0).value,
    [subTotal, receipt?.taxCost, receipt?.tipCost],
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
      return currency(personSub).add(tax).add(tip).value;
    },
    [personSubTotalMap, getChargeForPerson],
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
    people,
    items,
    subTotal,
    total,
    personSubTotalMap,
    getPersonCountForItem,
    getItemQuantityForPerson,
    setPersonItemQuantity,
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
  };
}
