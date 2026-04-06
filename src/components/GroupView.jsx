import { useMemo, useState } from 'react';
import { computeBalances } from '../lib/balances.js';
import { findMeParticipantId } from '../lib/me.js';
import { minimizeTransactions, roundMoney } from '../lib/settlement.js';
import { venmoPayUrl } from '../lib/receiptSplit.js';
import { nameToInitials } from '../lib/utils.js';
import ExpenseForm from './ExpenseForm.jsx';
import ReceiptExpenseForm from './ReceiptExpenseForm.jsx';

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
  const [entryTab, setEntryTab] = useState('quick');
  const [groupTab, setGroupTab] = useState('items');

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
      <div className="rece-paper">
        <p className="muted">Group not found.</p>
        <p className="muted" style={{ marginBottom: 0 }}>
          Use the back arrow in the app bar.
        </p>
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

  const isEditingReceipt = editingExpense?.splitMode === 'receipt';

  return (
    <>
      <div className="rece-paper card-elevated" style={{ marginBottom: 12 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 500 }}>
              {group.name}
            </h2>
            <p className="muted" style={{ margin: '6px 0 0' }}>
              Receipt-style splits, balances, minimum transfers to settle.
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

      <nav className="rece-seg-tabs" role="tablist" aria-label="Group sections">
        <button
          type="button"
          role="tab"
          aria-selected={groupTab === 'items'}
          className={`rece-seg-tab${groupTab === 'items' ? ' active' : ''}`}
          onClick={() => setGroupTab('items')}
        >
          Expenses
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={groupTab === 'people'}
          className={`rece-seg-tab${groupTab === 'people' ? ' active' : ''}`}
          onClick={() => setGroupTab('people')}
        >
          People
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={groupTab === 'settle'}
          className={`rece-seg-tab${groupTab === 'settle' ? ' active' : ''}`}
          onClick={() => setGroupTab('settle')}
        >
          Settle
        </button>
      </nav>

      {groupTab === 'people' ? (
        <div className="rece-paper">
          <h3 style={{ marginTop: 0 }}>Who&apos;s in this group</h3>
          <form
            onSubmit={handleAddParticipant}
            className="row"
            style={{ marginBottom: 12 }}
          >
            <div className="field" style={{ flex: 2, minWidth: '160px' }}>
              <label htmlFor="p-name">Add person</label>
              <input
                id="p-name"
                className="input"
                placeholder="Name"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ marginBottom: 0 }}
            >
              Add
            </button>
          </form>
          {group.participants.length === 0 ? (
            <p className="muted" style={{ marginBottom: 0 }}>
              Add everyone who&apos;ll split bills here. Then use Expenses to log
              expenses or receipts.
            </p>
          ) : (
            <div>
              {group.participants.map((p) => (
                <div key={p.id} className="rece-people-row">
                  <div className="rece-avatar" aria-hidden>
                    {nameToInitials(p.name)}
                  </div>
                  <div className="rece-people-name">
                    {p.name}
                    {meId === p.id ? (
                      <span className="muted" style={{ marginLeft: 6 }}>
                        (you)
                      </span>
                    ) : null}
                  </div>
                  <input
                    className="input input-inline"
                    type="text"
                    placeholder="@venmo"
                    aria-label={`Venmo for ${p.name}`}
                    value={p.venmo ?? ''}
                    onChange={(e) =>
                      app.updateParticipantVenmo(group.id, p.id, e.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => app.removeParticipant(group.id, p.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {groupTab === 'items' && group.participants.length === 0 ? (
        <div className="rece-paper empty">
          Add people in the <strong>People</strong> tab first, then come back to
          Expenses to log spending.
        </div>
      ) : null}

      {groupTab === 'items' && group.participants.length > 0 ? (
        <>
          {editingId && isEditingReceipt ? (
            <ReceiptExpenseForm
              participants={group.participants}
              newId={app.newId}
              initial={editingExpense}
              onCancel={() => setEditingId(null)}
              onSubmit={(exp) => {
                app.updateExpense(group.id, editingId, exp);
                setEditingId(null);
              }}
            />
          ) : editingId && !isEditingReceipt ? (
            <ExpenseForm
              participants={group.participants}
              newId={app.newId}
              initial={editingExpense}
              onCancel={() => setEditingId(null)}
              onSubmit={(exp) => {
                app.updateExpense(group.id, editingId, exp);
                setEditingId(null);
              }}
            />
          ) : (
            <>
              <div className="entry-tabs" role="tablist" aria-label="Expense type">
                <button
                  type="button"
                  role="tab"
                  aria-selected={entryTab === 'quick'}
                  className={`entry-tab${entryTab === 'quick' ? ' active' : ''}`}
                  onClick={() => setEntryTab('quick')}
                >
                  Quick
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={entryTab === 'receipt'}
                  className={`entry-tab${entryTab === 'receipt' ? ' active' : ''}`}
                  onClick={() => setEntryTab('receipt')}
                >
                  Receipt
                </button>
              </div>
              {entryTab === 'quick' ? (
                <ExpenseForm
                  participants={group.participants}
                  newId={app.newId}
                  onSubmit={(exp) => app.addExpense(group.id, exp)}
                />
              ) : (
                <ReceiptExpenseForm
                  participants={group.participants}
                  newId={app.newId}
                  onSubmit={(exp) => app.addExpense(group.id, exp)}
                />
              )}
            </>
          )}

          <div className="rece-paper">
            <h3 style={{ marginTop: 0 }}>Activity</h3>
            {group.expenses.length === 0 ? (
              <p className="muted" style={{ marginBottom: 0 }}>
                No expenses yet.
              </p>
            ) : (
              group.expenses.map((e) => {
                const payer = group.participants.find((p) => p.id === e.paidById);
                const mode =
                  e.splitMode === 'receipt'
                    ? 'Receipt'
                    : e.splitMode === 'equal'
                      ? 'Equal'
                      : e.splitMode === 'custom'
                        ? 'Exact'
                        : e.splitMode === 'percent'
                          ? 'Percent'
                          : 'Units';
                return (
                  <div key={e.id} className="expense-item">
                    <div className="expense-head">
                      <strong>{e.description}</strong>
                      <span className="amount-strong">{formatMoney(e.amount)}</span>
                    </div>
                    <div className="expense-meta">
                      {payer?.name ?? '?'} paid · {mode} ·{' '}
                      {e.splitParticipantIds.length} people
                      {e.splitMode === 'receipt' && e.receiptLines?.length
                        ? ` · ${e.receiptLines.length} lines`
                        : ''}
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
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

      {groupTab === 'settle' && group.participants.length === 0 ? (
        <div className="rece-paper empty">
          Add people in the <strong>People</strong> tab to see balances and
          settle up.
        </div>
      ) : null}

      {groupTab === 'settle' && group.participants.length > 0 ? (
        <>
          <div className="rece-paper">
            <h3 style={{ marginTop: 0 }}>Balances</h3>
            <p className="muted" style={{ marginTop: -6 }}>
              Positive = gets money back; negative = owes.
            </p>
            {group.participants.map((p) => {
              const b = roundMoney(balances[p.id] ?? 0);
              let cls = 'balance-pill neutral';
              let label = 'Even';
              if (b > 0.02) {
                cls = 'balance-pill owed';
                label = 'Owed';
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
                      <span className="muted" style={{ marginLeft: 6 }}>
                        {b < -0.02
                          ? '(you owe)'
                          : b > 0.02
                            ? "(you're owed)"
                            : '(you)'}
                      </span>
                    ) : null}
                    <span
                      className="muted"
                      style={{ marginLeft: 6, fontSize: '0.75rem' }}
                    >
                      {label}
                    </span>
                  </span>
                  <span className="amount-strong">{formatMoney(b)}</span>
                </div>
              );
            })}
          </div>

          <div className="rece-paper">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
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
                  Clear checks
                </button>
              ) : null}
            </div>
            <p className="muted" style={{ marginTop: 6 }}>
              Fewest payments. Check when done; Venmo uses creditor&apos;s @
              from People.
            </p>
            {transfers.length === 0 ? (
              <p className="muted" style={{ marginBottom: 0 }}>
                All square.
              </p>
            ) : (
              transfers.map((t) => {
                const fromP = group.participants.find((p) => p.id === t.from);
                const toP = group.participants.find((p) => p.id === t.to);
                const done = isSettled(group, t);
                const venmo =
                  toP?.venmo &&
                  venmoPayUrl(toP.venmo, t.amount, `${group.name} · Evenly`);
                return (
                  <div
                    key={transferKey(t)}
                    className={`settle-row${done ? ' done' : ''}`}
                  >
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={() => app.toggleSettled(group.id, t)}
                      />
                      <span>
                        <strong>{fromP?.name ?? t.from}</strong>
                        <span className="muted"> → </span>
                        <strong>{toP?.name ?? t.to}</strong>
                      </span>
                    </label>
                    <span className="settle-row-actions">
                      <span className="amount-strong">{formatMoney(t.amount)}</span>
                      {venmo ? (
                        <a
                          className="btn btn-ghost btn-sm venmo-link"
                          href={venmo}
                        >
                          Venmo
                        </a>
                      ) : null}
                    </span>
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
