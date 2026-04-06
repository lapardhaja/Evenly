/**
 * Vercel serverless: OCR a receipt image via Google Cloud Vision (DOCUMENT_TEXT_DETECTION).
 * Env: GOOGLE_VISION_API_KEY
 */

import { parseReceiptLines } from './_lib/parseReceiptLines.js';

const VISION_URL = 'https://vision.googleapis.com/v1/images:annotate';

function extractFullText(apiJson) {
  const res = apiJson?.responses?.[0];
  if (!res) return '';

  if (res.fullTextAnnotation?.text) {
    return res.fullTextAnnotation.text;
  }
  if (res.textAnnotations?.[0]?.description) {
    return res.textAnnotations[0].description;
  }
  if (res.error?.message) {
    throw new Error(res.error.message);
  }
  return '';
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Server misconfiguration: GOOGLE_VISION_API_KEY is not set',
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  const imageBase64 = body?.imageBase64;
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({ error: 'Missing imageBase64 (data URL or raw base64)' });
  }

  const b64 = imageBase64.replace(/^data:image\/\w+;base64,/, '').trim();
  // Vercel request body ~4.5MB; client should compress first — keep headroom for JSON
  if (b64.length > 5_000_000) {
    return res.status(413).json({
      error:
        'Image too large for upload. The app should compress automatically — try updating, or use a smaller photo.',
    });
  }

  try {
    const visionRes = await fetch(`${VISION_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: b64 },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
          },
        ],
      }),
    });

    const apiJson = await visionRes.json();

    if (!visionRes.ok) {
      const msg =
        apiJson?.error?.message ||
        apiJson?.responses?.[0]?.error?.message ||
        'Vision API request failed';
      return res.status(502).json({ error: msg });
    }

    const fullText = extractFullText(apiJson);
    const items = parseReceiptLines(fullText);

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({
      items,
      rawPreview: fullText.slice(0, 500),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Scan failed' });
  }
}
