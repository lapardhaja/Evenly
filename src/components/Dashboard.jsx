import { useMemo, useState } from 'react';
import { computeBalances } from '../lib/balances.js';
import { findMeParticipantId } from '../lib/me.js';
import { roundMoney } from '../lib/settlement.js';
import Modal from './Modal.jsx';

function formatMoney(n) {
  const x = roundMoney(n);
  const sign = x < 0 ? '-' : '';
  return `${sign}$${Math.abs(x).toFixed(2)}`;
}

function formatRelativeDate(value) {
  if (!value) return 'No activity yet';
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return 'No activity yet';
  const diff = Date.now() - then;
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return 'Updated today';
  if (diff < day * 2) return 'Updated yesterday';
  const days = Math.round(diff / day);
  if (days < 7) return `Updated ${days} days ago`;
  return `Updated ${new Date(value).toLocaleDateString()}`;
}

function getGroupSummary(group, meName) {
  const participantIds = group.participants.map((person) => person.id);
  const balances = computeBalances(group.expenses, participantIds);
  const totalSpent = roundMoney(
    group.expenses.reduce((sum, expense) => sum + expense.amount, 0)
  );
  const meId = findMeParticipantId(group.participants, meName);
  const meBalance = meId ? roundMoney(balances[meId] ?? 0) : 0;
  const unsettledCount = participantIds.filter(
    (id) => Math.abs(balances[id] ?? 0) > 0.02
  ).length;
  const latestExpense = group.expenses.reduce((latest, expense) => {
    if (!latest) return expense.createdAt;
    return new Date(expense.createdAt) > new Date(latest) ? expense.createdAt : latest;
  }, '');

  return {
    totalSpent,
    meBalance,
    unsettledCount,
    latestExpense,
  };
}

