import { useState, useEffect, useMemo } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import currency from 'currency.js';
import { receiptGrandTotal, isTaxInclusive } from '../functions/receiptTotals.js';
import CurrencyAutocomplete from '../components/CurrencyAutocomplete.jsx';
import { formatMoneyWithCode, normalizeCurrencyCode } from '../lib/currencies.js';
import {
  applyLastReceipt,
  everyoneShares,
  justMeShares,
  toggleShare,
} from '../lib/scanAssign.js';
import ItemPersonAssign from './components/ItemPersonAssign.jsx';

function itemQty(row) {
  return Math.max(1, Math.floor(Number(row?.quantity) || 1));
}

function rowHasShares(shares, index) {
  return Object.values(shares[index] || {}).some((q) => Number(q) >= 1);
}

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
  defaultTaxBehavior = 'exclusive',
  scannedGrandTotal = 0,
  onConfirm,
  error: externalError,
  keepPhotoAvailable = true,
  people = [],
  mePersonId = '',
  lastReceipt = null,
}) {
  const [title, setTitle] = useState('Scanned receipt');
  const [receiptDateISO, setReceiptDateISO] = useState('');
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [taxBehavior, setTaxBehavior] = useState('exclusive');
  const [keepAttachment, setKeepAttachment] = useState(true);
  const [paidById, setPaidById] = useState('');
  const [sharesByIndex, setSharesByIndex] = useState({});

  const itemsSubtotal = useMemo(
    () => items.reduce((s, row) => s + (Number(row.cost) || 0), 0),
    [items],
  );

  const totalMismatch = useMemo(() => {
    if (items.length === 0 || scannedGrandTotal <= 0) return null;
    const expected = receiptGrandTotal(itemsSubtotal, discountCost, taxCost, tipCost, taxBehavior);
    const diff = Math.abs(currency(scannedGrandTotal).subtract(expected).value);
    if (diff <= 0.02) return null;
    return { expected, scanned: scannedGrandTotal };
  }, [items.length, itemsSubtotal, taxCost, tipCost, discountCost, scannedGrandTotal, taxBehavior]);

  const lastHasItems = Boolean(lastReceipt && Object.keys(lastReceipt.items || {}).length);
  const personIds = people.map((p) => p.id).filter(Boolean);

  const unassignedCount = useMemo(() => {
    if (!items.length) return 0;
    return items.filter((_, index) => !rowHasShares(sharesByIndex, index)).length;
  }, [items, sharesByIndex]);

  useEffect(() => {
    if (!open) return;
    const t = defaultTitle?.trim();
    setTitle(t || 'Scanned receipt');
    const d = defaultReceiptDateISO?.trim();
    setReceiptDateISO(/^\d{4}-\d{2}-\d{2}$/.test(d || '') ? d : '');
    setCurrencyCode(normalizeCurrencyCode(defaultCurrencyCode));
    setTaxBehavior(defaultTaxBehavior === 'inclusive' ? 'inclusive' : 'exclusive');
    setKeepAttachment(keepPhotoAvailable);
    setSharesByIndex({});
    const ids = new Set((people || []).map((p) => p.id));
    if (lastReceipt?.paidById && ids.has(lastReceipt.paidById)) {
      setPaidById(lastReceipt.paidById);
    } else if (mePersonId && ids.has(mePersonId)) {
      setPaidById(mePersonId);
    } else {
      setPaidById('');
    }
  }, [
    open,
    defaultTitle,
    defaultReceiptDateISO,
    defaultCurrencyCode,
    defaultTaxBehavior,
    keepPhotoAvailable,
    lastReceipt,
    mePersonId,
    people,
  ]);

  const setRowShares = (index, next) => {
    setSharesByIndex((prev) => ({ ...prev, [index]: next }));
  };

  const setPersonQty = (index, personId, qty) => {
    setSharesByIndex((prev) => {
      const row = { ...(prev[index] || {}) };
      if (qty <= 0) delete row[personId];
      else row[personId] = qty;
      return { ...prev, [index]: row };
    });
  };

  const handleSameAsLast = () => {
    if (!lastHasItems) return;
    const next = applyLastReceipt({
      lastReceipt,
      newItems: items,
      newPeople: people,
    });
    setSharesByIndex(next);
    const ids = new Set(personIds);
    if (lastReceipt?.paidById && ids.has(lastReceipt.paidById)) {
      setPaidById(lastReceipt.paidById);
    }
  };

  const handleConfirm = () => {
    const t = title.trim() || 'Scanned receipt';
    onConfirm(t, items, {
      taxCost,
      tipCost,
      discountCost,
      receiptDate: receiptDateISO.trim() || undefined,
      currencyCode,
      taxBehavior,
      keepAttachment: keepPhotoAvailable && keepAttachment,
      paidById,
      sharesByIndex,
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
        {(taxCost > 0 || defaultTaxBehavior === 'inclusive') && (
          <Box>
            <Typography
              component="label"
              variant="subtitle2"
              htmlFor="scan-tax-behavior"
              sx={{ display: 'block', mb: 1, fontWeight: 600 }}
            >
              Tax
            </Typography>
            <TextField
              id="scan-tax-behavior"
              hiddenLabel
              select
              fullWidth
              size="small"
              value={taxBehavior}
              onChange={(e) => setTaxBehavior(e.target.value === 'inclusive' ? 'inclusive' : 'exclusive')}
              variant="outlined"
              helperText={
                isTaxInclusive(taxBehavior)
                  ? 'The tax line is for your records. Totals already include it.'
                  : 'Tax is added after the items (common in the US).'
              }
            >
              <MenuItem value="exclusive">Added after items</MenuItem>
              <MenuItem value="inclusive">Included in prices</MenuItem>
            </TextField>
          </Box>
        )}
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
        ) : items.length > 0 ? (
          <Typography variant="body2" color="text.secondary">
            Found <strong>{items.length}</strong> line item{items.length === 1 ? '' : 's'}.
          </Typography>
        ) : null}
        {people.length > 0 ? (
          <TextField
            id="scan-paid-by"
            select
            fullWidth
            size="small"
            label="Paid by"
            value={paidById}
            onChange={(e) => setPaidById(e.target.value)}
          >
            <MenuItem value="">Choose later</MenuItem>
            {people.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>
        ) : null}
        {keepPhotoAvailable ? (
          <FormControlLabel
            control={
              <Checkbox
                checked={keepAttachment}
                onChange={(e) => setKeepAttachment(e.target.checked)}
              />
            }
            label="Keep photo as attachment"
          />
        ) : null}
        {items.length > 0 && people.length > 0 ? (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
              <Typography variant="subtitle2" fontWeight={600}>
                Who had what
              </Typography>
              {lastHasItems ? (
                <Button size="small" onClick={handleSameAsLast}>
                  Same as last receipt
                </Button>
              ) : null}
            </Box>
            {unassignedCount > 0 ? (
              <Alert severity="info" sx={{ mb: 1.5 }}>
                {unassignedCount} item{unassignedCount === 1 ? ' has' : 's have'} nobody yet — you can
                assign after saving.
              </Alert>
            ) : null}
            <Stack spacing={1.25}>
              {items.map((row, index) => {
                const qty = itemQty(row);
                const rowShares = sharesByIndex[index] || {};
                const used = Object.values(rowShares).reduce((s, q) => s + (Number(q) || 0), 0);
                return (
                  <Box
                    key={`${row.name}-${index}`}
                    sx={{
                      p: 1.25,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography variant="body2" fontWeight={600}>
                      {row.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      Qty {qty} · {formatMoneyWithCode(row.cost, currencyCode)} line total
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                      {qty === 1 ? (
                        <Button size="small" onClick={() => setRowShares(index, everyoneShares(personIds))}>
                          Everyone
                        </Button>
                      ) : null}
                      {mePersonId ? (
                        <Button size="small" onClick={() => setRowShares(index, justMeShares(mePersonId))}>
                          Just me
                        </Button>
                      ) : null}
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
                      {people.map((p) => {
                        const personQty = Number(rowShares[p.id]) || 0;
                        if (qty === 1) {
                          const on = personQty > 0;
                          return (
                            <Chip
                              key={p.id}
                              size="small"
                              label={p.name}
                              color={on ? 'primary' : 'default'}
                              variant={on ? 'filled' : 'outlined'}
                              onClick={() =>
                                setPersonQty(index, p.id, toggleShare(rowShares, p.id, qty))
                              }
                            />
                          );
                        }
                        return (
                          <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="caption">{p.name}</Typography>
                            <ItemPersonAssign
                              quantity={qty}
                              personQty={personQty}
                              isFull={used >= qty}
                              locked={false}
                              onSetQty={(next) => setPersonQty(index, p.id, next)}
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        ) : items.length > 0 ? (
          <Stack spacing={0.5}>
            {items.map((row, i) => (
              <Typography key={i} variant="body2">
                {row.name} · Qty {itemQty(row)} · {formatMoneyWithCode(row.cost, currencyCode)}
              </Typography>
            ))}
          </Stack>
        ) : null}
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
