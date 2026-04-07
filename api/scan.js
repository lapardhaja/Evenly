/**
 * POST /api/scan
 * Body: { base64Image: string (raw base64), mimeType: string e.g. "image/jpeg" }
 * Env: GEMINI_API_KEY (optional GEMINI_MODEL, default gemini-3.1-flash-lite-preview)
 */

const DEFAULT_MODEL = 'gemini-3.1-flash-lite-preview';

function geminiUrl(model, apiKey) {
  const m = encodeURIComponent(model);
  return `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(apiKey)}`;
}

function parseGeminiJson(text) {
  if (!text || typeof text !== 'string') return null;
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeMoney(val) {
  if (val == null || val === '') return 0;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  if (!Number.isFinite(n) || n < 0 || n > 100_000) return 0;
  return n;
}

/** Discount is stored as a positive amount; accept negative from model as absolute. */
function normalizeDiscount(val) {
  if (val == null || val === '') return 0;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  if (!Number.isFinite(n) || n === 0) return 0;
  const a = Math.abs(n);
  if (a > 100_000) return 0;
  return a;
}

/** YYYY-MM-DD only; returns null if invalid */
function normalizeReceiptDateISO(str) {
  if (str == null) return null;
  const s = String(str).trim();
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return s;
}

function normalizeItems(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const row of raw) {
    const name = String(row?.name ?? '').trim();
    if (!name) continue;
    const quantity = Math.max(1, Math.min(999, parseInt(String(row?.quantity), 10) || 1));
    const price = row?.price ?? row?.cost;
    const cost = typeof price === 'number' ? price : parseFloat(String(price).replace(/,/g, ''));
    if (!Number.isFinite(cost) || cost < 0 || cost > 100_000) continue;
    out.push({ name: name.slice(0, 200), quantity, cost });
  }
  return out;
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Server misconfiguration: GEMINI_API_KEY is not set',
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

  let base64 = body?.base64Image;
  let mimeType = body?.mimeType || 'image/jpeg';

  // Legacy: single data URL field from older clients
  if (!base64 && body?.imageBase64) {
    const raw = body.imageBase64;
    const dataUrl = String(raw);
    const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (m) {
      mimeType = m[1] || mimeType;
      base64 = m[2].trim();
    } else {
      base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '').trim();
    }
  }

  if (!base64 || typeof base64 !== 'string') {
    return res.status(400).json({ error: 'No image provided (base64Image + mimeType)' });
  }

  base64 = base64.replace(/\s/g, '');
  if (base64.length > 5_000_000) {
    return res.status(413).json({ error: 'Image too large' });
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const prompt = `Look at this receipt image and extract data for a bill-splitting app.
Return ONLY a valid JSON object (no markdown, no code fences):
{
  "storeName": "business name if visible, else empty string",
  "items": [
    { "name": "item name", "quantity": 1, "price": 0.00 }
  ],
  "tax": 0.00,
  "tip": 0.00,
  "discount": 0.00,
  "receiptDate": "",
  "grandTotal": 0.00
}

Rules for "receiptDate":
- If a transaction date appears on the receipt (not future-dated promos), return it as "YYYY-MM-DD" only (e.g. "2024-03-15").
- Prefer the main receipt / transaction date over "reprint" dates if both exist.
- If unclear or missing, use empty string "".

Rules for "grandTotal":
- The final TOTAL / AMOUNT DUE the customer pays, as a number. Use 0 if not visible.

Rules for "items":
- "price" is the line total for that row (unit price × quantity), as a number.
- quantity defaults to 1 if not shown.
- Do NOT put these in items (they go in tax/tip instead): sales tax, VAT, tax lines, tip, gratuity, service charge, service fee, auto gratuity, convenience fee if clearly a tip-like charge.
- EXCLUDE from items: subtotal, total, payment lines (VISA, AMEX, CASH, CHANGE), addresses, date-only lines.
- Do NOT duplicate discount amounts inside "items" if you put them in "discount".

Rules for "tax":
- Put the receipt's sales tax / VAT / "Tax" line amount here. Use 0 if not shown or unclear.

Rules for "tip":
- Put the combined amount of: tip, gratuity, service fee (when it is a discretionary/tip-style fee), service charge, auto gratuity—if multiple such lines exist, sum them into one number. Use 0 if none.

Rules for "discount":
- Positive number: total savings from the receipt (store discount, coupon, promo, "You saved", loyalty, employee discount, etc.). Sum multiple discount lines into one.
- If the receipt shows a negative dollar line for discount, use the absolute value.
- Use 0 if none or unclear.
- This discount applies to the item subtotal before tax and tip (typical register behavior).

If nothing is readable, return {"storeName":"","items":[],"tax":0,"tip":0,"discount":0,"receiptDate":"","grandTotal":0}
Always return valid JSON with keys storeName, items, tax, tip, discount, receiptDate, grandTotal.`;

  try {
    const response = await fetch(geminiUrl(model, apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64,
                },
              },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data?.error?.message || 'Gemini request failed';
      return res.status(502).json({ error: msg });
    }

    const blockReason = data?.candidates?.[0]?.finishReason;
    if (blockReason && blockReason !== 'STOP') {
      return res.status(502).json({ error: `Gemini blocked response: ${blockReason}` });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      return res.status(502).json({ error: 'No response from Gemini' });
    }

    const parsed = parseGeminiJson(text);
    if (!parsed || typeof parsed !== 'object') {
      return res.status(502).json({ error: 'Could not parse receipt data' });
    }

    const storeName = String(parsed.storeName ?? '').trim().slice(0, 200);
    const items = normalizeItems(parsed.items);
    const tax = normalizeMoney(parsed.tax ?? parsed.taxAmount);
    const tip = normalizeMoney(
      parsed.tip ?? parsed.tipAmount ?? parsed.gratuity ?? parsed.serviceFee,
    );
    const receiptDate =
      normalizeReceiptDateISO(parsed.receiptDate) ||
      normalizeReceiptDateISO(parsed.date) ||
      normalizeReceiptDateISO(parsed.transactionDate);
    const grandTotal = normalizeMoney(parsed.grandTotal ?? parsed.total ?? parsed.amountDue);
    const discount = normalizeDiscount(
      parsed.discount ??
        parsed.discountTotal ??
        parsed.savings ??
        parsed.promoDiscount,
    );

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({
      storeName,
      items,
      tax,
      tip,
      discount,
      receiptDate: receiptDate || '',
      grandTotal,
    });
  } catch (err) {
    console.error('Scan error:', err);
    return res.status(500).json({ error: err.message || 'Failed to scan receipt' });
  }
}
