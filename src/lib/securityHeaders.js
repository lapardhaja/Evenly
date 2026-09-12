/**
 * Browser security headers for the Vercel static + API deploy.
 * Keep `vercel.json` in lockstep — `src/lib/securityHeaders.test.js` diffs them.
 *
 * Not applied on GitHub Pages. Production is Vercel (`evenly.lapardhaja.com`).
 *
 * CSP notes:
 * - `'unsafe-inline'` scripts: password-reset capture in `index.html` (must run before the PWA SW).
 * - `'unsafe-inline'` styles: MUI / Emotion runtime style tags + Google Fonts CSS.
 * - `Cross-Origin-Opener-Policy: same-origin-allow-popups` so Venmo `window.open` still works.
 * - No COEP: would break Google Fonts and Supabase signed image URLs.
 */

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://*.supabase.co",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  'upgrade-insecure-requests',
].join('; ');

export const PERMISSIONS_POLICY =
  'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()';

export const VERCEL_SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: PERMISSIONS_POLICY },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'Content-Security-Policy', value: CONTENT_SECURITY_POLICY },
];
