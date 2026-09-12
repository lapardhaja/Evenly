import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GROUP_TOTAL_FX_DATE_COPY,
  GROUP_TOTAL_FX_FAILED_COPY,
  groupListFxBanner,
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

test('groupListFxBanner: loading and empty hide copy', () => {
  assert.deepEqual(
    groupListFxBanner({ fxReady: false, groups: [{ id: 'g' }], convertedTotals: {} }),
    { failed: false, dated: false },
  );
  assert.deepEqual(
    groupListFxBanner({ fxReady: true, groups: [], convertedTotals: {} }),
    { failed: false, dated: false },
  );
});

test('groupListFxBanner: converted vs failed vs mixed', () => {
  const groups = [{ id: 'a' }, { id: 'b' }];
  assert.deepEqual(
    groupListFxBanner({
      fxReady: true,
      groups,
      convertedTotals: { a: 1, b: 2 },
    }),
    { failed: false, dated: true },
  );
  assert.deepEqual(
    groupListFxBanner({
      fxReady: true,
      groups,
      convertedTotals: { a: null, b: null },
    }),
    { failed: true, dated: false },
  );
  assert.deepEqual(
    groupListFxBanner({
      fxReady: true,
      groups,
      convertedTotals: { a: 1, b: null },
    }),
    { failed: true, dated: true },
  );
  assert.match(GROUP_TOTAL_FX_DATE_COPY, /receipt’s date/);
  assert.match(GROUP_TOTAL_FX_FAILED_COPY, /mix currencies/);
});
