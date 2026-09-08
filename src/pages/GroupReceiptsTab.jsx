import { useMemo, useRef, useState, useCallback, useLayoutEffect, useEffect } from 'react';
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
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import IconButton from '@mui/material/IconButton';
import { useVirtualizer } from '@tanstack/react-virtual';
import { formatMoneyWithCode, normalizeCurrencyCode } from '../lib/currencies.js';
import { getVirtualRowTranslateY } from '../lib/virtualizedList.js';
import useEditTextModal from '../components/useEditTextModal.jsx';
import ScanReceiptDialog from './ScanReceiptDialog.jsx';
import { scanReceiptImage, readFileAsDataUrl } from '../lib/scanReceipt.js';
import { getSupabase, isSupabaseConfigured } from '../lib/supabaseClient.js';
import { useGroupsData } from '../context/GroupsDataContext.jsx';
import { uploadAttachment } from '../lib/receiptAttachments.js';
import { fabFixedPlacementSx, fabScrollClearanceSx } from '../core/fabPlacement.js';
import 'react-swipeable-list/dist/styles.css';
import '../components/swipeable-list-overrides.css';
import { SwipeableDeleteRow } from '../components/SwipeableDeleteList.jsx';
import ReceiptScanLoadingOverlay from '../components/ReceiptScanLoadingOverlay.jsx';

const MAIN_SCROLL_ID = 'evenly-main-scroll';

