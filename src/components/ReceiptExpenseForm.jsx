import { useEffect, useMemo, useState } from 'react';
import { expenseShares } from '../lib/balances.js';
import { roundMoney } from '../lib/settlement.js';

function lineTotal(unitPrice, quantity) {
  const u = roundMoney(parseFloat(unitPrice) || 0);
  const q = Math.max(0, parseInt(String(quantity), 10) || 0);
  return roundMoney(u * q);
}

/**
 * Rece-style receipt: line items with per-person unit counts; tax & tip scale with food share.
 *
 * @param {{
 *   participants: { id: string, name: string }[],
 *   newId: () => string,
 *   initial?: import('../types.js').Expense | null,
 *   onSubmit: (expense: import('../types.js').Expense) => void,
 *   onCancel?: () => void,
 * }} props
 */
export default function ReceiptExpenseForm({
  participants,
  newId,
  initial,
  onSubmit,
  onCancel,
}) {
  const [description, setDescription] = useState('');
  const [paidById, setPaidById] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [tax, setTax] = useState('');
  const [tip, setTip] = useState('');
  const [lines, setLines] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initial && initial.splitMode === 'receipt') {
      setDescription(initial.description);
      setPaidById(initial.paidById);
      setSelectedIds(new Set(initial.splitParticipantIds));
      setTax(String(initial.taxAmount ?? ''));
      setTip(String(initial.tipAmount ?? ''));
      setLines(
        (initial.receiptLines || []).map((l) => ({
          id: l.id,
          name: l.name,
          unitPrice: String(l.unitPrice),
          quantity: String(l.quantity),
          allocations: { ...l.allocations },
        }))
      );
    } else if (!initial) {
      setDescription('');
      setPaidById(participants[0]?.id ?? '');
      setSelectedIds(new Set(participants.map((p) => p.id)));
      setTax('');
      setTip('');
      setLines([]);
      setError('');
    }
  }, [initial, participants]);

  const selectedList = useMemo(
    () => participants.filter((p) => selectedIds.has(p.id)),
    [participants, selectedIds]
  );

  const lineSubtotal = useMemo(
    () =>
      roundMoney(
        lines.reduce(
          (s, l) => s + lineTotal(l.unitPrice, l.quantity),
          0
        )
      ),
    [lines]
  );

  const taxNum = roundMoney(parseFloat(tax) || 0);
  const tipNum = roundMoney(parseFloat(tip) || 0);
  const grandTotal = roundMoney(lineSubtotal + taxNum + tipNum);

  function toggleId(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addLine() {
    const alloc = Object.fromEntries(
      participants.map((p) => [p.id, 0])
    );
    setLines((prev) => [
      ...prev,
      {
        id: newId(),
        name: '',
        unitPrice: '',
        quantity: '1',
        allocations: alloc,
      },
    ]);
  }

  function removeLine(lineId) {
    setLines((prev) => prev.filter((l) => l.id !== lineId));
  }

  function updateLine(lineId, patch) {
    setLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, ...patch } : l))
    );
  }

  function setAlloc(lineId, personId, rawNext) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        const qty = Math.max(1, parseInt(String(l.quantity), 10) || 1);
        let v = Math.max(0, Math.floor(Number(rawNext) || 0));
        const others = selectedList
          .filter((p) => p.id !== personId)
          .reduce((s, p) => s + (l.allocations[p.id] || 0), 0);
        const cap = Math.max(0, qty - others);
        v = Math.min(v, cap);
        return {
          ...l,
          allocations: { ...l.allocations, [personId]: v },
        };
      })
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const desc = description.trim();
    if (!desc) {
      setError('Title is required.');
      return;
    }
    if (!paidById) {
      setError('Select who paid.');
      return;
    }

    const splitParticipantIds = selectedList.map((p) => p.id);
    if (splitParticipantIds.length === 0) {
      setError('Select at least one person splitting this receipt.');
      return;
    }

    if (lines.length === 0) {
      setError('Add at least one line item.');
      return;
    }

    if (taxNum < 0 || tipNum < 0) {
      setError('Tax and tip must be zero or positive.');
      return;
    }

    /** @type {import('../types.js').ReceiptLine[]} */
    const receiptLines = [];

    for (const l of lines) {
      const name = l.name.trim();
      if (!name) {
        setError('Each line needs a name.');
        return;
      }
      const unitPrice = roundMoney(parseFloat(l.unitPrice));
      const quantity = parseInt(String(l.quantity), 10);
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        setError(`"${name}": enter a positive price per unit.`);
        return;
      }
      if (!Number.isFinite(quantity) || quantity < 1) {
        setError(`"${name}": quantity must be at least 1.`);
        return;
      }

      const alloc = {};
      let sum = 0;
      for (const id of splitParticipantIds) {
        const u = Math.max(0, Math.floor(l.allocations[id] || 0));
        alloc[id] = u;
        sum += u;
      }
      if (sum !== quantity) {
        setError(
          `"${name}": units assigned (${sum}) must equal line quantity (${quantity}).`
        );
        return;
      }

      receiptLines.push({
        id: l.id,
        name,
        unitPrice,
        quantity,
        allocations: alloc,
      });
    }

    const sub = roundMoney(
      receiptLines.reduce(
        (s, l) => s + roundMoney(l.unitPrice * l.quantity),
        0
      )
    );
    const total = roundMoney(sub + taxNum + tipNum);

    const draft = {
      id: initial?.id ?? newId(),
      description: desc,
      amount: total,
      paidById,
      splitMode: 'receipt',
      splitParticipantIds,
      receiptLines,
      taxAmount: taxNum,
      tipAmount: tipNum,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    };

    const shares = expenseShares(draft, participants.map((p) => p.id));
    const shareSum = roundMoney(
      Object.values(shares).reduce((s, x) => s + x, 0)
    );
    if (Math.abs(shareSum - total) > 0.08) {
      setError('Split math mismatch; check line items.');
      return;
    }

    onSubmit(draft);
  }

  return (
    <form onSubmit={handleSubmit} className="card receipt-form">
      <h3>{initial ? 'Edit receipt' : 'Add receipt (line items)'}</h3>
      <p className="muted" style={{ marginTop: '-0.5rem' }}>
        Like Rece: assign who took each unit per row; tax &amp; tip follow food
        shares.
      </p>

      <div className="field">
        <label htmlFor="rcpt-title">Receipt title</label>
        <input
          id="rcpt-title"
          className="input"
          placeholder="Dinner at Lupe's"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="rcpt-paid">Paid by</label>
        <select
          id="rcpt-paid"
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

      <div className="field">
        <span className="muted">Splitting with</span>
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

      <div className="receipt-scroll">
        <table className="receipt-table">
          <thead>
            <tr>
              <th className="receipt-sticky-col">Item</th>
              <th>Qty</th>
              <th>Each</th>
              <th>Line</th>
              {selectedList.map((p) => (
                <th key={p.id} className="receipt-person-col" title={p.name}>
                  {p.name.length > 8 ? `${p.name.slice(0, 7)}…` : p.name}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={5 + selectedList.length} className="muted">
                  No lines yet — use &quot;Add line&quot;.
                </td>
              </tr>
            ) : (
              lines.map((l) => {
                const lt = lineTotal(l.unitPrice, l.quantity);
                const qty = Math.max(1, parseInt(String(l.quantity), 10) || 1);
                return (
                  <tr key={l.id}>
                    <td className="receipt-sticky-col">
                      <input
                        className="input input-table"
                        value={l.name}
                        placeholder="Margaritas"
                        onChange={(e) =>
                          updateLine(l.id, { name: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="input input-table input-narrow"
                        inputMode="numeric"
                        value={l.quantity}
                        onChange={(e) =>
                          updateLine(l.id, { quantity: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="input input-table input-narrow"
                        inputMode="decimal"
                        value={l.unitPrice}
                        placeholder="0"
                        onChange={(e) =>
                          updateLine(l.id, { unitPrice: e.target.value })
                        }
                      />
                    </td>
                    <td className="amount-strong receipt-line-total">
                      ${lt.toFixed(2)}
                    </td>
                    {selectedList.map((p) => {
                      const v = l.allocations[p.id] || 0;
                      const oneUnit = qty <= 1;
                      const othersSum = selectedList
                        .filter((x) => x.id !== p.id)
                        .reduce((s, x) => s + (l.allocations[x.id] || 0), 0);
                      const maxForPerson = Math.max(0, qty - othersSum);
                      return (
                        <td key={p.id} className="receipt-alloc-cell">
                          {oneUnit ? (
                            <label className="receipt-check-wrap">
                              <input
                                type="checkbox"
                                checked={v >= 1}
                                onChange={(ev) =>
                                  setAlloc(
                                    l.id,
                                    p.id,
                                    ev.target.checked ? 1 : 0
                                  )
                                }
                              />
                            </label>
                          ) : (
                            <div className="receipt-stepper">
                              <button
                                type="button"
                                className="btn btn-ghost btn-tiny"
                                aria-label={`decrease ${p.name}`}
                                onClick={() => setAlloc(l.id, p.id, v - 1)}
                                disabled={v <= 0}
                              >
                                −
                              </button>
                              <span className="receipt-stepper-val">
                                {v || '—'}
                              </span>
                              <button
                                type="button"
                                className="btn btn-ghost btn-tiny"
                                aria-label={`increase ${p.name}`}
                                onClick={() => setAlloc(l.id, p.id, v + 1)}
                                disabled={v >= maxForPerson}
                              >
                                +
                              </button>
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => removeLine(l.id)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        className="btn btn-ghost btn-sm"
        style={{ marginTop: '0.5rem' }}
        onClick={addLine}
      >
        + Add line
      </button>

      <div className="row receipt-charges" style={{ marginTop: '0.85rem' }}>
        <div className="field">
          <label htmlFor="rcpt-tax">Tax</label>
          <input
            id="rcpt-tax"
            className="input"
            inputMode="decimal"
            placeholder="0.00"
            value={tax}
            onChange={(e) => setTax(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="rcpt-tip">Tip</label>
          <input
            id="rcpt-tip"
            className="input"
            inputMode="decimal"
            placeholder="0.00"
            value={tip}
            onChange={(e) => setTip(e.target.value)}
          />
        </div>
      </div>

      <div className="receipt-summary">
        <div>
          <span className="muted">Food subtotal</span>{' '}
          <strong>${lineSubtotal.toFixed(2)}</strong>
        </div>
        <div>
          <span className="muted">+ tax / tip</span>{' '}
          <strong>${(taxNum + tipNum).toFixed(2)}</strong>
        </div>
        <div className="receipt-grand">
          <span className="muted">Total</span>{' '}
          <strong>${grandTotal.toFixed(2)}</strong>
        </div>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <div className="row" style={{ marginTop: '0.75rem' }}>
        <button type="submit" className="btn btn-primary">
          {initial ? 'Save receipt' : 'Add receipt'}
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
