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
import currency from 'currency.js';

export default function ScanReceiptDialog({
  open,
  onClose,
  items,
  taxCost = 0,
  tipCost = 0,
  defaultTitle = '',
  defaultReceiptDateISO = '',
  scannedGrandTotal = 0,
  onConfirm,
  error: externalError,
}) {
  const [title, setTitle] = useState('Scanned receipt');
  const [receiptDateISO, setReceiptDateISO] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  const itemsSubtotal = useMemo(
    () => items.reduce((s, row) => s + (Number(row.cost) || 0), 0),
    [items],
  );

  const totalMismatch = useMemo(() => {
    if (items.length === 0 || scannedGrandTotal <= 0) return null;
    const expected = currency(itemsSubtotal).add(taxCost).add(tipCost).value;
    const diff = Math.abs(currency(scannedGrandTotal).subtract(expected).value);
    if (diff <= 0.02) return null;
    return { expected, scanned: scannedGrandTotal };
  }, [items.length, itemsSubtotal, taxCost, tipCost, scannedGrandTotal]);

  useEffect(() => {
    if (open) {
      const t = defaultTitle?.trim();
      setTitle(t || 'Scanned receipt');
      const d = defaultReceiptDateISO?.trim();
      setReceiptDateISO(/^\d{4}-\d{2}-\d{2}$/.test(d || '') ? d : '');
      setPreviewOpen(false);
    }
  }, [open, defaultTitle, defaultReceiptDateISO]);

  const handleConfirm = () => {
    const t = title.trim() || 'Scanned receipt';
    onConfirm(t, items, {
      taxCost,
      tipCost,
      receiptDate: receiptDateISO.trim() || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Receipt scan</DialogTitle>
      <DialogContent>
        {externalError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {externalError}
          </Alert>
        )}
        <TextField
          autoFocus
          label="Receipt name"
          fullWidth
          size="small"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Receipt date"
          type="date"
          fullWidth
          size="small"
          value={receiptDateISO}
          onChange={(e) => setReceiptDateISO(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ mb: 2 }}
          helperText={
            receiptDateISO
              ? 'From photo when detected — you can edit'
              : 'Optional — add if shown on the receipt'
          }
        />
        {scannedGrandTotal > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Total on receipt: <strong>{currency(scannedGrandTotal).format()}</strong>
            {items.length > 0 && (
              <>
                {' '}
                · Line items subtotal: <strong>{currency(itemsSubtotal).format()}</strong>
              </>
            )}
          </Typography>
        )}
        {totalMismatch && (
          <Alert severity="info" sx={{ mb: 1 }}>
            Items + tax + tip ({currency(totalMismatch.expected).format()}) don’t match receipt
            total ({currency(totalMismatch.scanned).format()}). Check line items or tax/tip after
            saving.
          </Alert>
        )}
        {(taxCost > 0 || tipCost > 0) && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {taxCost > 0 && <>Tax: <strong>{currency(taxCost).format()}</strong></>}
            {taxCost > 0 && tipCost > 0 && ' · '}
            {tipCost > 0 && (
              <>
                Tip / gratuity / service: <strong>{currency(tipCost).format()}</strong>
              </>
            )}
          </Typography>
        )}
        {items.length === 0 && !externalError ? (
          <Alert severity="warning" sx={{ mb: 1 }}>
            No line items were detected. You can still create an empty receipt and add
            items manually, or try another photo with better lighting.
            {(taxCost > 0 || tipCost > 0) &&
              ' Tax and tip above will still be saved on the receipt.'}
          </Alert>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
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
              sx={{ mb: 1 }}
            >
              {previewOpen ? 'Hide' : 'Show'} preview
            </Link>
            <Collapse in={previewOpen}>
              <List dense disablePadding sx={{ maxHeight: 220, overflow: 'auto', bgcolor: 'action.hover', borderRadius: 1 }}>
                {items.map((row, i) => (
                  <ListItem key={i} disablePadding sx={{ py: 0.25, px: 1 }}>
                    <ListItemText
                      primary={row.name}
                      secondary={`Qty ${row.quantity} · ${currency(row.cost).format()} line total`}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleConfirm}>
          {items.length === 0 && taxCost <= 0 && tipCost <= 0
            ? 'Create empty receipt'
            : 'Create receipt'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
