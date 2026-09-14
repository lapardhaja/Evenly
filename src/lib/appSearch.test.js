import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterGroupsForSearch,
  filterGroupPeopleForSearch,
  filterReceiptsForSearch,
  normalizeSearchQuery,
} from './appSearch.js';

test('normalizeSearchQuery collapses space and case', () => {
  assert.equal(normalizeSearchQuery('  NYC   Trip '), 'nyc trip');
});

test('filterGroupsForSearch matches name and caps empty list', () => {
  const groups = [
    { id: 'a', name: 'NYC trip' },
    { id: 'b', name: 'Roommates' },
    { id: 'c', name: 'Brunch' },
  ];
  assert.deepEqual(
    filterGroupsForSearch(groups, 'nyc').map((g) => g.id),
    ['a'],
  );
  assert.equal(filterGroupsForSearch(groups, '', { emptyLimit: 2 }).length, 2);
});

test('filterReceiptsForSearch needs two characters and is newest first', () => {
  const groupsMap = {
    g1: {
      name: 'Trip',
      receipts: {
        old: { title: 'Dinner', date: 1 },
        neu: { title: 'Dinner party', date: 9 },
      },
    },
    g2: {
      name: 'Home',
      receipts: { u: { title: 'Uber', date: 5 } },
    },
  };
  assert.deepEqual(filterReceiptsForSearch(groupsMap, 'd'), []);
  const rows = filterReceiptsForSearch(groupsMap, 'din');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].title, 'Dinner party');
  assert.equal(rows[0].groupName, 'Trip');
  assert.equal(filterReceiptsForSearch(groupsMap, 'uber')[0].groupId, 'g2');
});

test('filterReceiptsForSearch matches line-item names', () => {
  const groupsMap = {
    g1: {
      name: 'NYC trip',
      receipts: {
        r1: { title: 'Corner bodega', date: 3, items: { i: { name: 'Avocado toast' } } },
      },
    },
  };
  assert.equal(filterReceiptsForSearch(groupsMap, 'avocado')[0].title, 'Corner bodega');
});

test('filterGroupPeopleForSearch matches names inside groups', () => {
  const groupsMap = {
    g1: { name: 'NYC trip', people: { p1: { name: 'Sam' }, p2: { name: 'Alex' } } },
    g2: { name: 'Roommates', people: { p3: { name: 'Samira' } } },
  };
  const rows = filterGroupPeopleForSearch(groupsMap, 'sam');
  assert.deepEqual(
    rows.map((r) => `${r.name}@${r.groupName}`),
    ['Sam@NYC trip', 'Samira@Roommates'],
  );
});
