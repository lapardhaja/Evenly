import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { router } from './router.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { GroupsDataProvider } from './context/GroupsDataContext.jsx';
import AppErrorBoundary from './components/AppErrorBoundary.jsx';
import './index.css';

const PRELOAD_RELOAD_KEY = 'evenly:chunk-reload';

/** Stale PWA cache after a deploy: hashed JS 404s → Vite preload error → blank #root. */
window.addEventListener('vite:preloadError', () => {
  try {
    if (sessionStorage.getItem(PRELOAD_RELOAD_KEY)) return;
    sessionStorage.setItem(PRELOAD_RELOAD_KEY, '1');
  } catch {
    /* ignore */
  }
  window.location.reload();
});

/** When a new build is deployed, activate it immediately so users aren’t stuck on an old cached app (e.g. removed features). */
let updateSW;
updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true);
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <AuthProvider>
        <GroupsDataProvider>
          <RouterProvider router={router} />
        </GroupsDataProvider>
      </AuthProvider>
    </AppErrorBoundary>
  </React.StrictMode>,
);
