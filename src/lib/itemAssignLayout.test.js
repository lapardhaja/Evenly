import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shouldUseStackedItems, itemHighlightNeeded } from './itemAssignLayout.js';

describe('itemAssignLayout', () => {
  it('uses stacked cards below the md breakpoint', () => {
    assert.equal(shouldUseStackedItems(true), true);
    assert.equal(shouldUseStackedItems(false), false);
  });

  it('highlights an item until every quantity share is assigned', () => {
    assert.equal(itemHighlightNeeded({ assigned: 0, quantity: 1 }), true);
    assert.equal(itemHighlightNeeded({ assigned: 1, quantity: 1 }), false);
    assert.equal(itemHighlightNeeded({ assigned: 1, quantity: 3 }), true);
    assert.equal(itemHighlightNeeded({ assigned: 3, quantity: 3 }), false);
  });
});
