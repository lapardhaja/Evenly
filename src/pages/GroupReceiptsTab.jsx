import { useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Snackbar from '@mui/material/Snackbar';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import AddIcon from '@mui/icons-material/Add';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { formatMoneyWithCode, normalizeCurrencyCode } from '../lib/currencies.js';
import useEditTextModal from '../components/useEditTextModal.jsx';
import ScanReceiptDialog from './ScanReceiptDialog.jsx';
import { scanReceiptImage, readFileAsDataUrl } from '../lib/scanReceipt.js';
import { fabFixedPlacementSx } from '../core/fabPlacement.js';
import SwipeableDeleteList from '../components/SwipeableDeleteList.jsx';
import ReceiptScanLoadingOverlay from '../components/ReceiptScanLoadingOverlay.jsx';

export default function GroupReceiptsTab({ groupId, groupData }) {
  const theme = useTheme();
  const isMobileSwipe = useMediaQuery(theme.breakpoints.down('md'));
  const {
    receipts,
    people,
    addReceipt,
    addReceiptWithItems,
    deleteReceipt,
    getReceiptSnapshot,
    restoreReceipt,
  } = groupData;
  const navigate = useNavigate();
  const { EditTextModal, showEditTextModal } = useEditTextModal();
  const cameraInputRef = useRef(null);
  const uploadInputRef = useRef(null);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [scannedItems, setScannedItems] = useState([]);
  const [scannedStoreName, setScannedStoreName] = useState('');
  const [scannedTax, setScannedTax] = useState(0);
  const [scannedTip, setScannedTip] = useState(0);
  const [scannedDiscount, setScannedDiscount] = useState(0);
  const [scannedReceiptDate, setScannedReceiptDate] = useState('');
  const [scannedGrandTotal, setScannedGrandTotal] = useState(0);
  const [scannedCurrencyCode, setScannedCurrencyCode] = useState('USD');
  const [scanFlowError, setScanFlowError] = useState('');
  const [undoReceiptDelete, setUndoReceiptDelete] = useState(null);

  const sorted = useMemo(
    () => [...receipts].sort((a, b) => b.date - a.date),
    [receipts],
  );

  const peopleMap = useMemo(() => {
    const map = {};
    people.forEach((p) => { map[p.id] = p; });
    return map;
  }, [people]);

  const handleCreate = (title) => {
    if (!title.trim()) return;
    const id = addReceipt(title.trim());
    if (id) navigate(`/groups/${groupId}/receipt/${id}`);
  };

  const openScanCamera = () => {
    setSpeedDialOpen(false);
    cameraInputRef.current?.click();
  };

  const openScanUpload = () => {
    setSpeedDialOpen(false);
    uploadInputRef.current?.click();
  };

  const handleScanFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting same file
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      window.alert('Please choose a photo (not a PDF).');
      return;
    }
    setScanLoading(true);
    setScanFlowError('');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const { items, storeName, tax, tip, discount, receiptDate, grandTotal, currencyCode } =
        await scanReceiptImage(dataUrl);
      setScannedItems(Array.isArray(items) ? items : []);
      setScannedStoreName(storeName || '');
      setScannedTax(typeof tax === 'number' ? tax : 0);
      setScannedTip(typeof tip === 'number' ? tip : 0);
      setScannedDiscount(typeof discount === 'number' ? discount : 0);
      setScannedReceiptDate(typeof receiptDate === 'string' ? receiptDate : '');
      setScannedGrandTotal(typeof grandTotal === 'number' ? grandTotal : 0);
      setScannedCurrencyCode(currencyCode || 'USD');
      setScanDialogOpen(true);
    } catch (err) {
      setScannedItems([]);
      setScannedStoreName('');
      setScannedTax(0);
      setScannedTip(0);
      setScannedDiscount(0);
      setScannedReceiptDate('');
      setScannedGrandTotal(0);
      setScannedCurrencyCode('USD');
      setScanFlowError(
        err?.message && String(err.message).length < 120
          ? err.message
          : 'We couldn’t read this receipt. Try another photo.',
      );
      setScanDialogOpen(true);
    } finally {
      setScanLoading(false);
    }
  };

  const handleScanConfirm = (title, items, charges = {}) => {
    const id = addReceiptWithItems(title, items, {
      taxCost: charges.taxCost ?? 0,
      tipCost: charges.tipCost ?? 0,
      discountCost: charges.discountCost ?? 0,
      receiptDate: charges.receiptDate,
      currencyCode: charges.currencyCode || scannedCurrencyCode,
    });
    if (id) navigate(`/groups/${groupId}/receipt/${id}`);
  };

  const formatDate = (ts) =>
    new Date(ts).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const handleSwipeDeleteReceipt = useCallback(
    (r) => {
      const snapshot = getReceiptSnapshot(r.id);
      deleteReceipt(r.id);
      setUndoReceiptDelete({
        id: r.id,
        snapshot,
        label: r.title,
      });
    },
    [deleteReceipt, getReceiptSnapshot],
  );

  const handleUndoReceiptDelete = useCallback(() => {
    if (undoReceiptDelete?.snapshot) {
      restoreReceipt(undoReceiptDelete.id, undoReceiptDelete.snapshot);
    }
    setUndoReceiptDelete(null);
  }, [undoReceiptDelete, restoreReceipt]);

  const receiptRow = (r) => {
    const payer = r.paidById ? peopleMap[r.paidById] : null;
    return (
      <ListItemButton
        onClick={() => navigate(`/groups/${groupId}/receipt/${r.id}`)}
        sx={{ py: 1.5, px: 2 }}
      >
        <ListItemText
          primary={<Typography fontWeight={600}>{r.title}</Typography>}
          secondary={
            <Box
              component="span"
              sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5, flexWrap: 'wrap' }}
            >
              <Typography component="span" variant="caption" color="text.secondary">
                {formatDate(r.date)}
              </Typography>
              <Chip
                label={r.currencyCode || 'USD'}
                size="small"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.65rem' }}
              />
              {payer && (
                <Chip
                  label={`Paid by ${payer.name}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              )}
              {!payer && r.total > 0 && (
                <Chip
                  label="No payer set"
                  size="small"
                  color="warning"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              )}
            </Box>
          }
        />
        <Typography
          variant="body2"
          fontWeight={600}
          color="text.secondary"
          sx={{ ml: 2, whiteSpace: 'nowrap' }}
        >
          {formatMoneyWithCode(r.total, normalizeCurrencyCode(r.currencyCode || 'USD'))}
        </Typography>
      </ListItemButton>
    );
  };

  return (
    <Box>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleScanFile}
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleScanFile}
      />
      {sorted.length === 0 ? (
        <Paper
          sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}
          elevation={0}
          variant="outlined"
        >
          <ReceiptLongIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            No receipts yet. Tap + to add one.
          </Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
          {isMobileSwipe ? (
            <SwipeableDeleteList
              items={sorted}
              getKey={(r) => r.id}
              onDelete={handleSwipeDeleteReceipt}
            >
              {(r) => (
                <ListItem disablePadding sx={{ display: 'block' }}>
                  {receiptRow(r)}
                </ListItem>
              )}
            </SwipeableDeleteList>
          ) : (
            <List disablePadding>
              {sorted.map((r, idx) => (
                <Box key={r.id}>
                  {idx > 0 && <Divider />}
                  <ListItem disablePadding>{receiptRow(r)}</ListItem>
                </Box>
              ))}
            </List>
          )}
        </Paper>
      )}

      <ReceiptScanLoadingOverlay open={scanLoading} />

      <SpeedDial
        ariaLabel="Add receipt"
        sx={fabFixedPlacementSx}
        icon={<SpeedDialIcon />}
        open={speedDialOpen}
        onOpen={() => setSpeedDialOpen(true)}
        onClose={() => setSpeedDialOpen(false)}
      >
        <SpeedDialAction
          icon={<AddIcon />}
          tooltipTitle="New receipt"
          tooltipOpen
          onClick={() => {
            setSpeedDialOpen(false);
            showEditTextModal({
              value: '',
              setValue: handleCreate,
              title: 'New Receipt',
            });
          }}
        />
        <SpeedDialAction
          icon={<PhotoCameraIcon />}
          tooltipTitle="Take photo"
          tooltipOpen
          onClick={openScanCamera}
        />
        <SpeedDialAction
          icon={<UploadFileIcon />}
          tooltipTitle="Upload receipt"
          tooltipOpen
          onClick={openScanUpload}
        />
      </SpeedDial>

      <ScanReceiptDialog
        open={scanDialogOpen}
        onClose={() => {
          setScanDialogOpen(false);
          setScanFlowError('');
          setScannedStoreName('');
          setScannedTax(0);
          setScannedTip(0);
          setScannedDiscount(0);
          setScannedReceiptDate('');
          setScannedGrandTotal(0);
          setScannedCurrencyCode('USD');
        }}
        items={scannedItems}
        taxCost={scannedTax}
        tipCost={scannedTip}
        discountCost={scannedDiscount}
        defaultReceiptDateISO={scannedReceiptDate}
        scannedGrandTotal={scannedGrandTotal}
        defaultTitle={scannedStoreName}
        defaultCurrencyCode={scannedCurrencyCode}
        error={scanFlowError}
        onConfirm={handleScanConfirm}
      />

      {EditTextModal}

      <Snackbar
        open={!!undoReceiptDelete}
        autoHideDuration={7000}
        onClose={(_, reason) => {
          if (reason === 'clickaway') return;
          setUndoReceiptDelete(null);
        }}
        message={
          undoReceiptDelete
            ? `Removed "${undoReceiptDelete.label}"`
            : ''
        }
        action={
          <Button color="secondary" size="small" onClick={handleUndoReceiptDelete}>
            Undo
          </Button>
        }
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          bottom: { xs: 'calc(16px + env(safe-area-inset-bottom, 0px))', sm: 24 },
        }}
      />
    </Box>
  );
}
