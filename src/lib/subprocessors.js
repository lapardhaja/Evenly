/**
 * Infrastructure providers that process data on Evenly's behalf.
 * Shown on Privacy (and referenced from Security).
 */
export const SUBPROCESSORS = [
  {
    name: 'Vercel Inc.',
    role: 'Application hosting, TLS termination, serverless APIs (`POST /api/scan`, `POST /api/chat-push`)',
    region: 'United States (and Vercel edge locations)',
  },
  {
    name: 'Supabase, Inc.',
    role: 'Authentication, Postgres (groups, chat, friends), Storage (receipt and chat attachments), Realtime',
    region: 'As configured for the production project (United States)',
  },
  {
    name: 'Google LLC (Gemini API)',
    role: 'Optional receipt OCR. The scan image is sent from Evenly’s server; Evenly does not keep that image unless you attach it',
    region: 'United States (Google Cloud / Gemini API)',
  },
  {
    name: 'Browser push services',
    role: 'Web Push delivery (for example FCM, Mozilla, or Apple) when you enable message alerts',
    region: 'Varies by browser vendor',
  },
  {
    name: 'ExchangeRate-API (open.er-api.com)',
    role: 'Public USD FX table for mixed-currency group totals and Settle. No account data is sent',
    region: 'Varies (third-party CDN / API)',
  },
  {
    name: 'jsDelivr / Fawaz Ahmed currency-api',
    role: 'Fallback public FX table if ExchangeRate-API is unavailable. No account data is sent',
    region: 'Varies (jsDelivr CDN)',
  },
];
