import { useCallback, useMemo } from 'react';
import { useLocalStorage, STORAGE_KEY, defaultState } from './useLocalStorage.js';

function newId() {
  return crypto.randomUUID();
}

export function useAppState() {
  const [raw, setRaw] = useLocalStorage(STORAGE_KEY, defaultState);

  const setMeName = useCallback(
    (name) => setRaw((s) => ({ ...s, meName: name.trim() })),
    [setRaw]
  );

  const addGroup = useCallback(
    (name) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const g = {
        id: newId(),
        name: trimmed,
        participants: [],
        expenses: [],
        settled: [],
      };
      setRaw((s) => ({ ...s, groups: [g, ...s.groups] }));
      return g.id;
    },
    [setRaw]
  );

  const addParticipant = useCallback(
    (groupId, name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const p = { id: newId(), name: trimmed };
      setRaw((s) => ({
        ...s,
        groups: s.groups.map((g) =>
          g.id === groupId
            ? { ...g, participants: [...g.participants, p] }
            : g
        ),
      }));
    },
    [setRaw]
  );

  const removeParticipant = useCallback(
    (groupId, participantId) => {
      setRaw((s) => ({
        ...s,
        groups: s.groups.map((g) =>
          g.id === groupId
            ? {
                ...g,
                participants: g.participants.filter((p) => p.id !== participantId),
                expenses: g.expenses
                  .filter(
                    (e) =>
                      e.paidById !== participantId &&
                      !e.splitParticipantIds.includes(participantId)
                  )
                  .map((e) => {
                    const splitParticipantIds = e.splitParticipantIds.filter(
                      (id) => id !== participantId
                    );
                    const next = { ...e, splitParticipantIds };
                    if (e.customAmounts) {
                      next.customAmounts = { ...e.customAmounts };
                      delete next.customAmounts[participantId];
                    }
                    if (e.percents) {
                      next.percents = { ...e.percents };
                      delete next.percents[participantId];
                    }
                    if (e.unitQuantities) {
                      next.unitQuantities = { ...e.unitQuantities };
                      delete next.unitQuantities[participantId];
                    }
                    return next;
                  }),
                settled: g.settled.filter(
                  (x) => x.from !== participantId && x.to !== participantId
                ),
              }
            : g
        ),
      }));
    },
    [setRaw]
  );

  const addExpense = useCallback(
    (groupId, expense) => {
      setRaw((s) => ({
        ...s,
        groups: s.groups.map((g) =>
          g.id === groupId
            ? { ...g, expenses: [expense, ...g.expenses] }
            : g
        ),
      }));
    },
    [setRaw]
  );

  const updateExpense = useCallback(
    (groupId, expenseId, patch) => {
      setRaw((s) => ({
        ...s,
        groups: s.groups.map((g) =>
          g.id === groupId
            ? {
                ...g,
                expenses: g.expenses.map((e) =>
                  e.id === expenseId ? { ...e, ...patch } : e
                ),
              }
            : g
        ),
      }));
    },
    [setRaw]
  );

  const deleteExpense = useCallback(
    (groupId, expenseId) => {
      setRaw((s) => ({
        ...s,
        groups: s.groups.map((g) =>
          g.id === groupId
            ? { ...g, expenses: g.expenses.filter((e) => e.id !== expenseId) }
            : g
        ),
      }));
    },
    [setRaw]
  );

  const toggleSettled = useCallback(
    (groupId, transfer) => {
      setRaw((s) => ({
        ...s,
        groups: s.groups.map((g) => {
          if (g.id !== groupId) return g;
          const exists = g.settled.some(
            (x) =>
              x.from === transfer.from &&
              x.to === transfer.to &&
              Math.abs(x.amount - transfer.amount) < 0.02
          );
          if (exists) {
            return {
              ...g,
              settled: g.settled.filter(
                (x) =>
                  !(
                    x.from === transfer.from &&
                    x.to === transfer.to &&
                    Math.abs(x.amount - transfer.amount) < 0.02
                  )
              ),
            };
          }
          return { ...g, settled: [...g.settled, { ...transfer }] };
        }),
      }));
    },
    [setRaw]
  );

  const clearGroupSettled = useCallback(
    (groupId) => {
      setRaw((s) => ({
        ...s,
        groups: s.groups.map((g) =>
          g.id === groupId ? { ...g, settled: [] } : g
        ),
      }));
    },
    [setRaw]
  );

  const deleteGroup = useCallback(
    (groupId) => {
      setRaw((s) => ({
        ...s,
        groups: s.groups.filter((g) => g.id !== groupId),
      }));
    },
    [setRaw]
  );

  const api = useMemo(
    () => ({
      ...raw,
      setMeName,
      addGroup,
      addParticipant,
      removeParticipant,
      addExpense,
      updateExpense,
      deleteExpense,
      toggleSettled,
      clearGroupSettled,
      deleteGroup,
      newId,
    }),
    [
      raw,
      setMeName,
      addGroup,
      addParticipant,
      removeParticipant,
      addExpense,
      updateExpense,
      deleteExpense,
      toggleSettled,
      clearGroupSettled,
      deleteGroup,
    ]
  );

  return api;
}
