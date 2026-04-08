import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import Layout from './core/Layout.jsx';
import BaseRouter from './core/BaseRouter.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { GroupsDataProvider } from './context/GroupsDataContext.jsx';
import './index.css';

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <GroupsDataProvider>
          <Layout>
            <BaseRouter />
          </Layout>
        </GroupsDataProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>,
);
