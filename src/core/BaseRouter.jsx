import { Routes, Route, Navigate } from 'react-router-dom';
import GroupsPage from '../pages/GroupsPage.jsx';
import GroupDetailPage from '../pages/GroupDetailPage.jsx';
import ReceiptInfoPage from '../pages/ReceiptInfoPage.jsx';

export default function BaseRouter() {
  return (
    <Routes>
      <Route path="/" element={<GroupsPage />} />
      <Route path="/groups/:groupId" element={<GroupDetailPage />} />
      <Route path="/groups/:groupId/:tab" element={<GroupDetailPage />} />
      <Route path="/groups/:groupId/receipt/:receiptId" element={<ReceiptInfoPage />} />
      <Route path="/groups/:groupId/receipt/:receiptId/:tab" element={<ReceiptInfoPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