export default function Dashboard({ app, onOpenGroup }) {
  const [name, setName] = useState('');
  const [peopleDraft, setPeopleDraft] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const groupSummaries = useMemo(
    () =>
      app.groups.map((group) => ({
        group,
        summary: getGroupSummary(group, app.meName),
      })),
    [app.groups, app.meName]
  );

  const totals = useMemo(() => {
    const totalSpent = roundMoney(
      groupSummaries.reduce((sum, entry) => sum + entry.summary.totalSpent, 0)
    );
    const openGroups = groupSummaries.filter(
      (entry) => entry.summary.unsettledCount > 0
    ).length;
    return {
      totalSpent,
      openGroups,
      expenseCount: app.groups.reduce((sum, group) => sum + group.expenses.length, 0),
    };
  }, [app.groups, groupSummaries]);

  function handleCreate(e) {
    e.preventDefault();
    const id = app.addGroup(name);
    if (!id) return;
    const seen = new Set();
    const peopleToAdd = peopleDraft
      .split(/[\n,]+/)
      .map((person) => person.trim())
      .filter(Boolean);

    if (app.meName.trim()) {
      const normalizedMe = app.meName.trim().toLowerCase();
      seen.add(normalizedMe);
      app.addParticipant(id, app.meName);
    }

    peopleToAdd.forEach((person) => {
      const normalized = person.toLowerCase();
      if (seen.has(normalized)) return;
      seen.add(normalized);
      app.addParticipant(id, person);
    });

    setName('');
    setPeopleDraft('');
    setModalOpen(false);
    onOpenGroup(id);
  }

  return (
    <>
      <section className="dashboard-hero rece-paper card-elevated">
        <div className="dashboard-hero-copy">
          <p className="rece-section-title">Split smarter</p>
          <h2 className="dashboard-title">Shared expenses, clearly organized.</h2>
          <p className="dashboard-subtitle">
            Track group spending, itemize shared bills, and settle balances with a
            workflow that feels fast on mobile and efficient on desktop.
          </p>
        </div>
        <div className="dashboard-actions">
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="me-name">Your name</label>
            <input
              id="me-name"
              className="input"
              placeholder="Used to highlight your balance"
              value={app.meName}
              onChange={(e) => app.setMeName(e.target.value)}
            />
          </div>
          <div className="dashboard-action-row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setModalOpen(true)}
            >
              New group
            </button>
            {groupSummaries[0] ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => onOpenGroup(groupSummaries[0].group.id)}
              >
                Open latest
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="dashboard-stats" aria-label="Overview">
        <article className="mini-stat-card rece-paper">
          <span className="mini-stat-label">Groups</span>
          <strong className="mini-stat-value">{app.groups.length}</strong>
          <span className="muted">
            {totals.openGroups > 0
              ? `${totals.openGroups} still need settling`
              : 'Everything is squared away'}
          </span>
        </article>
        <article className="mini-stat-card rece-paper">
          <span className="mini-stat-label">Expenses logged</span>
          <strong className="mini-stat-value">{totals.expenseCount}</strong>
          <span className="muted">Simple entries and detailed bills stay in one timeline</span>
        </article>
        <article className="mini-stat-card rece-paper">
          <span className="mini-stat-label">Tracked total</span>
          <strong className="mini-stat-value">{formatMoney(totals.totalSpent)}</strong>
          <span className="muted">Instant totals with private, browser-local storage</span>
        </article>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-head">
          <div>
            <p className="rece-section-title">Workspace</p>
            <h3 className="dashboard-section-title">Your groups</h3>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setModalOpen(true)}
          >
            Create group
          </button>
        </div>

        {groupSummaries.length === 0 ? (
          <div className="rece-paper empty dashboard-empty">
            <strong>Start with one group.</strong>
            <p className="muted" style={{ margin: '8px 0 0' }}>
              Create a trip, dinner, or apartment group. If you already filled in
              your name, Evenly will add you automatically.
            </p>
          </div>
        ) : (
          <div className="group-card-grid">
            {groupSummaries.map(({ group, summary }) => {
              const myState =
                summary.meBalance < -0.02
                  ? {
                      label: `You owe ${formatMoney(Math.abs(summary.meBalance))}`,
                      tone: 'owe',
                    }
                  : summary.meBalance > 0.02
                    ? {
                        label: `You're owed ${formatMoney(summary.meBalance)}`,
                        tone: 'owed',
                      }
                    : app.meName.trim()
                      ? { label: 'You are even', tone: 'neutral' }
                      : { label: 'Add your name for personal balances', tone: 'neutral' };

              return (
                <button
                  key={group.id}
                  type="button"
                  className="group-card"
                  onClick={() => onOpenGroup(group.id)}
                >
                  <div className="group-card-top">
                    <div>
                      <p className="group-card-title">{group.name}</p>
                      <p className="group-card-date">
                        {formatRelativeDate(summary.latestExpense)}
                      </p>
                    </div>
                    <span className={`status-chip ${myState.tone}`}>{myState.label}</span>
                  </div>

                  <div className="group-card-metrics">
                    <span>{group.participants.length} people</span>
                    <span>{group.expenses.length} entries</span>
                    <span>{formatMoney(summary.totalSpent)} tracked</span>
                  </div>

                  <div className="group-card-footer">
                    <span className="muted">
                      {summary.unsettledCount > 0
                        ? `${summary.unsettledCount} balances still open`
                        : 'No open balances'}
                    </span>
                    <span className="group-card-link">Open</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="rece-fab-wrap">
        <button
          type="button"
          className="rece-fab"
          aria-label="New group"
          onClick={() => setModalOpen(true)}
        >
          +
        </button>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create a new group"
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" form="form-new-group" className="btn btn-primary">
              Create
            </button>
          </>
        }
      >
        <form id="form-new-group" onSubmit={handleCreate}>
          <div className="field">
            <label htmlFor="group-name">Group name</label>
            <input
              id="group-name"
              className="input"
              autoFocus
              placeholder="Summer trip, Friday dinner, apartment"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="group-people">Add people now</label>
            <textarea
              id="group-people"
              className="textarea"
              placeholder="Alex, Sarah, Mike"
              value={peopleDraft}
              onChange={(e) => setPeopleDraft(e.target.value)}
            />
          </div>
          {app.meName.trim() ? (
            <p className="muted" style={{ marginBottom: 0 }}>
              You&apos;ll be added automatically as {app.meName.trim()}. Add the rest
              of the group here to start with a complete setup.
            </p>
          ) : (
            <p className="muted" style={{ marginBottom: 0 }}>
              Add names separated by commas or new lines. You can always edit the
              list later.
            </p>
          )}
        </form>
      </Modal>
    </>
  );
}
