import { createHashRouter, Navigate } from 'react-router-dom';
import Layout from './core/Layout.jsx';
import RequireAuth from './core/RequireAuth.jsx';
import HomePage from './pages/HomePage.jsx';
import GroupsPage from './pages/GroupsPage.jsx';
import GroupDetailPage from './pages/GroupDetailPage.jsx';
import ReceiptInfoPage from './pages/ReceiptInfoPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import UpdatePasswordPage from './pages/UpdatePasswordPage.jsx';
import PrivacyPolicyPage from './pages/legal/PrivacyPolicyPage.jsx';
import TermsOfServicePage from './pages/legal/TermsOfServicePage.jsx';
import CookiePolicyPage from './pages/legal/CookiePolicyPage.jsx';
import CopyrightPage from './pages/legal/CopyrightPage.jsx';
import SecurityPage from './pages/legal/SecurityPage.jsx';
import SharedSettlementPage from './pages/SharedSettlementPage.jsx';
import PublicGroupSharePage from './pages/PublicGroupSharePage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import FriendsPage from './pages/FriendsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import ProfileSetupPage from './pages/ProfileSetupPage.jsx';
import ChatInboxPage from './pages/ChatInboxPage.jsx';
import ChatThreadPage from './pages/ChatThreadPage.jsx';
import InviteRedeemPage from './pages/InviteRedeemPage.jsx';
import ScanQrPage from './pages/ScanQrPage.jsx';

export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'privacy', element: <PrivacyPolicyPage /> },
      { path: 'terms', element: <TermsOfServicePage /> },
      { path: 'cookies', element: <CookiePolicyPage /> },
      { path: 'copyright', element: <CopyrightPage /> },
      { path: 'security', element: <SecurityPage /> },
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
        path: 'search',
        element: (
          <RequireAuth>
            <SearchPage />
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
      {
        path: 'chat',
        element: (
          <RequireAuth>
            <ChatInboxPage />
          </RequireAuth>
        ),
      },
      ...(import.meta.env.DEV
        ? [
            {
              path: 'dev/chat-layout',
              lazy: () =>
                import('./pages/ChatLayoutPreview.jsx').then((m) => ({ Component: m.default })),
            },
            {
              path: 'dev/scan-assign',
              lazy: () =>
                import('./pages/ScanAssignPreview.jsx').then((m) => ({ Component: m.default })),
            },
            {
              path: 'dev/home-balances',
              lazy: () =>
                import('./pages/HomeBalancesPreview.jsx').then((m) => ({ Component: m.default })),
            },
          ]
        : []),
      {
        path: 'chat/:conversationId',
        element: (
          <RequireAuth>
            <ChatThreadPage />
          </RequireAuth>
        ),
      },
      {
        path: 'scan',
        element: (
          <RequireAuth>
            <ScanQrPage />
          </RequireAuth>
        ),
      },
      {
        path: 'join/:token',
        element: (
          <RequireAuth>
            <InviteRedeemPage kind="group" />
          </RequireAuth>
        ),
      },
      {
        path: 'add/:token',
        element: (
          <RequireAuth>
            <InviteRedeemPage kind="friend" />
          </RequireAuth>
        ),
      },
      { path: 'shared-settlement/:token', element: <SharedSettlementPage /> },
      { path: 'share/:shareId', element: <PublicGroupSharePage /> },
      {
        index: true,
        element: (
          <RequireAuth>
            <HomePage />
          </RequireAuth>
        ),
      },
      {
        path: 'groups',
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
