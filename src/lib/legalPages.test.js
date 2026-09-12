import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COOKIE_NOTICE_KEY } from './cookieNotice.js';
import { LEGAL_NAV } from '../pages/legal/legalNav.js';
import { LEGAL_VERSION, SITE_ORIGIN } from '../pages/legal/operatorInfo.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const legal = join(root, 'src/pages/legal');

function read(name) {
  return readFileSync(join(legal, name), 'utf8');
}

test('legal nav includes security and cookie notice key stays v1', () => {
  assert.equal(COOKIE_NOTICE_KEY, 'evenly:cookie-notice:v1');
  assert.deepEqual(
    LEGAL_NAV.map((i) => i.to),
    ['/privacy', '/terms', '/cookies', '/copyright', '/security'],
  );
  assert.equal(LEGAL_VERSION, '2026.09.12');
  assert.equal(SITE_ORIGIN, 'https://evenly.lapardhaja.com');
});

test('privacy covers chat photos, likes, push, and do-not-sell', () => {
  const src = read('PrivacyPolicyPage.jsx');
  assert.match(src, /photos/i);
  assert.match(src, /likes/i);
  assert.match(src, /Web Push/i);
  assert.match(src, /does not sell personal information/i);
  assert.match(src, /under 13/i);
});

test('terms use NY courts and do not force arbitration', () => {
  const src = read('TermsOfServicePage.jsx');
  assert.match(src, /OPERATOR_PLACE/);
  assert.match(src, /OPERATOR_LAW/);
  assert.match(src, /do not require arbitration/i);
  assert.equal(/binding arbitration/i.test(src), false);
});

test('cookie policy renders the inventory table', () => {
  const src = read('CookiePolicyPage.jsx');
  assert.match(src, /COOKIE_INVENTORY/);
  assert.match(src, /strictly necessary/i);
});

test('copyright page asks for DMCA-style elements', () => {
  const src = read('CopyrightPage.jsx');
  assert.match(src, /512\(c\)\(3\)/);
  assert.match(src, /under penalty of perjury/i);
});

test('security.txt and robots.txt are published', () => {
  const txt = readFileSync(join(root, 'public/.well-known/security.txt'), 'utf8');
  assert.match(txt, /Contact: mailto:servetlap29@gmail.com/);
  assert.match(txt, /Expires: 2027-09-12/);
  assert.match(txt, /Canonical: https:\/\/evenly\.lapardhaja\.com\/\.well-known\/security\.txt/);
  const robots = readFileSync(join(root, 'public/robots.txt'), 'utf8');
  assert.match(robots, /Disallow: \/api\//);
});

test('scan API does not return key names or raw exception messages', () => {
  const src = readFileSync(join(root, 'api/scan.js'), 'utf8');
  assert.equal(src.includes('GEMINI_API_KEY is not set'), false);
  assert.equal(src.includes('err.message'), false);
  assert.match(src, /SCAN_UNAVAILABLE/);
  assert.match(src, /SCAN_FAILED/);
  assert.match(src, /scanLimiter/);
});

test('router registers #/security as a public page', () => {
  const src = readFileSync(join(root, 'src/router.jsx'), 'utf8');
  assert.match(src, /path: 'security'/);
  assert.match(src, /SecurityPage/);
});
