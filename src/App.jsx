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

  return (
    <div className="app-shell">
      <header className="rece-appbar">
        <div className="rece-appbar-inner">
          {openGroupId ? (
            <button
              type="button"
              className="btn btn-ghost rece-appbar-back"
              onClick={onBack}
              aria-label="Back to groups"
            >
              ←
            </button>
          ) : (
            <span className="rece-appbar-spacer" aria-hidden />
          )}
          <button
            type="button"
            className="rece-appbar-title rece-appbar-home"
            onClick={onBack}
            aria-label="Home — all groups"
          >
            Evenly
          </button>
          <div className="rece-appbar-actions">
            <button
              type="button"
              className="btn btn-ghost rece-appbar-theme"
              onClick={toggle}
              aria-label={
                theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
              }
            >
              {theme === 'dark' ? 'Light' : 'Dark'}
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
        <p>Sevi & Amanda™</p>
      </footer>
    </div>
  );
}
