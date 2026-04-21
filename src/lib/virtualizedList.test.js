import test from 'node:test';
import assert from 'node:assert/strict';
import { getVirtualRowTranslateY } from './virtualizedList.js';

test('getVirtualRowTranslateY removes scroll margin offset', () => {
  assert.equal(getVirtualRowTranslateY(137, 137), 0);
  assert.equal(getVirtualRowTranslateY(225, 113), 112);
});

test('getVirtualRowTranslateY never returns a negative translate value', () => {
  assert.equal(getVirtualRowTranslateY(50, 100), 0);
  assert.equal(getVirtualRowTranslateY(0, 0), 0);
});
