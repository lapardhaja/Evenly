import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { nameToInitials } from './utils.js';

describe('nameToInitials', () => {
  it('handles one and two word names', () => {
    assert.equal(nameToInitials('Amanda'), 'AM');
    assert.equal(nameToInitials('Sevi K'), 'SK');
  });
});
