import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canSwipeDeleteStayOpen,
  shouldCloseSwipeOnContentClick,
} from './swipeDelete.js';

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

test('a 25% max swipe is too small to hold delete open on common mobile row widths', () => {
  assert.equal(
    canSwipeDeleteStayOpen({
      rowWidthPx: 300,
      actionWidthPx: 88,
      maxSwipeRatio: 0.25,
    }),
    false,
  );
  assert.equal(
    canSwipeDeleteStayOpen({
      rowWidthPx: 340,
      actionWidthPx: 88,
      maxSwipeRatio: 0.25,
    }),
    false,
  );
});

test('the shared mobile swipe cap leaves enough room to keep delete open', () => {
  assert.equal(
    canSwipeDeleteStayOpen({
      rowWidthPx: 320,
      actionWidthPx: 88,
      maxSwipeRatio: 0.4,
    }),
    true,
  );
});
