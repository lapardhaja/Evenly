import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseReceiptLines } from './parseReceiptLines.js';

describe('parseReceiptLines', () => {
  it('parses whole-dollar and decimal prices', () => {
    const text = `Montana Restaurant
1 NOODLES         $11.98
1 VEG MEGA BURGER  $25
TOTAL   $36.98`;
    const items = parseReceiptLines(text);
    assert.equal(items.length, 2);
    assert.equal(items[0].name, 'NOODLES');
    assert.equal(items[0].quantity, 1);
    assert.equal(items[0].cost, 11.98);
    assert.equal(items[1].name, 'VEG MEGA BURGER');
    assert.equal(items[1].cost, 25);
    assert.equal(items[1].quantity, 1);
  });
});
