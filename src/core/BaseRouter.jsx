import { Routes, Route, Navigate } from 'react-router-dom';
import GroupsPage from '../pages/GroupsPage.jsx';
import GroupDetailPage from '../pages/GroupDetailPage.jsx';
import ReceiptInfoPage from '../pages/ReceiptInfoPage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import RequireAuth from './RequireAuth.jsx';

export default function BaseRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <GroupsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/groups/:groupId"
        element={
          <RequireAuth>
            <GroupDetailPage />
          </RequireAuth>
        }
      />
      <Route
        path="/groups/:groupId/:tab"
        element={
          <RequireAuth>
            <GroupDetailPage />
          </RequireAuth>
        }
      />
      <Route
        path="/groups/:groupId/receipt/:receiptId"
        element={
          <RequireAuth>
            <ReceiptInfoPage />
          </RequireAuth>
        }
      />
      <Route
        path="/groups/:groupId/receipt/:receiptId/:tab"
        element={
          <RequireAuth>
            <ReceiptInfoPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
