import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidVenmoUsername,
  normalizeVenmoUsername,
  formatVenmoAmount,
  venmoWebPayUrl,
  venmoAppPayUrl,
  isLikelyMobileUa,
  openVenmoPayment,
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

test('venmo URLs encode amount and note', () => {
  const web = venmoWebPayUrl({
    username: 'sam_pay',
    amount: 24,
    note: 'Evenly · Trip',
  });
  assert.ok(web.startsWith('https://venmo.com/sam_pay?'));
  assert.ok(web.includes('txn=pay'));
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
});

test('isLikelyMobileUa', () => {
  assert.equal(isLikelyMobileUa('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)'), true);
  assert.equal(isLikelyMobileUa('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), false);
});

test('openVenmoPayment uses web on desktop', () => {
  const opened = [];
  const url = openVenmoPayment(
    { username: 'sam_pay', amount: 10, note: 'x' },
    {
      navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' },
      open: (u) => opened.push(u),
      location: { href: '' },
    },
  );
  assert.ok(url.startsWith('https://venmo.com/'));
  assert.equal(opened.length, 1);
  assert.equal(opened[0], url);
});

test('openVenmoPayment uses app scheme on iPhone', () => {
  const loc = { href: '' };
  const url = openVenmoPayment(
    { username: 'sam_pay', amount: 10 },
    { navigator: { userAgent: 'Mozilla/5.0 (iPhone)' }, location: loc, open: () => {} },
  );
  assert.ok(url.startsWith('venmo://'));
  assert.equal(loc.href, url);
});
