import { useMemo, useState } from 'react';
import { computeBalances } from '../lib/balances.js';
import { findMeParticipantId } from '../lib/me.js';
import { minimizeTransactions, roundMoney } from '../lib/settlement.js';
import ExpenseForm from './ExpenseForm.jsx';

function formatMoney(n) {
  const x = roundMoney(n);
  const sign = x < 0 ? '-' : '';
  return `${sign}$${Math.abs(x).toFixed(2)}`;
}

function transferKey(t) {
  return `${t.from}|${t.to}|${t.amount.toFixed(2)}`;
}

function isSettled(group, t) {
  return group.settled.some(
    (x) =>
      x.from === t.from &&
      x.to === t.to &&
      Math.abs(x.amount - t.amount) < 0.02
  );
}

/**
 * @param {{ app: ReturnType<import('../hooks/useAppState.js').useAppState>, groupId: string, onBack: () => void }} props
 */
export default function GroupView({ app, groupId, onBack }) {
  const group = app.groups.find((g) => g.id === groupId);
  const [participantName, setParticipantName] = useState('');
  const [editingId, setEditingId] = useState(null);

  const participantIds = useMemo(
    () => group?.participants.map((p) => p.id) ?? [],
    [group]
  );

  const balances = useMemo(() => {
    if (!group) return {};
    return computeBalances(group.expenses, participantIds);
  }, [group, participantIds]);

  const transfers = useMemo(() => {
    if (!group || participantIds.length === 0) return [];
    return minimizeTransactions(balances);
  }, [balances, group, participantIds.length]);

  const meId = useMemo(
    () => findMeParticipantId(group?.participants ?? [], app.meName),
    [group, app.meName]
  );

  if (!group) {
    return (
      <div className="card">
        <p className="muted">Group not found.</p>
        <button type="button" className="btn" onClick={onBack}>
          Back
        </button>
      </div>
    );
  }

  function handleAddParticipant(e) {
    e.preventDefault();
    const n = participantName.trim();
    if (!n) return;
    app.addParticipant(group.id, n);
    setParticipantName('');
  }

  const editingExpense = editingId
    ? group.expenses.find((e) => e.id === editingId) ?? null
    : null;

  return (
    <>
      <button type="button" className="back-link" onClick={onBack}>
        ← Groups
      </button>

      <div className="card card-elevated">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{group.name}</h2>
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              Balances and settle-up update as you add expenses.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => {
              if (
                !confirm(
                  `Delete group "${group.name}"? This cannot be undone.`
                )
              )
                return;
              app.deleteGroup(group.id);
              onBack();
            }}
          >
            Delete group
          </button>
        </div>
      </div>

      <div className="card">
        <h3>People</h3>
        <form onSubmit={handleAddParticipant} className="row" style={{ marginBottom: '0.75rem' }}>
          <div className="field" style={{ flex: 2, minWidth: '160px' }}>
            <label htmlFor="p-name">Add participant</label>
            <input
              id="p-name"
              className="input"
              placeholder="Name"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginBottom: '0' }}>
            Add
          </button>
        </form>
        {group.participants.length === 0 ? (
          <p className="muted">Add at least one person to log expenses.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {group.participants.map((p) => (
              <li
                key={p.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.45rem 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <span>
                  {p.name}
                  {meId === p.id ? (
                    <span className="muted" style={{ marginLeft: '0.35rem' }}>
                      (you)
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => app.removeParticipant(group.id, p.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {group.participants.length > 0 ? (
        <>
          <ExpenseForm
            participants={group.participants}
            newId={app.newId}
            initial={editingExpense}
            onCancel={editingId ? () => setEditingId(null) : undefined}
            onSubmit={(exp) => {
              if (editingId) {
                app.updateExpense(group.id, editingId, exp);
                setEditingId(null);
              } else {
                app.addExpense(group.id, exp);
              }
            }}
          />

          <div className="card">
            <h3>Balances</h3>
            <p className="muted" style={{ marginTop: '-0.5rem' }}>
              Positive = should receive; negative = should pay (net after all expenses).
            </p>
            {group.participants.map((p) => {
              const b = roundMoney(balances[p.id] ?? 0);
              let cls = 'balance-pill neutral';
              let label = 'Settled';
              if (b > 0.02) {
                cls = 'balance-pill owed';
                label = 'Gets back';
              } else if (b < -0.02) {
                cls = 'balance-pill owe';
                label = 'Owes';
              }
              const isMe = meId === p.id;
              return (
                <div key={p.id} className={cls}>
                  <span>
                    {p.name}
                    {isMe ? (
                      <span className="muted" style={{ marginLeft: '0.35rem' }}>
                        {b < -0.02
                          ? '(you owe)'
                          : b > 0.02
                            ? "(you're owed)"
                            : '(you)'}
                      </span>
                    ) : null}
                    <span className="muted" style={{ marginLeft: '0.35rem', fontSize: '0.8rem' }}>
                      {label}
                    </span>
                  </span>
                  <span className="amount-strong">{formatMoney(b)}</span>
                </div>
              );
            })}
          </div>

          <div className="card">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.5rem',
                flexWrap: 'wrap',
              }}
            >
              <h3 style={{ margin: 0 }}>Settle up</h3>
              {group.settled.length > 0 ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => app.clearGroupSettled(group.id)}
                >
                  Clear settled marks
                </button>
              ) : null}
            </div>
            <p className="muted" style={{ marginTop: '0.35rem' }}>
              Minimum transfers (greedy on net balances). Check off when paid.
            </p>
            {transfers.length === 0 ? (
              <p className="muted" style={{ marginBottom: 0 }}>
                Nothing to settle — all square.
              </p>
            ) : (
              transfers.map((t) => {
                const fromP = group.participants.find((p) => p.id === t.from);
                const toP = group.participants.find((p) => p.id === t.to);
                const done = isSettled(group, t);
                return (
                  <div key={transferKey(t)} className={`settle-row${done ? ' done' : ''}`}>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={() => app.toggleSettled(group.id, t)}
                      />
                      <span>
                        <strong>{fromP?.name ?? t.from}</strong>
                        <span className="muted"> pays </span>
                        <strong>{toP?.name ?? t.to}</strong>
                      </span>
                    </label>
                    <span className="amount-strong">{formatMoney(t.amount)}</span>
                  </div>
                );
              })
            )}
          </div>

          <div className="card">
            <h3>Expenses</h3>
            {group.expenses.length === 0 ? (
              <p className="muted" style={{ marginBottom: 0 }}>
                No expenses yet.
              </p>
            ) : (
              group.expenses.map((e) => {
                const payer = group.participants.find((p) => p.id === e.paidById);
                const mode =
                  e.splitMode === 'equal'
                    ? 'Equal split'
                    : e.splitMode === 'custom'
                      ? 'Exact amounts'
                      : 'Percent';
                return (
                  <div key={e.id} className="expense-item">
                    <div className="expense-head">
                      <strong>{e.description}</strong>
                      <span className="amount-strong">{formatMoney(e.amount)}</span>
                    </div>
                    <div className="expense-meta">
                      Paid by {payer?.name ?? '?'} · {mode} ·{' '}
                      {e.splitParticipantIds.length} people
                    </div>
                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.35rem' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setEditingId(e.id)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          if (confirm('Delete this expense?'))
                            app.deleteExpense(group.id, e.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : null}
    </>
  );
}
