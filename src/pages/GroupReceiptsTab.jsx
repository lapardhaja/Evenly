import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import AddIcon from '@mui/icons-material/Add';
import DocumentScannerIcon from '@mui/icons-material/DocumentScanner';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import currency from 'currency.js';
import useEditTextModal from '../components/useEditTextModal.jsx';
import ScanReceiptDialog from './ScanReceiptDialog.jsx';
import { scanReceiptImage, readFileAsDataUrl } from '../lib/scanReceipt.js';

export default function GroupReceiptsTab({ groupId, groupData }) {
  const { receipts, people, addReceipt, addReceiptWithItems } = groupData;
  const navigate = useNavigate();
  const { EditTextModal, showEditTextModal } = useEditTextModal();
  const fileInputRef = useRef(null);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [scannedItems, setScannedItems] = useState([]);
  const [scanFlowError, setScanFlowError] = useState('');

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

  const openScanPicker = () => {
    setSpeedDialOpen(false);
    fileInputRef.current?.click();
  };

  const handleScanFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setScanLoading(true);
    setScanFlowError('');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const { items } = await scanReceiptImage(dataUrl);
      setScannedItems(Array.isArray(items) ? items : []);
      setScanDialogOpen(true);
    } catch (err) {
      setScannedItems([]);
      setScanFlowError(err.message || 'Scan failed');
      setScanDialogOpen(true);
    } finally {
      setScanLoading(false);
    }
  };

  const handleScanConfirm = (title, items) => {
    const id = addReceiptWithItems(title, items);
    if (id) navigate(`/groups/${groupId}/receipt/${id}`);
  };

  const formatDate = (ts) =>
    new Date(ts).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
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
          <List disablePadding>
            {sorted.map((r, idx) => {
              const payer = r.paidById ? peopleMap[r.paidById] : null;
              return (
                <Box key={r.id}>
                  {idx > 0 && <Divider />}
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => navigate(`/groups/${groupId}/receipt/${r.id}`)}
                      sx={{ py: 1.5, px: 2 }}
                    >
                      <ListItemText
                        primary={
                          <Typography fontWeight={600}>{r.title}</Typography>
                        }
                        secondary={
                          <Box component="span" sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5, flexWrap: 'wrap' }}>
                            <Typography component="span" variant="caption" color="text.secondary">
                              {formatDate(r.date)}
                            </Typography>
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
                        {currency(r.total).format()}
                      </Typography>
                    </ListItemButton>
                  </ListItem>
                </Box>
              );
            })}
          </List>
        </Paper>
      )}

      <Backdrop
        open={scanLoading}
        sx={{ color: '#fff', zIndex: (t) => t.zIndex.drawer + 2 }}
      >
        <CircularProgress color="inherit" />
      </Backdrop>

      <SpeedDial
        ariaLabel="Add receipt"
        sx={{
          position: 'fixed',
          bottom: { xs: 24, sm: 32 },
          right: { xs: 24, sm: 32 },
        }}
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
          icon={<DocumentScannerIcon />}
          tooltipTitle="Scan receipt"
          tooltipOpen
          onClick={openScanPicker}
        />
      </SpeedDial>

      <ScanReceiptDialog
        open={scanDialogOpen}
        onClose={() => {
          setScanDialogOpen(false);
          setScanFlowError('');
        }}
        items={scannedItems}
        error={scanFlowError}
        onConfirm={handleScanConfirm}
      />

      {EditTextModal}
    </Box>
  );
}
