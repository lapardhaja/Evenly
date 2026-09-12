/** Headers on JSON API responses (scan / chat-push). Complements site-wide `vercel.json` headers. */
export function applyApiSecurityHeaders(res) {
  if (!res || typeof res.setHeader !== 'function') return;
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}
