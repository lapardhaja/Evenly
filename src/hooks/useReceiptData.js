import { useMemo, useCallback } from 'react';
import useLocalStorage from './useLocalStorage.js';
import currency from 'currency.js';
import { v4 as uuidv4 } from 'uuid';
import { idMapToList } from '../functions/utils.js';

const STORAGE_KEY = 'evenly:receipts:v1';

export function useGetReceipts() {
  const [data, setData] = useLocalStorage(STORAGE_KEY, {});

  const receipts = useMemo(() => {
    return Object.entries(data).map(([id, r]) => {
      const items = idMapToList(r.items);
      const subTotal = items.reduce(
        (sum, item) => currency(sum).add(item.cost).value,
        0,
      );
      const total = currency(subTotal)
        .add(r.taxCost || 0)
        .add(r.tipCost || 0).value;
      return { ...r, id, total };
    });
  }, [data]);

  const pushReceipt = useCallback(
    ({ title }) => {
      const id = uuidv4();
      const receipt = {
        title,
        date: Date.now(),
        locked: false,
        items: {},
        people: {},
        personToItemQuantityMap: {},
        itemToPersonQuantityMap: {},
        taxCost: 0,
        tipCost: 0,
      };
      setData((prev) => ({ ...prev, [id]: receipt }));
      return id;
    },
    [setData],
  );

  return { receipts, pushReceipt, setData };
}

export function useGetReceipt(receiptId) {
  const [data, setData] = useLocalStorage(STORAGE_KEY, {});

  const receipt = useMemo(() => {
    if (!data[receiptId]) return null;
    return { ...data[receiptId], id: receiptId };
  }, [data, receiptId]);

  const items = useMemo(() => idMapToList(receipt?.items), [receipt?.items]);
  const people = useMemo(
    () => idMapToList(receipt?.people),
    [receipt?.people],
  );

  const subTotal = useMemo(
    () =>
      items.reduce((sum, item) => currency(sum).add(item.cost).value, 0),
    [items],
  );

  const total = useMemo(
    () =>
      currency(subTotal)
        .add(receipt?.taxCost || 0)
        .add(receipt?.tipCost || 0).value,
    [subTotal, receipt?.taxCost, receipt?.tipCost],
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
      setData((prev) => {
        const r = { ...prev[receiptId] };
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

        r.personToItemQuantityMap = p2i;
        r.itemToPersonQuantityMap = i2p;
        return { ...prev, [receiptId]: r };
      });
    },
    [receiptId, setData],
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
      if (totalShares <= 0)
        return { subTotal: 0, shares, totalShares };
      const costShare = currency(item.cost)
        .multiply(shares)
        .divide(totalShares).value;
      return { subTotal: costShare, shares, totalShares };
    },
    [receipt, getItemQuantityForPerson, getPersonCountForItem],
  );

  const updateReceiptProperty = useCallback(
    (key, value) => {
      setData((prev) => ({
        ...prev,
        [receiptId]: { ...prev[receiptId], [key]: value },
      }));
    },
    [receiptId, setData],
  );

  const updateReceiptItemValue = useCallback(
    (itemId, key, value) => {
      setData((prev) => {
        const r = { ...prev[receiptId] };
        const items = { ...r.items };
        items[itemId] = { ...items[itemId], [key]: key === 'name' ? value : Number(value) };
        return { ...prev, [receiptId]: { ...r, items } };
      });
    },
    [receiptId, setData],
  );

  const addItem = useCallback(
    ({ name, cost, quantity }) => {
      const id = uuidv4();
      setData((prev) => {
        const r = { ...prev[receiptId] };
        const items = { ...r.items };
        items[id] = { name, cost: Number(cost), quantity: Number(quantity) || 1 };
        return { ...prev, [receiptId]: { ...r, items } };
      });
      return id;
    },
    [receiptId, setData],
  );

  const removeItem = useCallback(
    (itemId) => {
      setData((prev) => {
        const r = { ...prev[receiptId] };
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
        return {
          ...prev,
          [receiptId]: {
            ...r,
            items,
            itemToPersonQuantityMap: i2p,
            personToItemQuantityMap: p2i,
          },
        };
      });
    },
    [receiptId, setData],
  );

  const addPerson = useCallback(
    (name) => {
      const id = uuidv4();
      setData((prev) => {
        const r = { ...prev[receiptId] };
        const people = { ...r.people };
        people[id] = { name };
        return { ...prev, [receiptId]: { ...r, people } };
      });
      return id;
    },
    [receiptId, setData],
  );

  const updatePerson = useCallback(
    (person) => {
      setData((prev) => {
        const r = { ...prev[receiptId] };
        const people = { ...r.people };
        const { id, ...rest } = person;
        people[id] = rest;
        return { ...prev, [receiptId]: { ...r, people } };
      });
    },
    [receiptId, setData],
  );

  const removePerson = useCallback(
    (personId) => {
      setData((prev) => {
        const r = { ...prev[receiptId] };
        const people = { ...r.people };
        delete people[personId];
        const p2i = { ...r.personToItemQuantityMap };
        delete p2i[personId];
        const i2p = { ...r.itemToPersonQuantityMap };
        Object.keys(i2p).forEach((iid) => {
          const m = { ...i2p[iid] };
          delete m[personId];
          i2p[iid] = m;
        });
        return {
          ...prev,
          [receiptId]: {
            ...r,
            people,
            personToItemQuantityMap: p2i,
            itemToPersonQuantityMap: i2p,
          },
        };
      });
    },
    [receiptId, setData],
  );

  const updateChargeValue = useCallback(
    (key, value) => {
      setData((prev) => ({
        ...prev,
        [receiptId]: { ...prev[receiptId], [key]: currency(value).value },
      }));
    },
    [receiptId, setData],
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
      const next = { ...prev };
      delete next[receiptId];
      return next;
    });
  }, [receiptId, setData]);

  return {
    receipt,
    items,
    people,
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
    addPerson,
    updatePerson,
    removePerson,
    updateChargeValue,
    updateChargeValueByPct,
    deleteReceipt,
  };
}
