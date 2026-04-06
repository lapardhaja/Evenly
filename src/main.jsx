import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import Layout from './core/Layout.jsx';
import BaseRouter from './core/BaseRouter.jsx';
import './index.css';

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <Layout>
        <BaseRouter />
      </Layout>
    </HashRouter>
  </React.StrictMode>,
);
