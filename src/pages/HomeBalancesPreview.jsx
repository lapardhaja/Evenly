import { useNavigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import HomeBalancesCard from '../components/HomeBalancesCard.jsx';
import { EVENLY_DATA_LEGACY_KEY } from '../lib/evenlyStorageKey.js';

function itemReceipt({ id, title, cost, paidById, eaters }) {
  const itemId = `${id}-i`;
  const personToItemQuantityMap = {};
  const itemToPersonQuantityMap = { [itemId]: {} };
  for (const pid of eaters) {
    personToItemQuantityMap[pid] = { [itemId]: 1 };
    itemToPersonQuantityMap[itemId][pid] = 1;
  }
  return {
    title,
    date: Date.now(),
    locked: false,
    paidById,
    currencyCode: 'USD',
    items: { [itemId]: { name: title, cost, quantity: 1 } },
    personToItemQuantityMap,
    itemToPersonQuantityMap,
    personPaidMap: {},
    taxCost: 0,
    tipCost: 0,
    discountCost: 0,
    taxBehavior: 'exclusive',
  };
}

function demoGroupsBlob() {
  return {
    groups: {
      trip: {
        name: 'NYC trip',
        date: Date.now(),
        displayCurrency: 'USD',
        settledTransfers: [],
        people: {
          me: { name: 'Me' },
          sam: { name: 'Sam', linkedUserId: 'u-sam' },
        },
        receipts: {
          dinner: itemReceipt({
            id: 'dinner',
            title: 'Dinner',
            cost: 20,
            paidById: 'me',
            eaters: ['me', 'sam'],
          }),
        },
      },
      home: {
        name: 'Roommates',
        date: Date.now() - 86400000,
        displayCurrency: 'USD',
        settledTransfers: [],
        people: {
          me: { name: 'Me' },
          sam: { name: 'Sam', linkedUserId: 'u-sam' },
        },
        receipts: {
          uber: itemReceipt({
            id: 'uber',
            title: 'Uber',
            cost: 14,
            paidById: 'sam',
            eaters: ['me', 'sam'],
          }),
        },
      },
    },
  };
}

const OPEN = {
  currency: 'USD',
  visible: true,
  owedToMe: 3,
  iOwe: 18,
  rows: [
    {
      key: 'u:sam',
      name: 'Sam',
      amount: 3,
      groups: [
        { groupId: 'trip', groupName: 'NYC trip', amount: 10 },
        { groupId: 'home', groupName: 'Roommates', amount: -7 },
      ],
    },
    {
      key: 'g:brunch:alex',
      name: 'Alex',
      amount: -18,
      groups: [{ groupId: 'brunch', groupName: 'Brunch', amount: -18 }],
    },
  ],
  groupNets: {},
};

const EVEN = {
  currency: 'USD',
  visible: true,
  owedToMe: 0,
  iOwe: 0,
  rows: [],
  groupNets: {},
};

export default function HomeBalancesPreview() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
        Home balances preview
      </Typography>
      <HomeBalancesCard summary={OPEN} onOpenGroup={() => {}} />
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Even state
      </Typography>
      <HomeBalancesCard summary={EVEN} onOpenGroup={() => {}} />
      <Stack sx={{ mt: 2 }}>
        <Button
          variant="outlined"
          onClick={() => {
            localStorage.setItem(EVENLY_DATA_LEGACY_KEY, JSON.stringify(demoGroupsBlob()));
            window.location.hash = '#/';
            window.location.reload();
          }}
        >
          Seed demo groups and open home
        </Button>
        <Button sx={{ mt: 1 }} onClick={() => navigate('/')}>
          Home without seeding
        </Button>
      </Stack>
    </Container>
  );
}
