import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shouldUseStackedItems, itemHighlightNeeded, itemAssignCaption } from './itemAssignLayout.js';

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
    assert.equal(itemHighlightNeeded({ assigned: 2, quantity: 1 }), false);
  });

  it('describes qty-1 splits as people, not 2/1 assigned', () => {
    assert.equal(itemAssignCaption({ quantity: 1, assignedShares: 0, assignedPeople: 0 }), 'Unassigned');
    assert.equal(itemAssignCaption({ quantity: 1, assignedShares: 2, assignedPeople: 2 }), '2 people');
    assert.equal(itemAssignCaption({ quantity: 1, assignedShares: 1, assignedPeople: 1 }), '1 person');
    assert.equal(itemAssignCaption({ quantity: 3, assignedShares: 2, assignedPeople: 2 }), '2/3 assigned');
  });
});
