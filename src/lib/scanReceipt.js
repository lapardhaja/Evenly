import { compressImageDataUrl } from './compressImageForScan.js';

/**
 * Calls Vercel serverless /api/scan-receipt (same origin in prod).
 * Local dev with Vite only: set VITE_SCAN_RECEIPT_URL to your `vercel dev` origin, e.g. http://localhost:3000
 */
export async function scanReceiptImage(imageBase64) {
  const compressed = await compressImageDataUrl(imageBase64);

  const origin = (import.meta.env.VITE_SCAN_RECEIPT_URL || '').replace(/\/$/, '');
  const url = `${origin}/api/scan-receipt`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: compressed }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Scan failed (${res.status})`);
  }
  return data;
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.readAsDataURL(file);
  });
}
