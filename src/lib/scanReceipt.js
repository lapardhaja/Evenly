import { compressImageDataUrl } from './compressImageForScan.js';

/**
 * Photo → /api/scan (Vercel) → Gemini → { storeName, items }
 * Local: VITE_SCAN_RECEIPT_URL=http://localhost:3000 npm run dev (with vercel dev)
 */
export async function scanReceiptImage(dataUrl) {
  const compressed = await compressImageDataUrl(dataUrl);

  const m = compressed.match(/^data:([^;]+);base64,(.+)$/);
  const mimeType = m ? m[1] : 'image/jpeg';
  const base64Image = m ? m[2].trim() : compressed.replace(/^data:image\/\w+;base64,/, '').trim();

  const origin = (import.meta.env.VITE_SCAN_RECEIPT_URL || '').replace(/\/$/, '');
  const url = `${origin}/api/scan`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Image, mimeType }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Scan failed (${res.status})`);
  }

  const items = Array.isArray(data.items) ? data.items : [];
  const storeName = typeof data.storeName === 'string' ? data.storeName.trim() : '';

  return { storeName, items };
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.readAsDataURL(file);
  });
}
