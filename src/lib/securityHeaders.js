/**
 * Browser security headers for the Vercel static + API deploy.
 * Keep `vercel.json` in lockstep — `src/lib/securityHeaders.test.js` diffs them.
 *
 * Not applied on GitHub Pages. Production is Vercel (`evenly.lapardhaja.com`).
 *
 * CSP notes:
 * - Scripts: `'self'` only. Auth capture lives in `/auth-capture.js` (not inline).
 * - `'unsafe-inline'` styles: MUI / Emotion runtime style tags + Google Fonts CSS.
 * - `connect-src` also allows FX: `open.er-api.com`, `cdn.jsdelivr.net`, `api.frankfurter.dev` (`currencies.js`).
 * - `Cross-Origin-Opener-Policy: same-origin-allow-popups` so Venmo `window.open` still works.
 * - `media-src` allows chat voice notes (`<audio>` from Supabase signed URLs + blob/WAV) and QR camera preview.
 * - img/media/connect also allow `https://*.storage.supabase.co`. supabase-js can rewrite
 *   `project.supabase.co` → `project.storage.supabase.co` (`useNewHostname`). CSP `*` is one
 *   DNS label, so `*.supabase.co` does not match that host on older WebKit.
 * - Permissions-Policy: camera + mic are `(self)` for voice notes and in-app QR scan. Geo/payment/USB/topics stay off.
 * - No COEP: would break Google Fonts and Supabase signed image URLs.
 */

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self'",
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://*.supabase.co https://*.storage.supabase.co",
  "media-src 'self' blob: mediastream: https://*.supabase.co https://*.storage.supabase.co",
  "connect-src 'self' https://*.supabase.co https://*.storage.supabase.co wss://*.supabase.co https://open.er-api.com https://cdn.jsdelivr.net https://api.frankfurter.dev",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  'upgrade-insecure-requests',
].join('; ');

export const PERMISSIONS_POLICY =
  'camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), browsing-topics=()';

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
