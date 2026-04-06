import { Routes, Route, Navigate } from 'react-router-dom';
import ReceiptsPage from '../pages/ReceiptsPage.jsx';
import ReceiptInfoPage from '../pages/ReceiptInfoPage.jsx';

export default function BaseRouter() {
  return (
    <Routes>
      <Route path="/receipts" element={<ReceiptsPage />} />
      <Route path="/receipts/:receiptId" element={<ReceiptInfoPage />} />
      <Route path="/receipts/:receiptId/:tab" element={<ReceiptInfoPage />} />
      <Route path="*" element={<Navigate to="/receipts" replace />} />
    </Routes>
  );
}
