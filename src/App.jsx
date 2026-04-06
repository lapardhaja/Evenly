import { useCallback, useState } from 'react';
import Dashboard from './components/Dashboard.jsx';
import GroupView from './components/GroupView.jsx';
import { useAppState } from './hooks/useAppState.js';
import { useTheme } from './hooks/useTheme.js';

export default function App() {
  const app = useAppState();
  useTheme();
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
              <span className="rece-appbar-spacer" aria-hidden />
            )}
            <div className="rece-appbar-title-block">
              <h1 className="rece-appbar-title rece-appbar-title-line">
                <button
                  type="button"
                  className="rece-appbar-home"
                  onClick={onBack}
                  aria-label="Home — all groups"
                >
                  Evenly
                </button>
              </h1>
              <p className="rece-appbar-subtitle">
                {activeGroup
                  ? `${activeGroup.name} workspace`
                  : 'Shared expenses, handled cleanly'}
              </p>
            </div>
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
        <p>Copyright Evenly 2026 Designed by Servet Lapardhaja.</p>
      </footer>
    </div>
  );
}
