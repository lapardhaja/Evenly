import { useState } from 'react';

export default function Dashboard({ app, onOpenGroup }) {
  const [name, setName] = useState('');

  function handleCreate(e) {
    e.preventDefault();
    const id = app.addGroup(name);
    if (id) {
      setName('');
      onOpenGroup(id);
    }
  }

  return (
    <>
      <div className="card card-elevated">
        <h2>Your name</h2>
        <p className="muted" style={{ marginTop: '-0.5rem', marginBottom: '0.75rem' }}>
          Used to highlight what you owe vs. what you&apos;re owed in each group.
        </p>
        <div className="field">
          <label htmlFor="me-name">Display name</label>
          <input
            id="me-name"
            className="input"
            placeholder="e.g. Alex"
            value={app.meName}
            onChange={(e) => app.setMeName(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <h2>New group</h2>
        <form onSubmit={handleCreate}>
          <div className="field">
            <label htmlFor="group-name">Group name</label>
            <input
              id="group-name"
              className="input"
              placeholder="Trip to Lisbon, Rent, Dinner…"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Create group
          </button>
        </form>
      </div>

      <h2 style={{ fontSize: '1.05rem', margin: '1.25rem 0 0.65rem' }}>Groups</h2>
      {app.groups.length === 0 ? (
        <div className="card empty">No groups yet. Create one above.</div>
      ) : (
        <ul className="group-list">
          {app.groups.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                className="group-link"
                onClick={() => onOpenGroup(g.id)}
              >
                <p className="group-link-title">{g.name}</p>
                <span className="muted">
                  {g.participants.length} people · {g.expenses.length} expenses
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
