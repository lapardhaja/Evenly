import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sanitizeDecimalString, sanitizeIntegerString } from './numericInput.js';

describe('numericInput', () => {
  it('sanitizeDecimalString allows one dot', () => {
    assert.strictEqual(sanitizeDecimalString('12.34.5'), '12.345');
    assert.strictEqual(sanitizeDecimalString('a1b2c'), '12');
    assert.strictEqual(sanitizeDecimalString('.5'), '.5');
  });
  it('sanitizeIntegerString strips non-digits', () => {
    assert.strictEqual(sanitizeIntegerString('3a2b1'), '321');
  });
});
