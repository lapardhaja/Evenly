import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import Layout from './core/Layout.jsx';
import BaseRouter from './core/BaseRouter.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <Layout>
        <BaseRouter />
      </Layout>
    </HashRouter>
  </React.StrictMode>,
);
