import { compressImageDataUrl } from './compressImageForScan.js';

/**
 * Image data URL → compress → /api/scan (Vercel) → Gemini (images only).
 */
export async function scanReceiptImage(dataUrl) {
  const processed = await compressImageDataUrl(dataUrl);

  const m = processed.match(/^data:([^;]+);base64,(.+)$/);
  const mimeType = m ? m[1] : 'image/jpeg';
  const base64Image = m ? m[2].trim() : processed.replace(/^data:[^;]+;base64,/, '').trim();

  const origin = (import.meta.env.VITE_SCAN_RECEIPT_URL || '').replace(/\/$/, '');
  const url = `${origin}/api/scan`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Image, mimeType }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 413) {
      throw new Error('That photo is too large. Try a smaller image.');
    }
    if (res.status >= 500) {
      throw new Error('Something went wrong. Please try again in a moment.');
    }
    const apiMsg = typeof data.error === 'string' ? data.error : '';
    if (apiMsg && !/supabase|gemini|vercel|api key|unauthorized/i.test(apiMsg)) {
      throw new Error(apiMsg);
    }
    throw new Error('We couldn’t read this receipt. Try another photo.');
  }

  const items = Array.isArray(data.items) ? data.items : [];
  const storeName = typeof data.storeName === 'string' ? data.storeName.trim() : '';
  const tax = typeof data.tax === 'number' && Number.isFinite(data.tax) ? Math.max(0, data.tax) : 0;
  const tip = typeof data.tip === 'number' && Number.isFinite(data.tip) ? Math.max(0, data.tip) : 0;
  const receiptDate = typeof data.receiptDate === 'string' ? data.receiptDate.trim() : '';
  const grandTotal =
    typeof data.grandTotal === 'number' && Number.isFinite(data.grandTotal)
      ? Math.max(0, data.grandTotal)
      : 0;
  const discount =
    typeof data.discount === 'number' && Number.isFinite(data.discount)
      ? Math.max(0, data.discount)
      : 0;

  return { storeName, items, tax, tip, discount, receiptDate, grandTotal };
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('We couldn’t read that file.'));
    reader.readAsDataURL(file);
  });
}
