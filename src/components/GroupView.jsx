import { useEffect, useMemo, useState } from 'react';
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

function navLabel(tab) {
  if (tab === 'items') return 'Expenses';
  if (tab === 'people') return 'People';
  return 'Settle';
}

function formatDate(value) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'No date';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function modeLabel(expense) {
  if (expense.splitMode === 'receipt') return 'Receipt';
  if (expense.splitMode === 'equal') return 'Equal';
  if (expense.splitMode === 'custom') return 'Exact';
  if (expense.splitMode === 'percent') return 'Percent';
  return 'Units';
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
  const [composerOpen, setComposerOpen] = useState(false);
  const [renameMode, setRenameMode] = useState(false);
  const [groupNameDraft, setGroupNameDraft] = useState(group?.name ?? '');

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

  useEffect(() => {
    setGroupNameDraft(group?.name ?? '');
  }, [group?.name]);

  useEffect(() => {
    if (editingId) setComposerOpen(true);
  }, [editingId]);

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
    const names = participantName
      .split(/[\n,]+/)
      .map((name) => name.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    const existing = new Set(
      group.participants.map((person) => person.name.trim().toLowerCase())
    );
    names.forEach((name) => {
      const normalized = name.toLowerCase();
      if (!existing.has(normalized)) {
        app.addParticipant(group.id, name);
        existing.add(normalized);
      }
    });
    setParticipantName('');
  }

  function handleRenameGroup(e) {
    e.preventDefault();
    const next = groupNameDraft.trim();
    if (!next) return;
    app.renameGroup(group.id, next);
    setRenameMode(false);
  }

  function handleStartComposer(nextTab) {
    setEditingId(null);
    setEntryTab(nextTab);
    setComposerOpen(true);
  }

  function handleCloseComposer() {
    setEditingId(null);
    setComposerOpen(false);
  }

  const editingExpense = editingId
    ? group.expenses.find((e) => e.id === editingId) ?? null
    : null;

  const isEditingReceipt = editingExpense?.splitMode === 'receipt';
  const totalSpent = roundMoney(
    group.expenses.reduce((sum, expense) => sum + expense.amount, 0)
  );
  const outstandingCount = group.participants.filter(
    (participant) => Math.abs(balances[participant.id] ?? 0) > 0.02
  ).length;
  const myBalance = meId ? roundMoney(balances[meId] ?? 0) : 0;
  const mySummary =
    meId == null
      ? 'Add your name in the home screen to highlight your balance here.'
      : myBalance < -0.02
        ? `You currently owe ${formatMoney(Math.abs(myBalance))}.`
        : myBalance > 0.02
          ? `You should get back ${formatMoney(myBalance)}.`
          : 'You are even in this group right now.';
  const latestExpense = group.expenses[0]?.createdAt ?? '';

  const composer = editingId ? (
    isEditingReceipt ? (
      <ReceiptExpenseForm
        participants={group.participants}
        newId={app.newId}
        initial={editingExpense}
        onCancel={handleCloseComposer}
        onSubmit={(exp) => {
          app.updateExpense(group.id, editingId, exp);
          handleCloseComposer();
        }}
      />
    ) : (
      <ExpenseForm
        participants={group.participants}
        newId={app.newId}
        initial={editingExpense}
        onCancel={handleCloseComposer}
        onSubmit={(exp) => {
          app.updateExpense(group.id, editingId, exp);
          handleCloseComposer();
        }}
      />
    )
  ) : entryTab === 'quick' ? (
    <ExpenseForm
      participants={group.participants}
      newId={app.newId}
      onSubmit={(exp) => {
        app.addExpense(group.id, exp);
        setComposerOpen(false);
      }}
      onCancel={handleCloseComposer}
    />
  ) : (
    <ReceiptExpenseForm
      participants={group.participants}
      newId={app.newId}
      onSubmit={(exp) => {
        app.addExpense(group.id, exp);
        setComposerOpen(false);
      }}
      onCancel={handleCloseComposer}
    />
  );

  return (
    <div className="group-page">
      <section className="group-hero rece-paper card-elevated">
        <div className="group-hero-top">
          <div className="group-hero-copy">
            <p className="rece-section-title">Group workspace</p>
            {renameMode ? (
              <form className="group-rename-form" onSubmit={handleRenameGroup}>
                <input
                  className="input"
                  value={groupNameDraft}
                  onChange={(e) => setGroupNameDraft(e.target.value)}
                  aria-label="Group name"
                  autoFocus
                />
                <button type="submit" className="btn btn-primary btn-sm">
                  Save
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setRenameMode(false);
                    setGroupNameDraft(group.name);
                  }}
                >
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <h2 className="group-title">{group.name}</h2>
                <p className="group-subtitle">
                  Track shared spending, itemized receipts, and settlement in one
                  organized workspace.
                </p>
              </>
            )}
          </div>

          {!renameMode ? (
            <div className="group-hero-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setRenameMode(true)}
              >
                Rename
              </button>
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
                Delete
              </button>
            </div>
          ) : null}
        </div>

        <div className="summary-grid">
          <article className="summary-card">
            <span className="summary-label">Tracked total</span>
            <strong className="summary-value">{formatMoney(totalSpent)}</strong>
            <span className="muted">
              {group.expenses.length} entries across simple and itemized flows
            </span>
          </article>
          <article className="summary-card">
            <span className="summary-label">People</span>
            <strong className="summary-value">{group.participants.length}</strong>
            <span className="muted">
              {outstandingCount > 0
                ? `${outstandingCount} balances still open`
                : 'Everybody is settled'}
            </span>
          </article>
          <article className="summary-card">
            <span className="summary-label">Your status</span>
            <strong className="summary-value">
              {meId == null ? 'Not linked' : formatMoney(myBalance)}
            </strong>
            <span className="muted">{mySummary}</span>
          </article>
          <article className="summary-card">
            <span className="summary-label">Last activity</span>
            <strong className="summary-value">{formatDate(latestExpense)}</strong>
            <span className="muted">
              Add a receipt to keep the timeline and settle view fresh
            </span>
          </article>
        </div>
      </section>

      <nav
        className="rece-tabs rece-tabs-desktop"
        role="tablist"
        aria-label="Group sections"
      >
        <button
          type="button"
          role="tab"
          aria-selected={groupTab === 'items'}
          className={`rece-tab${groupTab === 'items' ? ' active' : ''}`}
          onClick={() => setGroupTab('items')}
        >
          Items
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={groupTab === 'people'}
          className={`rece-tab${groupTab === 'people' ? ' active' : ''}`}
          onClick={() => setGroupTab('people')}
        >
          People
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={groupTab === 'settle'}
          className={`rece-tab${groupTab === 'settle' ? ' active' : ''}`}
          onClick={() => setGroupTab('settle')}
        >
          Settle
        </button>
      </nav>

      {groupTab === 'items' && group.participants.length === 0 ? (
        <div className="rece-paper empty">
          Add people in the <strong>People</strong> tab first, then come back to
          log expenses.
        </div>
      ) : null}

      {groupTab === 'items' && group.participants.length > 0 ? (
        <section className="workspace-grid">
          <div className="workspace-main">
            <div className="rece-paper workspace-toolbar">
              <div>
                <p className="rece-section-title">Entry</p>
                <h3 className="workspace-title">Log a new split</h3>
                <p className="muted" style={{ margin: 0 }}>
                  Start with a simple expense or switch to itemized bill entry.
                </p>
              </div>
              <div className="workspace-toolbar-actions">
                <button
                  type="button"
                  className={`btn btn-sm workspace-action-btn ${
                    entryTab === 'quick' ? 'btn-primary' : 'btn-ghost'
                  }`}
                  onClick={() => handleStartComposer('quick')}
                >
                  Quick expense
                </button>
                <button
                  type="button"
                  className={`btn btn-sm workspace-action-btn ${
                    entryTab === 'receipt' ? 'btn-primary' : 'btn-ghost'
                  }`}
                  onClick={() => handleStartComposer('receipt')}
                >
                  Itemized bill
                </button>
                {composerOpen ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm workspace-action-btn"
                    onClick={handleCloseComposer}
                  >
                    Hide form
                  </button>
                ) : null}
              </div>
            </div>

            {composerOpen ? (
              <div className="composer-shell">
                <div className="entry-tabs" role="tablist" aria-label="Expense type">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={entryTab === 'quick'}
                    className={`entry-tab${entryTab === 'quick' ? ' active' : ''}`}
                    onClick={() => setEntryTab('quick')}
                    disabled={Boolean(editingId)}
                  >
                    Quick
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={entryTab === 'receipt'}
                    className={`entry-tab${entryTab === 'receipt' ? ' active' : ''}`}
                    onClick={() => setEntryTab('receipt')}
                    disabled={Boolean(editingId)}
                  >
                    Itemized
                  </button>
                </div>
                {composer}
              </div>
            ) : (
              <div className="rece-paper workspace-cta">
                <p className="muted" style={{ margin: 0 }}>
                  Keep the timeline clean: open the composer only when you need it.
                </p>
              </div>
            )}

            <div className="rece-paper">
              <div className="section-header-row">
                <div>
                  <p className="rece-section-title">Timeline</p>
                  <h3 className="workspace-title">Activity</h3>
                </div>
                <span className="muted">
                  {group.expenses.length} {group.expenses.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>
              {group.expenses.length === 0 ? (
                <p className="muted" style={{ marginBottom: 0 }}>
                  No expenses yet. Start with a quick split or add a full receipt.
                </p>
              ) : (
                <div className="activity-list">
                  {group.expenses.map((expense) => {
                    const payer = group.participants.find(
                      (person) => person.id === expense.paidById
                    );
                    return (
                      <article key={expense.id} className="activity-card">
                        <div className="activity-card-top">
                          <div>
                            <div className="activity-card-title-row">
                              <strong>{expense.description}</strong>
                              <span className="activity-type-badge">
                                {modeLabel(expense)}
                              </span>
                            </div>
                            <p className="activity-card-meta">
                              {payer?.name ?? 'Unknown'} paid on{' '}
                              {formatDate(expense.createdAt)}
                            </p>
                          </div>
                          <span className="amount-strong">
                            {formatMoney(expense.amount)}
                          </span>
                        </div>
                        <div className="activity-card-stats">
                          <span>{expense.splitParticipantIds.length} people included</span>
                          {expense.splitMode === 'receipt' &&
                          expense.receiptLines?.length ? (
                            <span>{expense.receiptLines.length} line items</span>
                          ) : null}
                        </div>
                        <div className="activity-card-actions">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setEditingId(expense.id);
                              setEntryTab(
                                expense.splitMode === 'receipt' ? 'receipt' : 'quick'
                              );
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              if (confirm('Delete this expense?')) {
                                app.deleteExpense(group.id, expense.id);
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <aside className="workspace-rail">
            <div className="rece-paper">
              <p className="rece-section-title">Guide</p>
              <h3 className="workspace-title">How this stays fast</h3>
              <ul className="compact-list">
                <li>Use quick expense for simple equal or exact splits.</li>
                <li>Use itemized bills when each line belongs to specific people.</li>
                <li>Jump to Settle when you only care about the final transfers.</li>
              </ul>
            </div>
            <div className="rece-paper">
              <p className="rece-section-title">Snapshot</p>
              <h3 className="workspace-title">Current state</h3>
              <div className="rail-metric">
                <span className="muted">Tracked</span>
                <strong>{formatMoney(totalSpent)}</strong>
              </div>
              <div className="rail-metric">
                <span className="muted">Open transfers</span>
                <strong>{transfers.length}</strong>
              </div>
              <div className="rail-metric">
                <span className="muted">Last update</span>
                <strong>{formatDate(latestExpense)}</strong>
              </div>
            </div>
          </aside>
        </section>
      ) : null}

      {groupTab === 'people' ? (
        <section className="workspace-grid">
          <div className="workspace-main">
            <div className="rece-paper">
              <div className="section-header-row">
                <div>
                  <p className="rece-section-title">People</p>
                  <h3 className="workspace-title">Who&apos;s in this group</h3>
                </div>
                {app.meName.trim() && !meId ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => app.addParticipant(group.id, app.meName)}
                  >
                    Add me
                  </button>
                ) : null}
              </div>

              <form onSubmit={handleAddParticipant} className="people-form">
                <div className="field" style={{ marginBottom: 0 }}>
                  <label htmlFor="p-name">Add people</label>
                  <textarea
                    id="p-name"
                    className="textarea"
                    placeholder="Type one name, or paste Alice, Bob, Carol"
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  Add people
                </button>
              </form>

              {group.participants.length === 0 ? (
                <p className="muted" style={{ marginBottom: 0 }}>
                  Add everyone who&apos;ll split bills here. Then jump back to Items
                  to log expenses or receipts.
                </p>
              ) : (
                <div className="people-list">
                  {group.participants.map((person) => (
                    <article key={person.id} className="person-card">
                      <div className="rece-avatar" aria-hidden>
                        {nameToInitials(person.name)}
                      </div>
                      <div className="person-card-main">
                        <div className="person-card-name-row">
                          <strong>{person.name}</strong>
                          {meId === person.id ? (
                            <span className="status-chip neutral">You</span>
                          ) : null}
                        </div>
                        <label className="person-card-label">
                          <span className="muted">Venmo handle</span>
                          <input
                            className="input input-inline-wide"
                            type="text"
                            placeholder="@venmo"
                            aria-label={`Venmo for ${person.name}`}
                            value={person.venmo ?? ''}
                            onChange={(e) =>
                              app.updateParticipantVenmo(
                                group.id,
                                person.id,
                                e.target.value
                              )
                            }
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => app.removeParticipant(group.id, person.id)}
                      >
                        Remove
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="workspace-rail">
            <div className="rece-paper">
              <p className="rece-section-title">Tip</p>
              <h3 className="workspace-title">Paste a list</h3>
              <p className="muted" style={{ marginBottom: 0 }}>
                The add field accepts commas or new lines, so you can paste a whole
                guest list from messages in one shot.
              </p>
            </div>
          </aside>
        </section>
      ) : null}

      {groupTab === 'settle' && group.participants.length === 0 ? (
        <div className="rece-paper empty">
          Add people in the <strong>People</strong> tab to see balances and
          settle up.
        </div>
      ) : null}

      {groupTab === 'settle' && group.participants.length > 0 ? (
        <section className="workspace-grid">
          <div className="workspace-main">
            <div className="rece-paper settle-hero">
              <p className="rece-section-title">Settle</p>
              <h3 className="workspace-title">Fastest path to zero</h3>
              <p className="muted" style={{ marginBottom: 0 }}>
                {mySummary} {transfers.length > 0
                  ? `There are ${transfers.length} recommended transfers left.`
                  : 'No payments are needed right now.'}
              </p>
            </div>

            <div className="rece-paper">
              <div className="section-header-row">
                <div>
                  <p className="rece-section-title">Balances</p>
                  <h3 className="workspace-title">Per person</h3>
                </div>
              </div>
              <div className="balance-card-grid">
                {group.participants.map((person) => {
                  const balance = roundMoney(balances[person.id] ?? 0);
                  const tone =
                    balance > 0.02 ? 'owed' : balance < -0.02 ? 'owe' : 'neutral';
                  const label =
                    balance > 0.02 ? 'Gets back' : balance < -0.02 ? 'Owes' : 'Even';
                  return (
                    <article
                      key={person.id}
                      className={`balance-card balance-card-${tone}`}
                    >
                      <div>
                        <strong>{person.name}</strong>
                        <p className="muted" style={{ margin: '4px 0 0' }}>
                          {meId === person.id ? `${label} - you` : label}
                        </p>
                      </div>
                      <span className="amount-strong">{formatMoney(balance)}</span>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="rece-paper">
              <div className="section-header-row">
                <div>
                  <p className="rece-section-title">Transfers</p>
                  <h3 className="workspace-title">Recommended payments</h3>
                </div>
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
              {transfers.length === 0 ? (
                <p className="muted" style={{ marginBottom: 0 }}>
                  All square.
                </p>
              ) : (
                <div className="transfer-list">
                  {transfers.map((transfer) => {
                    const fromPerson = group.participants.find(
                      (person) => person.id === transfer.from
                    );
                    const toPerson = group.participants.find(
                      (person) => person.id === transfer.to
                    );
                    const done = isSettled(group, transfer);
                    const venmo =
                      toPerson?.venmo &&
                      venmoPayUrl(
                        toPerson.venmo,
                        transfer.amount,
                        `${group.name} · Evenly`
                      );
                    return (
                      <article
                        key={transferKey(transfer)}
                        className={`transfer-card${done ? ' done' : ''}`}
                      >
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={done}
                            onChange={() => app.toggleSettled(group.id, transfer)}
                          />
                          <span>
                            <strong>{fromPerson?.name ?? transfer.from}</strong>
                            <span className="muted"> pays </span>
                            <strong>{toPerson?.name ?? transfer.to}</strong>
                          </span>
                        </label>
                        <div className="transfer-card-actions">
                          <span className="amount-strong">
                            {formatMoney(transfer.amount)}
                          </span>
                          {venmo ? (
                            <a className="btn btn-ghost btn-sm venmo-link" href={venmo}>
                              Venmo
                            </a>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <aside className="workspace-rail">
            <div className="rece-paper">
              <p className="rece-section-title">Why these transfers</p>
              <p className="muted" style={{ marginBottom: 0 }}>
                Evenly pairs the largest debtor with the largest creditor first, so
                you get the minimum number of payments needed to settle the group.
              </p>
            </div>
          </aside>
        </section>
      ) : null}

      <nav
        className={`rece-mobile-nav${groupTab === 'items' && composerOpen ? ' is-hidden' : ''}`}
        aria-label="Group mobile navigation"
      >
        <button
          type="button"
          className={`rece-mobile-nav-item${groupTab === 'items' ? ' active' : ''}`}
          onClick={() => setGroupTab('items')}
          aria-label="Open expenses tab"
        >
          <span className="rece-mobile-nav-label">{navLabel('items')}</span>
          <span className="rece-mobile-nav-hint">Track</span>
        </button>
        <button
          type="button"
          className={`rece-mobile-nav-item${groupTab === 'people' ? ' active' : ''}`}
          onClick={() => setGroupTab('people')}
          aria-label="Open people tab"
        >
          <span className="rece-mobile-nav-label">{navLabel('people')}</span>
          <span className="rece-mobile-nav-hint">Manage</span>
        </button>
        <button
          type="button"
          className={`rece-mobile-nav-item${groupTab === 'settle' ? ' active' : ''}`}
          onClick={() => setGroupTab('settle')}
          aria-label="Open settle tab"
        >
          <span className="rece-mobile-nav-label">{navLabel('settle')}</span>
          <span className="rece-mobile-nav-hint">Review</span>
        </button>
      </nav>
    </div>
  );
}