function fileFromScanSource(file, dataUrl) {
  if (file && typeof file.size === 'number' && file.size > 0) {
    return file;
  }
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Could not keep this photo as an attachment.');
  }
  const mime = match[1];
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const name = file?.name || 'receipt.jpg';
  return new File([bytes], name, { type: mime });
}

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
  const { persistNow } = useGroupsData();
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
  const [scannedTaxBehavior, setScannedTaxBehavior] = useState('exclusive');
  const [scanFile, setScanFile] = useState(null);
  const [scanDataUrl, setScanDataUrl] = useState('');
  const [scanFlowError, setScanFlowError] = useState('');
  const [wrongFileHint, setWrongFileHint] = useState('');
  const [attachmentToast, setAttachmentToast] = useState('');
  const [receiptsWithAttachments, setReceiptsWithAttachments] = useState(() => new Set());
  const [undoReceiptDelete, setUndoReceiptDelete] = useState(null);

  const listBlockRef = useRef(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const [scrollParent, setScrollParent] = useState(null);

  const sorted = useMemo(
    () => [...receipts].sort((a, b) => b.date - a.date),
    [receipts],
  );

  const peopleMap = useMemo(() => {
    const map = {};
    people.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [people]);

  const receiptIdsKey = useMemo(() => receipts.map((r) => r.id).join(','), [receipts]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setReceiptsWithAttachments(new Set());
      return undefined;
    }
    const receiptIds = receiptIdsKey ? receiptIdsKey.split(',') : [];
    if (receiptIds.length === 0) {
      setReceiptsWithAttachments(new Set());
      return undefined;
    }
    const client = getSupabase();
    if (!client) return undefined;
    let cancelled = false;
    client
      .from('receipt_attachments')
      .select('receipt_id')
      .in('receipt_id', receiptIds)
      .then(({ data, error }) => {
        if (cancelled || error) return;
        const next = new Set();
        (data || []).forEach((row) => {
          if (row?.receipt_id) next.add(row.receipt_id);
        });
        setReceiptsWithAttachments(next);
      });
    return () => {
      cancelled = true;
    };
  }, [receiptIdsKey]);

  /** #evenly-main-scroll — must use useVirtualizer (not useWindowVirtualizer) when scroll is this element. */
  useLayoutEffect(() => {
    setScrollParent(document.getElementById(MAIN_SCROLL_ID));
  }, []);

  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => scrollParent,
    estimateSize: () => 88,
    overscan: 8,
    scrollMargin,
    enabled: sorted.length > 0 && !!scrollParent,
  });

  useLayoutEffect(() => {
    const scrollEl = scrollParent;
    const block = listBlockRef.current;
    if (!scrollEl || !block || sorted.length === 0) return undefined;

    const measure = () => {
      const s = scrollEl.getBoundingClientRect();
      const b = block.getBoundingClientRect();
      setScrollMargin(b.top - s.top + scrollEl.scrollTop);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(scrollEl);
    ro.observe(block);
    window.addEventListener('resize', measure);
    scrollEl.addEventListener('scroll', measure, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      scrollEl.removeEventListener('scroll', measure);
    };
  }, [scrollParent, sorted.length, isMobileSwipe]);

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
      setWrongFileHint('Use a photo, not a PDF.');
      return;
    }
    setScanFile(file);
    setScanLoading(true);
    setScanFlowError('');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setScanDataUrl(dataUrl);
      const {
        items,
        storeName,
        tax,
        tip,
        discount,
        receiptDate,
        grandTotal,
        currencyCode,
        taxBehavior,
      } = await scanReceiptImage(dataUrl);
      setScannedItems(Array.isArray(items) ? items : []);
      setScannedStoreName(storeName || '');
      setScannedTax(typeof tax === 'number' ? tax : 0);
      setScannedTip(typeof tip === 'number' ? tip : 0);
      setScannedDiscount(typeof discount === 'number' ? discount : 0);
      setScannedReceiptDate(typeof receiptDate === 'string' ? receiptDate : '');
      setScannedGrandTotal(typeof grandTotal === 'number' ? grandTotal : 0);
      setScannedCurrencyCode(currencyCode || 'USD');
      setScannedTaxBehavior(taxBehavior === 'inclusive' ? 'inclusive' : 'exclusive');
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
      setScannedTaxBehavior('exclusive');
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

  const handleScanConfirm = async (title, items, charges = {}) => {
    const taxBehavior =
      charges.taxBehavior === 'inclusive' || charges.taxBehavior === 'exclusive'
        ? charges.taxBehavior
        : scannedTaxBehavior;
    const keepAttachment = charges.keepAttachment === true;
    const originalFile = scanFile;
    const originalDataUrl = scanDataUrl;
    const id = addReceiptWithItems(title, items, {
      taxCost: charges.taxCost ?? 0,
      tipCost: charges.tipCost ?? 0,
      discountCost: charges.discountCost ?? 0,
      receiptDate: charges.receiptDate,
      currencyCode: charges.currencyCode || scannedCurrencyCode,
      taxBehavior,
    });
    if (!id) return;
    if (keepAttachment && isSupabaseConfigured()) {
      try {
        const file = fileFromScanSource(originalFile, originalDataUrl);
        await persistNow();
        await uploadAttachment({ groupId, receiptId: id, file });
        setReceiptsWithAttachments((prev) => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
      } catch (err) {
        setAttachmentToast(
          err?.message && String(err.message).length < 160
            ? err.message
            : 'Could not save the receipt photo.',
        );
        return;
      }
    }
    navigate(`/groups/${groupId}/receipt/${id}`);
  };

  const formatDate = (ts) =>
    new Date(ts).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const handleDeleteReceipt = useCallback(
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
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
              <Typography fontWeight={600} component="span" noWrap>
                {r.title}
              </Typography>
              {receiptsWithAttachments.has(r.id) && (
                <AttachFileIcon
                  fontSize="small"
                  color="action"
                  aria-label="Has attachment"
                  sx={{ flexShrink: 0 }}
                />
              )}
            </Box>
          }
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

  const virtualItems = virtualizer.getVirtualItems();

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
          <Typography color="text.secondary">No receipts yet. Tap + to add one.</Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box ref={listBlockRef}>
            {isMobileSwipe ? (
              <Box
                sx={{
                  height: virtualizer.getTotalSize(),
                  width: '100%',
                  position: 'relative',
                }}
              >
                {virtualItems.map((vi) => {
                  const r = sorted[vi.index];
                  return (
                    <Box
                      key={r.id}
                      data-index={vi.index}
                      ref={virtualizer.measureElement}
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${getVirtualRowTranslateY(vi.start, scrollMargin)}px)`,
                      }}
                    >
                      <SwipeableDeleteRow onDelete={() => handleDeleteReceipt(r)}>
                        <ListItem disablePadding sx={{ display: 'block' }}>
                          {receiptRow(r)}
                        </ListItem>
                      </SwipeableDeleteRow>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <List disablePadding>
                <Box
                  sx={{
                    height: virtualizer.getTotalSize(),
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  {virtualItems.map((vi) => {
                    const r = sorted[vi.index];
                    return (
                      <Box
                        key={r.id}
                        data-index={vi.index}
                        ref={virtualizer.measureElement}
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${getVirtualRowTranslateY(vi.start, scrollMargin)}px)`,
                        }}
                      >
                        {vi.index > 0 && <Divider />}
                        <ListItem
                          disablePadding
                          secondaryAction={
                            <IconButton
                              edge="end"
                              aria-label={`Delete ${r.title}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteReceipt(r);
                              }}
                              size="small"
                              color="error"
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          }
                        >
                          {receiptRow(r)}
                        </ListItem>
                      </Box>
                    );
                  })}
                </Box>
              </List>
            )}
          </Box>
        </Paper>
      )}

      <Box aria-hidden sx={fabScrollClearanceSx} />

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
          setScannedTaxBehavior('exclusive');
          setScanFile(null);
          setScanDataUrl('');
        }}
        items={scannedItems}
        taxCost={scannedTax}
        tipCost={scannedTip}
        discountCost={scannedDiscount}
        defaultReceiptDateISO={scannedReceiptDate}
        scannedGrandTotal={scannedGrandTotal}
        defaultTitle={scannedStoreName}
        defaultCurrencyCode={scannedCurrencyCode}
        defaultTaxBehavior={scannedTaxBehavior}
        error={scanFlowError}
        keepPhotoAvailable={isSupabaseConfigured()}
        onConfirm={handleScanConfirm}
      />

      {EditTextModal}

      <Snackbar
        open={!!wrongFileHint}
        autoHideDuration={4000}
        onClose={() => setWrongFileHint('')}
        message={wrongFileHint}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          bottom: { xs: 'calc(16px + env(safe-area-inset-bottom, 0px))', sm: 24 },
        }}
      />

      <Snackbar
        open={!!attachmentToast}
        autoHideDuration={5000}
        onClose={() => setAttachmentToast('')}
        message={attachmentToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          bottom: { xs: 'calc(16px + env(safe-area-inset-bottom, 0px))', sm: 24 },
        }}
      />

      <Snackbar
        open={!!undoReceiptDelete}
        autoHideDuration={7000}
        onClose={(_, reason) => {
          if (reason === 'clickaway') return;
          setUndoReceiptDelete(null);
        }}
        message={undoReceiptDelete ? `Removed "${undoReceiptDelete.label}"` : ''}
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
