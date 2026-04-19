import { createHashRouter, Navigate } from 'react-router-dom';
import Layout from './core/Layout.jsx';
import RequireAuth from './core/RequireAuth.jsx';
import GroupsPage from './pages/GroupsPage.jsx';
import GroupDetailPage from './pages/GroupDetailPage.jsx';
import ReceiptInfoPage from './pages/ReceiptInfoPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import UpdatePasswordPage from './pages/UpdatePasswordPage.jsx';
import SharedSettlementPage from './pages/SharedSettlementPage.jsx';
import FriendsPage from './pages/FriendsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import ProfileSetupPage from './pages/ProfileSetupPage.jsx';

export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'update-password', element: <UpdatePasswordPage /> },
      {
        path: 'profile-setup',
        element: (
          <RequireAuth>
            <ProfileSetupPage />
          </RequireAuth>
        ),
      },
      {
        path: 'profile',
        element: (
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        ),
      },
      {
        path: 'friends',
        element: (
          <RequireAuth>
            <FriendsPage />
          </RequireAuth>
        ),
      },
      { path: 'shared-settlement/:token', element: <SharedSettlementPage /> },
      {
        index: true,
        element: (
          <RequireAuth>
            <GroupsPage />
          </RequireAuth>
        ),
      },
      {
        path: 'groups/:groupId',
        element: (
          <RequireAuth>
            <GroupDetailPage />
          </RequireAuth>
        ),
      },
      {
        path: 'groups/:groupId/:tab',
        element: (
          <RequireAuth>
            <GroupDetailPage />
          </RequireAuth>
        ),
      },
      {
        path: 'groups/:groupId/receipt/:receiptId',
        element: (
          <RequireAuth>
            <ReceiptInfoPage />
          </RequireAuth>
        ),
      },
      {
        path: 'groups/:groupId/receipt/:receiptId/:tab',
        element: (
          <RequireAuth>
            <ReceiptInfoPage />
          </RequireAuth>
        ),
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
