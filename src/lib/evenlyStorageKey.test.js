import { describe, it } from 'node:test';
import assert from 'node:assert';
import { EVENLY_DATA_LEGACY_KEY } from './evenlyStorageKey.js';

describe('evenlyStorageKey', () => {
  it('exports legacy key constant', () => {
    assert.strictEqual(typeof EVENLY_DATA_LEGACY_KEY, 'string');
  });
});
