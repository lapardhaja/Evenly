import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import IconButton from '@mui/material/IconButton';
import ButtonBase from '@mui/material/ButtonBase';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { SETTLEMENT_CURRENCY_OPTIONS, normalizeCurrencyCode } from '../lib/currencies.js';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import useEditTextModal from '../components/useEditTextModal.jsx';
import { useGroupReceipt } from '../hooks/useGroupData.js';
import ReceiptInfoItemsTab from './ReceiptInfoItemsTab.jsx';
import ReceiptInfoPeopleTab from './ReceiptInfoPeopleTab.jsx';

const TABS = ['items', 'people'];

export default function ReceiptInfoPage() {
  const { groupId, receiptId, tab } = useParams();
  const navigate = useNavigate();
  const receiptData = useGroupReceipt(groupId, receiptId);
  const { receipt, people, updateReceiptProperty, deleteReceipt } = receiptData;
  const { EditTextModal, showEditTextModal } = useEditTextModal();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const currentTab = TABS.indexOf(tab) >= 0 ? TABS.indexOf(tab) : 0;

  if (!receipt) {
    return (
      <Container maxWidth="sm" sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Receipt not found.</Typography>
      </Container>
    );
  }

  const dt = new Date(receipt.date);
  const dateStr = dt.toISOString().split('T')[0];

  const confirmDeleteReceipt = () => {
    deleteReceipt();
    setDeleteDialogOpen(false);
    navigate(`/groups/${groupId}/receipts`);
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 1, sm: 3 }, px: { xs: 1, sm: 3 } }}>
      {/* Header row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <IconButton
          onClick={() => navigate(`/groups/${groupId}/receipts`)}
          size="small"
        >
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ButtonBase
            onClick={() =>
              !receipt.locked &&
              showEditTextModal({
                setValue: (value) => updateReceiptProperty('title', value),
                title: 'Edit Receipt Name',
                value: receipt.title,
              })
            }
            disabled={receipt.locked}
            sx={{
              display: 'block',
              textAlign: 'left',
              borderRadius: 1,
              px: 1,
              py: 0.5,
            }}
          >
            <Typography
              variant="h6"
              fontWeight={700}
              noWrap
              sx={{ maxWidth: { xs: '50vw', sm: 'none' } }}
            >
              {receipt.title}
            </Typography>
          </ButtonBase>
        </Box>
        <IconButton
          onClick={() => updateReceiptProperty('locked', !receipt.locked)}
          size="small"
          color={receipt.locked ? 'error' : 'default'}
        >
          {receipt.locked ? <LockIcon /> : <LockOpenIcon />}
        </IconButton>
        <IconButton
          onClick={() => setDeleteDialogOpen(true)}
          size="small"
          color="error"
          aria-label="Delete receipt"
        >
          <DeleteOutlineIcon />
        </IconButton>
      </Box>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Delete receipt?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This can’t be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDeleteReceipt} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Date + Paid By row */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          px: 1,
          mb: 2,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <TextField
          type="date"
          value={dateStr}
          onChange={(e) => {
            const newDate = new Date(e.target.value + 'T12:00:00').getTime();
            if (!isNaN(newDate)) updateReceiptProperty('date', newDate);
          }}
          variant="standard"
          size="small"
          disabled={receipt.locked}
          sx={{ maxWidth: 160 }}
        />
        <TextField
          select
          label="Paid by"
          value={receipt.paidById || ''}
          onChange={(e) => updateReceiptProperty('paidById', e.target.value)}
          variant="standard"
          size="small"
          disabled={receipt.locked}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">
            <em>Not set</em>
          </MenuItem>
          {people.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Receipt currency"
          value={receipt.currencyCode || 'USD'}
          onChange={(e) => updateReceiptProperty('currencyCode', normalizeCurrencyCode(e.target.value))}
          variant="standard"
          size="small"
          disabled={receipt.locked}
          sx={{ minWidth: 200 }}
          SelectProps={{ native: true }}
        >
          {SETTLEMENT_CURRENCY_OPTIONS.map((o) => (
            <option key={o.code} value={o.code}>
              {o.label}
            </option>
          ))}
        </TextField>
      </Box>

      <Tabs
        value={currentTab}
        onChange={(_, v) =>
          navigate(`/groups/${groupId}/receipt/${receiptId}/${TABS[v]}`)
        }
        indicatorColor="primary"
        textColor="primary"
        centered
        sx={{ mb: { xs: 1, sm: 2 } }}
      >
        {TABS.map((t) => (
          <Tab key={t} label={t.charAt(0).toUpperCase() + t.slice(1)} />
        ))}
      </Tabs>

      {currentTab === 0 && <ReceiptInfoItemsTab receiptData={receiptData} />}
      {currentTab === 1 && (
        <ReceiptInfoPeopleTab
          receiptData={receiptData}
          isGroupReceipt
        />
      )}

      {EditTextModal}
    </Container>
  );
}
