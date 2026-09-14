import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findMePersonId,
  pickHomeCurrency,
  buildHomeBalanceSummary,
  counterpartyKey,
  groupNetDirection,
} from './homeBalances.js';

function itemReceipt({ id, cost, paidById, eaters }) {
  const itemId = `${id}-i`;
  const personToItemQuantityMap = {};
  const itemToPersonQuantityMap = { [itemId]: {} };
  for (const pid of eaters) {
    personToItemQuantityMap[pid] = { [itemId]: 1 };
    itemToPersonQuantityMap[itemId][pid] = 1;
  }
  return {
    id,
    paidById,
    taxBehavior: 'exclusive',
    taxCost: 0,
    tipCost: 0,
    discountCost: 0,
    items: { [itemId]: { name: id, cost, quantity: 1 } },
    personToItemQuantityMap,
    itemToPersonQuantityMap,
  };
}

test('findMePersonId prefers linkedUserId', () => {
  const people = {
    a: { name: 'Me', linkedUserId: 'u1' },
    b: { name: 'Sam' },
  };
  assert.equal(findMePersonId(people, 'u1'), 'a');
  assert.equal(findMePersonId(people, 'nope'), '');
});

test('findMePersonId falls back to a single unlinked Me', () => {
  const people = {
    a: { name: 'Me' },
    b: { name: 'Sam' },
  };
  assert.equal(findMePersonId(people, ''), 'a');
  assert.equal(findMePersonId(people, null), 'a');
});

test('findMePersonId ignores ambiguous Me labels', () => {
  const people = {
    a: { name: 'Me' },
    b: { name: 'me' },
  };
  assert.equal(findMePersonId(people, ''), '');
});

test('pickHomeCurrency: shared display currency, else USD', () => {
  assert.equal(
    pickHomeCurrency({
      g1: { displayCurrency: 'eur' },
      g2: { displayCurrency: 'EUR' },
    }),
    'EUR',
  );
  assert.equal(
    pickHomeCurrency({
      g1: { displayCurrency: 'EUR' },
      g2: { displayCurrency: 'USD' },
    }),
    'USD',
  );
  assert.equal(pickHomeCurrency({}), 'USD');
});

test('counterpartyKey uses linked user, else group-scoped guest', () => {
  assert.equal(counterpartyKey({ id: 'p', linkedUserId: ' u2 ' }, 'g1'), 'u:u2');
  assert.equal(counterpartyKey({ id: 'p', name: 'Sam' }, 'g1'), 'g:g1:p');
});

test('buildHomeBalanceSummary nets the same linked friend across groups', () => {
  const groupsMap = {
    trip: {
      name: 'NYC trip',
      displayCurrency: 'USD',
      people: {
        me: { name: 'Alex', linkedUserId: 'u-me' },
        sam: { name: 'Sam', linkedUserId: 'u-sam' },
      },
      receipts: {
        dinner: itemReceipt({ id: 'dinner', cost: 20, paidById: 'me', eaters: ['me', 'sam'] }),
      },
    },
    home: {
      name: 'Roommates',
      displayCurrency: 'USD',
      people: {
        me2: { name: 'Alex', linkedUserId: 'u-me' },
        sam2: { name: 'Samantha', linkedUserId: 'u-sam' },
      },
      receipts: {
        uber: itemReceipt({ id: 'uber', cost: 14, paidById: 'sam2', eaters: ['me2', 'sam2'] }),
      },
    },
  };
  const summary = buildHomeBalanceSummary({ groupsMap, userId: 'u-me', currency: 'USD' });
  assert.equal(summary.visible, true);
  assert.equal(summary.rows.length, 1);
  assert.equal(summary.rows[0].key, 'u:u-sam');
  assert.equal(Math.round(summary.rows[0].amount * 100), 300);
  assert.equal(Math.round(summary.owedToMe * 100), 300);
  assert.equal(Math.round(summary.iOwe * 100), 0);
  assert.equal(Math.round(summary.groupNets.trip * 100), 1000);
  assert.equal(Math.round(summary.groupNets.home * 100), -700);
  assert.equal(summary.rows[0].groups.length, 2);
});

