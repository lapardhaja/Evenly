import { useCallback, useState } from 'react';
import Dashboard from './components/Dashboard.jsx';
import GroupView from './components/GroupView.jsx';
import { useAppState } from './hooks/useAppState.js';
import { useTheme } from './hooks/useTheme.js';

export default function App() {
  const app = useAppState();
  const { theme, toggle } = useTheme();
  const [openGroupId, setOpenGroupId] = useState(null);

  const onOpenGroup = useCallback((id) => setOpenGroupId(id), []);
  const onBack = useCallback(() => setOpenGroupId(null), []);
  const activeGroup = app.groups.find((group) => group.id === openGroupId) ?? null;

  return (
    <div className="app-shell">
      <header className="rece-appbar">
        <div className="rece-appbar-inner">
          <div className="rece-appbar-leading">
            {openGroupId ? (
              <button
                type="button"
                className="btn btn-ghost rece-appbar-back"
                onClick={onBack}
                aria-label="Back to groups"
              >
                Back
              </button>
            ) : (
              <span className="brand-badge">EVENLY</span>
            )}
            <div>
              <h1 className="rece-appbar-title">Evenly</h1>
              <p className="rece-appbar-subtitle">
                {activeGroup
                  ? `${activeGroup.name} workspace`
                  : 'Rece-inspired bill splitting'}
              </p>
            </div>
          </div>
          <div className="rece-appbar-actions">
            <button
              type="button"
              className="btn btn-ghost rece-appbar-theme"
              onClick={toggle}
              aria-label={
                theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
              }
            >
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
          </div>
        </div>
      </header>

      <div className="rece-container">
        <main className="app-main">
          {openGroupId ? (
            <GroupView app={app} groupId={openGroupId} onBack={onBack} />
          ) : (
            <Dashboard app={app} onOpenGroup={onOpenGroup} />
          )}
        </main>
      </div>

      <footer className="app-footer">
        <p>Private by default. Everything stays in your browser.</p>
      </footer>
    </div>
  );
}
