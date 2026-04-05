import { useState } from 'react';
import Modal from './Modal.jsx';

export default function Dashboard({ app, onOpenGroup }) {
  const [name, setName] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  function handleCreate(e) {
    e.preventDefault();
    const id = app.addGroup(name);
    if (id) {
      setName('');
      setModalOpen(false);
      onOpenGroup(id);
    }
  }

  return (
    <>
      <p className="rece-section-title">Profile</p>
      <div className="rece-paper">
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="me-name">Your name</label>
          <input
            id="me-name"
            className="input"
            placeholder="Highlights you owe / you’re owed in each group"
            value={app.meName}
            onChange={(e) => app.setMeName(e.target.value)}
          />
        </div>
      </div>

      <p className="rece-section-title" style={{ marginTop: 8 }}>
        Groups
      </p>
      {app.groups.length === 0 ? (
        <div className="rece-paper empty">
          No groups yet. Tap + to create one.
        </div>
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
        title="New group"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
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
            <label htmlFor="group-name">Name</label>
            <input
              id="group-name"
              className="input"
              autoFocus
              placeholder="Trip, dinner, rent…"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </>
  );
}