test('buildHomeBalanceSummary does not collapse unlinked guests with the same name', () => {
  const groupsMap = {
    trip: {
      name: 'Trip',
      people: {
        me: { name: 'Me' },
        sam: { name: 'Sam' },
      },
      receipts: {
        dinner: itemReceipt({ id: 'dinner', cost: 20, paidById: 'me', eaters: ['me', 'sam'] }),
      },
    },
    home: {
      name: 'Home',
      people: {
        me: { name: 'Me' },
        sam: { name: 'Sam' },
      },
      receipts: {
        uber: itemReceipt({ id: 'uber', cost: 14, paidById: 'sam', eaters: ['me', 'sam'] }),
      },
    },
  };
  const summary = buildHomeBalanceSummary({ groupsMap, userId: '', currency: 'USD' });
  assert.equal(summary.rows.length, 2);
  const keys = summary.rows.map((r) => r.key).sort();
  assert.deepEqual(keys, ['g:home:sam', 'g:trip:sam']);
});

test('buildHomeBalanceSummary drops settled transfers', () => {
  const groupsMap = {
    trip: {
      name: 'Trip',
      settledTransfers: ['sam\tme'],
      people: {
        me: { name: 'Alex', linkedUserId: 'u-me' },
        sam: { name: 'Sam', linkedUserId: 'u-sam' },
      },
      receipts: {
        dinner: itemReceipt({ id: 'dinner', cost: 20, paidById: 'me', eaters: ['me', 'sam'] }),
      },
    },
  };
  const summary = buildHomeBalanceSummary({ groupsMap, userId: 'u-me', currency: 'USD' });
  assert.equal(summary.visible, true);
  assert.equal(summary.rows.length, 0);
  assert.equal(summary.owedToMe, 0);
  assert.equal(summary.iOwe, 0);
  assert.equal(summary.groupNets.trip || 0, 0);
});

test('buildHomeBalanceSummary reads localStorage settled keys via getter', () => {
  const groupsMap = {
    trip: {
      name: 'Trip',
      people: {
        me: { name: 'Alex', linkedUserId: 'u-me' },
        sam: { name: 'Sam', linkedUserId: 'u-sam' },
      },
      receipts: {
        dinner: itemReceipt({ id: 'dinner', cost: 20, paidById: 'me', eaters: ['me', 'sam'] }),
      },
    },
  };
  const summary = buildHomeBalanceSummary({
    groupsMap,
    userId: 'u-me',
    currency: 'USD',
    getLocalSettled: (gid) => (gid === 'trip' ? ['sam\tme'] : []),
  });
  assert.equal(summary.rows.length, 0);
});

test('buildHomeBalanceSummary skips groups where I am not a person', () => {
  const groupsMap = {
    other: {
      name: 'Not mine',
      people: { sam: { name: 'Sam', linkedUserId: 'u-sam' } },
      receipts: {
        dinner: itemReceipt({ id: 'dinner', cost: 20, paidById: 'sam', eaters: ['sam'] }),
      },
    },
  };
  const summary = buildHomeBalanceSummary({ groupsMap, userId: 'u-me', currency: 'USD' });
  assert.equal(summary.visible, false);
  assert.equal(summary.rows.length, 0);
});

test('groupNetDirection classifies open nets', () => {
  assert.equal(groupNetDirection(10), 'owed');
  assert.equal(groupNetDirection(-7), 'owe');
  assert.equal(groupNetDirection(0), '');
  assert.equal(groupNetDirection(0.001), '');
});

test('buildHomeBalanceSummary is hidden when groups have no receipts', () => {
  const groupsMap = {
    empty: {
      name: 'Empty',
      people: { me: { name: 'Alex', linkedUserId: 'u-me' } },
      receipts: {},
    },
  };
  const summary = buildHomeBalanceSummary({ groupsMap, userId: 'u-me', currency: 'USD' });
  assert.equal(summary.visible, false);
});
