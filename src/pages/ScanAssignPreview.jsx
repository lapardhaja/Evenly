import { useState } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import ScanReceiptDialog from './ScanReceiptDialog.jsx';

const PEOPLE = [
  { id: 'p1', name: 'Alex', linkedUserId: 'u1' },
  { id: 'p2', name: 'Sam' },
];

const LAST = {
  items: { old: { name: 'Pad Thai', quantity: 1, cost: 14 } },
  itemToPersonQuantityMap: { old: { p1: 1, p2: 1 } },
  people: PEOPLE,
  paidById: 'p1',
};

const ITEMS = [
  { name: 'Pad Thai', cost: 14, quantity: 1 },
  { name: 'Beer', cost: 12, quantity: 2 },
];

export default function ScanAssignPreview() {
  const [open, setOpen] = useState(true);
  const [result, setResult] = useState(null);

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
        Scan assign preview
      </Typography>
      <Button
        variant="contained"
        onClick={() => {
          setResult(null);
          setOpen(true);
        }}
      >
        Open review
      </Button>
      {result ? (
        <Box component="pre" sx={{ mt: 2, fontSize: 12, whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(result, null, 2)}
        </Box>
      ) : null}
      <ScanReceiptDialog
        open={open}
        onClose={() => setOpen(false)}
        items={ITEMS}
        people={PEOPLE}
        mePersonId="p1"
        lastReceipt={LAST}
        keepPhotoAvailable={false}
        scannedGrandTotal={26}
        defaultTitle="Thai Place"
        onConfirm={(title, items, charges) => {
          setResult({ title, paidById: charges.paidById, sharesByIndex: charges.sharesByIndex });
        }}
      />
    </Container>
  );
}
