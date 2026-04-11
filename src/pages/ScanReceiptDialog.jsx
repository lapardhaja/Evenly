import { useState, useEffect, useMemo } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import currency from 'currency.js';
import { receiptGrandTotal } from '../functions/receiptTotals.js';
import CurrencyAutocomplete from '../components/CurrencyAutocomplete.jsx';
import { formatMoneyWithCode, normalizeCurrencyCode } from '../lib/currencies.js';

export default function ScanReceiptDialog({
  open,
  onClose,
  items,
  taxCost = 0,
  tipCost = 0,
  discountCost = 0,
  defaultTitle = '',
  defaultReceiptDateISO = '',
  defaultCurrencyCode = 'USD',
  scannedGrandTotal = 0,
  onConfirm,
  error: externalError,
}) {
  const [title, setTitle] = useState('Scanned receipt');
  const [receiptDateISO, setReceiptDateISO] = useState('');
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [previewOpen, setPreviewOpen] = useState(false);

  const itemsSubtotal = useMemo(
    () => items.reduce((s, row) => s + (Number(row.cost) || 0), 0),
    [items],
  );

  const totalMismatch = useMemo(() => {
    if (items.length === 0 || scannedGrandTotal <= 0) return null;
    const expected = receiptGrandTotal(itemsSubtotal, discountCost, taxCost, tipCost);
    const diff = Math.abs(currency(scannedGrandTotal).subtract(expected).value);
    if (diff <= 0.02) return null;
    return { expected, scanned: scannedGrandTotal };
  }, [items.length, itemsSubtotal, taxCost, tipCost, discountCost, scannedGrandTotal]);

  useEffect(() => {
    if (open) {
      const t = defaultTitle?.trim();
      setTitle(t || 'Scanned receipt');
      const d = defaultReceiptDateISO?.trim();
      setReceiptDateISO(/^\d{4}-\d{2}-\d{2}$/.test(d || '') ? d : '');
      setCurrencyCode(normalizeCurrencyCode(defaultCurrencyCode));
      setPreviewOpen(false);
    }
  }, [open, defaultTitle, defaultReceiptDateISO, defaultCurrencyCode]);

  const handleConfirm = () => {
    const t = title.trim() || 'Scanned receipt';
    onConfirm(t, items, {
      taxCost,
      tipCost,
      discountCost,
      receiptDate: receiptDateISO.trim() || undefined,
      currencyCode,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle>Review receipt</DialogTitle>
      <DialogContent sx={{ pt: 2, pb: 2 }}>
        <Stack spacing={2.5}>
        {externalError && (
          <Alert severity="error">
            {externalError}
          </Alert>
        )}
        <Box>
          <Typography
            component="label"
            variant="subtitle2"
            htmlFor="scan-receipt-name"
            sx={{ display: 'block', mb: 1, fontWeight: 600 }}
          >
            Receipt name
          </Typography>
          <TextField
            id="scan-receipt-name"
            hiddenLabel
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            variant="outlined"
            placeholder="Name this receipt"
            aria-label="Receipt name"
          />
        </Box>
        <Box>
          <Typography
            component="label"
            variant="subtitle2"
            htmlFor="scan-receipt-date"
            sx={{ display: 'block', mb: 1, fontWeight: 600 }}
          >
            Receipt date
          </Typography>
          <TextField
            id="scan-receipt-date"
            hiddenLabel
            type="date"
            fullWidth
            value={receiptDateISO}
            onChange={(e) => setReceiptDateISO(e.target.value)}
            variant="outlined"
            aria-label="Receipt date"
            helperText={
              receiptDateISO ? 'You can change this if needed' : 'Optional — if it’s on the receipt'
            }
          />
        </Box>
        <Box>
          <CurrencyAutocomplete
            id="scan-receipt-currency"
            label="Currency"
            value={currencyCode}
            onChange={setCurrencyCode}
            variant="outlined"
            size="small"
            fullWidth
          />
        </Box>
        {scannedGrandTotal > 0 && (
          <Typography variant="body2" color="text.secondary">
            Total on receipt: <strong>{formatMoneyWithCode(scannedGrandTotal, currencyCode)}</strong>
            {items.length > 0 && (
              <>
                {' '}
                · Line items subtotal: <strong>{formatMoneyWithCode(itemsSubtotal, currencyCode)}</strong>
              </>
            )}
          </Typography>
        )}
        {totalMismatch && (
          <Alert severity="info">
            The total from your items ({formatMoneyWithCode(totalMismatch.expected, currencyCode)}) doesn’t match the total on the
            receipt ({formatMoneyWithCode(totalMismatch.scanned, currencyCode)}). Double-check the numbers after you save.
          </Alert>
        )}
        {(taxCost > 0 || tipCost > 0 || discountCost > 0) && (
          <Typography variant="body2" color="text.secondary">
            {taxCost > 0 && <>Tax: <strong>{formatMoneyWithCode(taxCost, currencyCode)}</strong></>}
            {taxCost > 0 && (tipCost > 0 || discountCost > 0) && ' · '}
            {tipCost > 0 && (
              <>
                Tip / gratuity / service: <strong>{formatMoneyWithCode(tipCost, currencyCode)}</strong>
              </>
            )}
            {tipCost > 0 && discountCost > 0 && ' · '}
            {discountCost > 0 && (
              <>
                Discount: <strong>−{formatMoneyWithCode(discountCost, currencyCode)}</strong>
              </>
            )}
          </Typography>
        )}
        {items.length === 0 && !externalError ? (
          <Alert severity="warning">
            We couldn’t read line items from this photo. You can still create the receipt and add items yourself, or
            try a clearer photo.
            {(taxCost > 0 || tipCost > 0 || discountCost > 0) &&
              ' Tax, tip, and discount will still be saved.'}
          </Alert>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Found <strong>{items.length}</strong> line item{items.length === 1 ? '' : 's'}.
          </Typography>
        )}
        {items.length > 0 && (
          <>
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={() => setPreviewOpen(!previewOpen)}
            >
              {previewOpen ? 'Hide' : 'Show'} preview
            </Link>
            <Collapse in={previewOpen}>
              <List dense disablePadding sx={{ maxHeight: 220, overflow: 'auto', bgcolor: 'action.hover', borderRadius: 1 }}>
                {items.map((row, i) => (
                  <ListItem key={i} disablePadding sx={{ py: 0.25, px: 1 }}>
                    <ListItemText
                      primary={row.name}
                      secondary={`Qty ${row.quantity} · ${formatMoneyWithCode(row.cost, currencyCode)} line total`}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </>
        )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleConfirm}>
          {items.length === 0 && taxCost <= 0 && tipCost <= 0 && discountCost <= 0
            ? 'Create empty receipt'
            : 'Create receipt'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
