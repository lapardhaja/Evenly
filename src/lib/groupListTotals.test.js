import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GROUP_TOTAL_FX_FAILED_COPY,
  groupListFxFailed,
  groupListTotalDisplay,
} from './groupListTotals.js';

test('groupListTotalDisplay never appends *', () => {
  const converted = groupListTotalDisplay({
    convertedTotal: 10,
    totalSpent: 5,
    displayCurrency: 'USD',
  });
  const raw = groupListTotalDisplay({
    convertedTotal: null,
    totalSpent: 5,
    displayCurrency: 'USD',
  });
  assert.equal(converted.includes('*'), false);
  assert.equal(raw.includes('*'), false);
  assert.notEqual(converted, raw);
});

test('groupListFxFailed: loading and empty are false', () => {
  assert.equal(
    groupListFxFailed({ fxReady: false, groups: [{ id: 'g' }], convertedTotals: {} }),
    false,
  );
  assert.equal(groupListFxFailed({ fxReady: true, groups: [], convertedTotals: {} }), false);
});

test('groupListFxFailed: any null total is failed', () => {
  const groups = [{ id: 'a' }, { id: 'b' }];
  assert.equal(
    groupListFxFailed({ fxReady: true, groups, convertedTotals: { a: 1, b: 2 } }),
    false,
  );
  assert.equal(
    groupListFxFailed({ fxReady: true, groups, convertedTotals: { a: null, b: null } }),
    true,
  );
  assert.equal(
    groupListFxFailed({ fxReady: true, groups, convertedTotals: { a: 1, b: null } }),
    true,
  );
  assert.match(GROUP_TOTAL_FX_FAILED_COPY, /mix currencies/);
});
