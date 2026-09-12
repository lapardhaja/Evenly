import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CONTENT_SECURITY_POLICY,
  PERMISSIONS_POLICY,
  VERCEL_SECURITY_HEADERS,
} from './securityHeaders.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

test('CSP allows self, fonts, supabase, inline (index.html + MUI), and Venmo-safe COOP', () => {
  assert.match(CONTENT_SECURITY_POLICY, /default-src 'self'/);
  assert.match(CONTENT_SECURITY_POLICY, /frame-ancestors 'none'/);
  assert.match(CONTENT_SECURITY_POLICY, /script-src 'self' 'unsafe-inline'/);
  assert.match(CONTENT_SECURITY_POLICY, /style-src 'self' 'unsafe-inline' https:\/\/fonts\.googleapis\.com/);
  assert.match(CONTENT_SECURITY_POLICY, /connect-src 'self' https:\/\/\*\.supabase\.co wss:\/\/\*\.supabase\.co/);
  assert.match(CONTENT_SECURITY_POLICY, /img-src 'self' data: blob: https:\/\/\*\.supabase\.co/);
  assert.equal(CONTENT_SECURITY_POLICY.includes('unsafe-eval'), false);
  assert.equal(
    VERCEL_SECURITY_HEADERS.find((h) => h.key === 'Cross-Origin-Opener-Policy')?.value,
    'same-origin-allow-popups',
  );
  assert.equal(
    VERCEL_SECURITY_HEADERS.some((h) => h.key === 'Cross-Origin-Embedder-Policy'),
    false,
  );
  assert.match(PERMISSIONS_POLICY, /camera=\(\)/);
  assert.match(PERMISSIONS_POLICY, /browsing-topics=\(\)/);
});

test('vercel.json headers match securityHeaders.js (no drift)', () => {
  const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
  const block = (vercel.headers || []).find((h) => h.source === '/(.*)');
  assert.ok(block, 'expected headers for /(.*)');
  const got = Object.fromEntries(block.headers.map((h) => [h.key, h.value]));
  const expected = Object.fromEntries(VERCEL_SECURITY_HEADERS.map((h) => [h.key, h.value]));
  assert.deepEqual(got, expected);
});

test('index.html sets referrer policy for non-Vercel static hosts', () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  assert.match(html, /name="referrer"[^>]*content="strict-origin-when-cross-origin"/);
});
