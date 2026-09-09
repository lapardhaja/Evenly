import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidVenmoUsername,
  normalizeVenmoUsername,
  formatVenmoAmount,
  venmoWebPayUrl,
  venmoAppPayUrl,
  venmoProfileUrl,
  isLikelyMobileUa,
  openVenmoPayment,
  openVenmoProfile,
  VENMO_APP_FALLBACK_MS,
} from './venmoLinks.js';

test('normalizeVenmoUsername strips @ and whitespace', () => {
  assert.equal(normalizeVenmoUsername(' @Sam_Pay '), 'Sam_Pay');
});

test('isValidVenmoUsername allows 3–30 alnum _ -', () => {
  assert.equal(isValidVenmoUsername('sam'), true);
  assert.equal(isValidVenmoUsername('sam-pay_1'), true);
  assert.equal(isValidVenmoUsername('ab'), false);
  assert.equal(isValidVenmoUsername('sam pay'), false);
  assert.equal(isValidVenmoUsername(''), false);
});

test('formatVenmoAmount is two decimal USD', () => {
  assert.equal(formatVenmoAmount(12.3), '12.30');
  assert.equal(formatVenmoAmount(0), '');
  assert.equal(formatVenmoAmount(-1), '');
});

test('venmo profile URL is the public https handle page', () => {
  assert.equal(venmoProfileUrl('@Sam_Pay'), 'https://venmo.com/Sam_Pay');
  assert.equal(venmoProfileUrl('x'), '');
});

test('venmo URLs encode amount, note, and recipients (HTTPS so iOS can open the app)', () => {
  const web = venmoWebPayUrl({
    username: 'sam_pay',
    amount: 24,
    note: 'Evenly · Trip',
  });
  assert.ok(web.startsWith('https://venmo.com/sam_pay?'));
  assert.ok(web.includes('txn=pay'));
  assert.ok(web.includes('recipients=sam_pay'));
  assert.ok(web.includes('amount=24.00'));
  assert.ok(web.includes('note='));

  const app = venmoAppPayUrl({ username: 'sam_pay', amount: 24, note: 'Hi' });
  assert.ok(app.startsWith('venmo://paycharge?'));
  assert.ok(app.includes('recipients=sam_pay'));
  assert.ok(app.includes('amount=24.00'));
});

test('invalid handle yields empty URLs', () => {
  assert.equal(venmoWebPayUrl({ username: 'x' }), '');
  assert.equal(venmoAppPayUrl({ username: '' }), '');
  assert.equal(venmoProfileUrl(''), '');
});

test('isLikelyMobileUa', () => {
  assert.equal(isLikelyMobileUa('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)'), true);
  assert.equal(isLikelyMobileUa('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), false);
});

test('openVenmoPayment uses https on desktop (Venmo intercepts this on phones too)', () => {
  const opened = [];
  const url = openVenmoPayment(
    { username: 'sam_pay', amount: 10, note: 'x' },
    {
      navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' },
      open: (u) => {
        opened.push(u);
        return { closed: false };
      },
      location: { href: '' },
    },
  );
  assert.ok(url.startsWith('https://venmo.com/sam_pay?'));
  assert.equal(opened.length, 1);
  assert.equal(opened[0], url);
});

test('openVenmoPayment tries venmo:// on iPhone then falls back to https if still visible', () => {
  const loc = { href: '' };
  const opened = [];
  const timers = [];
  const url = openVenmoPayment(
    { username: 'sam_pay', amount: 10 },
    {
      navigator: { userAgent: 'Mozilla/5.0 (iPhone)' },
      location: loc,
      document: { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} },
      addEventListener() {},
      removeEventListener() {},
      setTimeout: (fn, ms) => {
        timers.push({ fn, ms });
        return 1;
      },
      open: (u) => {
        opened.push(u);
        return { closed: false };
      },
    },
  );
  assert.ok(url.startsWith('venmo://'));
  assert.equal(loc.href, url);
  assert.equal(timers.length, 1);
  assert.equal(timers[0].ms, VENMO_APP_FALLBACK_MS);
  timers[0].fn();
  assert.equal(opened.length, 1);
  assert.ok(opened[0].startsWith('https://venmo.com/sam_pay?'));
});

test('openVenmoPayment does not https-fallback if the app hid the page', () => {
  const loc = { href: '' };
  const opened = [];
  let visHandler;
  const url = openVenmoPayment(
    { username: 'sam_pay', amount: 10 },
    {
      navigator: { userAgent: 'Mozilla/5.0 (iPhone)' },
      location: loc,
      document: {
        visibilityState: 'hidden',
        addEventListener(type, fn) {
          if (type === 'visibilitychange') visHandler = fn;
        },
        removeEventListener() {},
      },
      addEventListener() {},
      removeEventListener() {},
      setTimeout: (fn) => {
        visHandler?.();
        fn();
        return 1;
      },
      open: (u) => {
        opened.push(u);
        return { closed: false };
      },
    },
  );
  assert.ok(url.startsWith('venmo://'));
  assert.equal(opened.length, 0);
});

test('openVenmoProfile opens the public profile page', () => {
  const opened = [];
  const url = openVenmoProfile('sam_pay', {
    open: (u) => {
      opened.push(u);
      return { closed: false };
    },
    location: { href: '' },
  });
  assert.equal(url, 'https://venmo.com/sam_pay');
  assert.equal(opened[0], url);
});
