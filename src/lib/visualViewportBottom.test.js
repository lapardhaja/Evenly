import test from 'node:test';
import assert from 'node:assert/strict';
import { visualViewportBottomGap } from './visualViewportBottom.js';

test('visualViewportBottomGap is 0 when the visual viewport fills the window', () => {
  assert.equal(visualViewportBottomGap({ innerHeight: 800, height: 800, offsetTop: 0 }), 0);
});

test('visualViewportBottomGap is the Safari toolbar band when the visual viewport is shorter', () => {
  assert.equal(visualViewportBottomGap({ innerHeight: 844, height: 760, offsetTop: 0 }), 84);
});

test('visualViewportBottomGap never goes negative', () => {
  assert.equal(visualViewportBottomGap({ innerHeight: 700, height: 800, offsetTop: 0 }), 0);
});
