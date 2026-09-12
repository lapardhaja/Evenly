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
    role: 'Latest USD FX table for Venmo USD and same-day receipts. No account data is sent',
    region: 'Varies (third-party CDN / API)',
  },
  {
    name: 'jsDelivr / Fawaz Ahmed currency-api',
    role: 'Dated public FX tables (from 2024-03-02) and latest fallback. No account data is sent',
    region: 'Varies (jsDelivr CDN)',
  },
  {
    name: 'Frankfurter (api.frankfurter.dev)',
    role: 'Historical ECB FX table for receipt dates before the currency-api archive, and as fallback. No account data is sent',
    region: 'Varies (third-party API)',
  },
];
