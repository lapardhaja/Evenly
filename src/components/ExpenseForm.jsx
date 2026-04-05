import { useEffect, useMemo, useState } from 'react';
import { expenseShares } from '../lib/balances.js';
import { roundMoney } from '../lib/settlement.js';

const emptyCustom = (ids) => Object.fromEntries(ids.map((id) => [id, '']));
const emptyPercent = (ids) => Object.fromEntries(ids.map((id) => [id, '']));
const emptyUnits = (ids) => Object.fromEntries(ids.map((id) => [id, '']));

/**
 * @param {{
 *   participants: { id: string, name: string }[],
 *   onSubmit: (expense: import('../types.js').Expense) => void,
 *   onCancel?: () => void,
 *   initial?: import('../types.js').Expense | null,
 *   newId: () => string,
 * }} props
 */
export default function ExpenseForm({
  participants,
  onSubmit,
  onCancel,
  initial,
  newId,
}) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidById, setPaidById] = useState('');
  const [splitMode, setSplitMode] = useState('equal');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [custom, setCustom] = useState({});
  const [percents, setPercents] = useState({});
  const [units, setUnits] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (initial) {
      setDescription(initial.description);
      setAmount(String(initial.amount));
      setPaidById(initial.paidById);
      setSplitMode(initial.splitMode);
      setSelectedIds(new Set(initial.splitParticipantIds));
      setCustom(
        initial.splitMode === 'custom'
          ? Object.fromEntries(
              initial.splitParticipantIds.map((id) => [
                id,
                String(initial.customAmounts?.[id] ?? ''),
              ])
            )
          : emptyCustom(initial.splitParticipantIds)
      );
      setPercents(
        initial.splitMode === 'percent'
          ? Object.fromEntries(
              initial.splitParticipantIds.map((id) => [
                id,
                String(initial.percents?.[id] ?? ''),
              ])
            )
          : emptyPercent(initial.splitParticipantIds)
      );
      setUnits(
        initial.splitMode === 'units'
          ? Object.fromEntries(
              initial.splitParticipantIds.map((id) => [
                id,
                String(initial.unitQuantities?.[id] ?? ''),
              ])
            )
          : emptyUnits(initial.splitParticipantIds)
      );
    } else {
      setDescription('');
      setAmount('');
      setPaidById(participants[0]?.id ?? '');
      setSplitMode('equal');
      const all = new Set(participants.map((p) => p.id));
      setSelectedIds(all);
      setCustom(emptyCustom(participants.map((p) => p.id)));
      setPercents(emptyPercent(participants.map((p) => p.id)));
      setUnits(emptyUnits(participants.map((p) => p.id)));
      setError('');
    }
  }, [initial, participants]);

  const selectedList = useMemo(
    () => participants.filter((p) => selectedIds.has(p.id)),
    [participants, selectedIds]
  );

  function toggleId(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const desc = description.trim();
    if (!desc) {
      setError('Description is required.');
      return;
    }

    const amt = roundMoney(parseFloat(amount));
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Amount must be a positive number.');
      return;
    }

    if (!paidById || !participants.some((p) => p.id === paidById)) {
      setError('Select who paid.');
      return;
    }

    const splitParticipantIds = participants
      .filter((p) => selectedIds.has(p.id))
      .map((p) => p.id);

    if (splitParticipantIds.length === 0) {
      setError('Select at least one person who shares this expense.');
      return;
    }

    /** @type {Record<string, number>} */
    let customAmounts = {};
    /** @type {Record<string, number>} */
    let percentMap = {};
    /** @type {Record<string, number>} */
    let unitMap = {};

    if (splitMode === 'custom') {
      for (const id of splitParticipantIds) {
        const v = roundMoney(parseFloat(String(custom[id] ?? '')));
        if (!Number.isFinite(v) || v < 0) {
          setError('Custom amounts must be non-negative numbers.');
          return;
        }
        customAmounts[id] = v;
      }
      const sum = roundMoney(
        splitParticipantIds.reduce((s, id) => s + customAmounts[id], 0)
      );
      if (Math.abs(sum - amt) > 0.02) {
        setError(
          `Custom split must sum to $${amt.toFixed(2)} (currently $${sum.toFixed(2)}).`
        );
        return;
      }
    }

    if (splitMode === 'percent') {
      for (const id of splitParticipantIds) {
        const v = parseFloat(String(percents[id] ?? ''));
        if (!Number.isFinite(v) || v < 0) {
          setError('Percents must be non-negative numbers.');
          return;
        }
        percentMap[id] = v;
      }
      const sumP = splitParticipantIds.reduce((s, id) => s + percentMap[id], 0);
      if (sumP <= 0) {
        setError('Enter positive percentages that sum above zero.');
        return;
      }
    }

    if (splitMode === 'units') {
      for (const id of splitParticipantIds) {
        const raw = String(units[id] ?? '').trim();
        const v = parseFloat(raw);
        if (raw === '' || !Number.isFinite(v) || v < 0) {
          setError('Each person needs a non-negative quantity (0 is ok).');
          return;
        }
        unitMap[id] = v;
      }
      const sumU = splitParticipantIds.reduce((s, id) => s + unitMap[id], 0);
      if (sumU <= 0) {
        setError('At least one person must have a quantity greater than 0.');
        return;
      }
    }

    const draft = {
      id: initial?.id ?? newId(),
      description: desc,
      amount: amt,
      paidById,
      splitMode,
      splitParticipantIds,
      customAmounts: splitMode === 'custom' ? customAmounts : undefined,
      percents: splitMode === 'percent' ? percentMap : undefined,
      unitQuantities: splitMode === 'units' ? unitMap : undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    };

    const shares = expenseShares(draft, participants.map((p) => p.id));
    const shareSum = roundMoney(
      Object.values(shares).reduce((s, x) => s + x, 0)
    );
    if (Math.abs(shareSum - amt) > 0.05) {
      setError('Split calculation error; check inputs.');
      return;
    }

    onSubmit(draft);
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ marginBottom: '1rem' }}>
      <h3>{initial ? 'Edit expense' : 'Add expense'}</h3>

      <div className="field">
        <label htmlFor="exp-desc">Description</label>
        <input
          id="exp-desc"
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="row">
        <div className="field">
          <label htmlFor="exp-amt">Amount</label>
          <input
            id="exp-amt"
            className="input"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="exp-paid">Paid by</label>
          <select
            id="exp-paid"
            className="select"
            value={paidById}
            onChange={(e) => setPaidById(e.target.value)}
          >
            {participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="exp-split-mode">Split method</label>
        <select
          id="exp-split-mode"
          className="select"
          value={splitMode}
          onChange={(e) => setSplitMode(e.target.value)}
        >
          <option value="equal">Equal</option>
          <option value="units">By quantity (units)</option>
          <option value="custom">Exact amounts</option>
          <option value="percent">Percent</option>
        </select>
      </div>

      <div className="field">
        <span className="muted">Split between</span>
        <div className="split-grid" style={{ marginTop: '0.35rem' }}>
          {participants.map((p) => (
            <label key={p.id} className="checkbox-label">
              <input
                type="checkbox"
                checked={selectedIds.has(p.id)}
                onChange={() => toggleId(p.id)}
              />
              {p.name}
            </label>
          ))}
        </div>
      </div>

      {splitMode === 'custom' && (
        <div className="split-grid">
          {selectedList.map((p) => (
            <div key={p.id} className="split-row">
              <span>{p.name}</span>
              <input
                className="input"
                inputMode="decimal"
                placeholder="0.00"
                value={custom[p.id] ?? ''}
                onChange={(e) =>
                  setCustom((c) => ({ ...c, [p.id]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>
      )}

      {splitMode === 'percent' && (
        <div className="split-grid">
          {selectedList.map((p) => (
            <div key={p.id} className="split-row">
              <span>{p.name}</span>
              <input
                className="input"
                inputMode="decimal"
                placeholder="%"
                value={percents[p.id] ?? ''}
                onChange={(e) =>
                  setPercents((c) => ({ ...c, [p.id]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>
      )}

      {splitMode === 'units' && (
        <>
          <p className="muted" style={{ margin: '0 0 0.5rem' }}>
            Total bill is split in proportion to units (e.g. drinks). 0 = didn&apos;t
            consume.
          </p>
          <div className="split-grid">
            {selectedList.map((p) => (
              <div key={p.id} className="split-row">
                <span>{p.name}</span>
                <input
                  className="input"
                  inputMode="decimal"
                  placeholder="0"
                  value={units[p.id] ?? ''}
                  onChange={(e) =>
                    setUnits((c) => ({ ...c, [p.id]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
        </>
      )}

      {error ? <p className="error-text">{error}</p> : null}

      <div className="row" style={{ marginTop: '0.75rem' }}>
        <button type="submit" className="btn btn-primary">
          {initial ? 'Save' : 'Add expense'}
        </button>
        {onCancel ? (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
