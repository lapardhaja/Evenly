import { useCallback, useState } from 'react';
import Dashboard from './components/Dashboard.jsx';
import GroupView from './components/GroupView.jsx';
import Header from './components/Header.jsx';
import { useAppState } from './hooks/useAppState.js';
import { useTheme } from './hooks/useTheme.js';

export default function App() {
  const app = useAppState();
  const { theme, toggle } = useTheme();
  const [openGroupId, setOpenGroupId] = useState(null);

  const onOpenGroup = useCallback((id) => setOpenGroupId(id), []);
  const onBack = useCallback(() => setOpenGroupId(null), []);

  return (
    <div className="app">
      <Header theme={theme} onToggleTheme={toggle} />
      <main className="app-main">
        {openGroupId ? (
          <GroupView app={app} groupId={openGroupId} onBack={onBack} />
        ) : (
          <Dashboard app={app} onOpenGroup={onOpenGroup} />
        )}
      </main>
      <footer className="app-footer">
        <p>By Sevi &amp; Amanda™</p>
      </footer>
    </div>
  );
}
