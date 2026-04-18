import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { router } from './router.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { GroupsDataProvider } from './context/GroupsDataContext.jsx';
import './index.css';

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
    <AuthProvider>
      <GroupsDataProvider>
        <RouterProvider router={router} />
      </GroupsDataProvider>
    </AuthProvider>
  </React.StrictMode>,
);
