import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldCloseSwipeOnContentClick } from './swipeDelete.js';

test('does not close a row that is not meaningfully open', () => {
  assert.equal(
    shouldCloseSwipeOnContentClick({
      translateXPx: -4,
      lastSwipeEndAtMs: 1000,
      nowMs: 1400,
    }),
    false,
  );
});

test('ignores the synthetic click that lands right after swipe release', () => {
  assert.equal(
    shouldCloseSwipeOnContentClick({
      translateXPx: -72,
      lastSwipeEndAtMs: 1000,
      nowMs: 1080,
    }),
    false,
  );
});

test('allows a later intentional tap on the open row to close it', () => {
  assert.equal(
    shouldCloseSwipeOnContentClick({
      translateXPx: -72,
      lastSwipeEndAtMs: 1000,
      nowMs: 1300,
    }),
    true,
  );
});
