import { useState, useEffect } from 'react';
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
  onConfirm,
  error: externalError,
}) {
  const [title, setTitle] = useState('Scanned receipt');
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (open) {
      const t = defaultTitle?.trim();
      setTitle(t || 'Scanned receipt');
      setPreviewOpen(false);
    }
  }, [open, defaultTitle]);

  const handleConfirm = () => {
    const t = title.trim() || 'Scanned receipt';
    onConfirm(t, items, { taxCost, tipCost });
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
