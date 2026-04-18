import { useState, useCallback, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useParams, useNavigate, useBlocker, useLocation } from 'react-router-dom';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import IconButton from '@mui/material/IconButton';
import ButtonBase from '@mui/material/ButtonBase';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import CurrencyAutocomplete from '../components/CurrencyAutocomplete.jsx';
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
  const location = useLocation();
  const receiptData = useGroupReceipt(groupId, receiptId);
  const { receipt, people, updateReceiptProperty, deleteReceipt } = receiptData;
  const { EditTextModal, showEditTextModal } = useEditTextModal();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [payerGuardPayerId, setPayerGuardPayerId] = useState('');
  const skipPaidByBlockRef = useRef(false);

  const needsPaidByBeforeLeave =
    !!receipt &&
    !receipt.locked &&
    people.length > 0 &&
    !receipt.paidById;

  const shouldBlockNavigation = useCallback(
    ({ currentLocation, nextLocation }) => {
      if (!needsPaidByBeforeLeave || skipPaidByBlockRef.current) return false;
      if (currentLocation.pathname === nextLocation.pathname) return false;
      const stillOnReceipt = nextLocation.pathname.startsWith(
        `/groups/${groupId}/receipt/${receiptId}`,
      );
      if (stillOnReceipt) return false;
      return true;
    },
    [needsPaidByBeforeLeave, groupId, receiptId],
  );

  const blocker = useBlocker(shouldBlockNavigation);

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setPayerGuardPayerId('');
    }
  }, [blocker.state]);

  useEffect(() => {
    const onReceipt = location.pathname.startsWith(
      `/groups/${groupId}/receipt/${receiptId}`,
    );
    if (!onReceipt) {
      skipPaidByBlockRef.current = false;
    }
  }, [location.pathname, groupId, receiptId]);

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
    skipPaidByBlockRef.current = true;
    deleteReceipt();
    setDeleteDialogOpen(false);
    navigate(`/groups/${groupId}/receipts`);
  };

  const navigateAwayFromReceipt = (to) => {
    skipPaidByBlockRef.current = true;
    navigate(to);
  };

  const handleSavePayerAndLeave = () => {
    if (!payerGuardPayerId) return;
    flushSync(() => {
      updateReceiptProperty('paidById', payerGuardPayerId);
    });
    skipPaidByBlockRef.current = true;
    blocker.proceed?.();
  };

  const handleLeaveWithoutPayer = () => {
    skipPaidByBlockRef.current = true;
    blocker.proceed?.();
  };

  const handleStayOnReceipt = () => {
    blocker.reset?.();
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 1, sm: 3 }, px: { xs: 1, sm: 3 } }}>
      {/* Header row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <IconButton
          onClick={() => navigateAwayFromReceipt(`/groups/${groupId}/receipts`)}
          size="small"
          aria-label="Back to receipts"
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

      <Dialog
        open={blocker.state === 'blocked'}
        onClose={handleStayOnReceipt}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Who paid?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose who paid before you leave, or leave without choosing.
          </Typography>
          <TextField
            select
            label="Paid by"
            value={payerGuardPayerId}
            onChange={(e) => setPayerGuardPayerId(e.target.value)}
            fullWidth
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">
              <em>Choose…</em>
            </MenuItem>
            {people.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={handleStayOnReceipt}>Stay</Button>
          <Button onClick={handleLeaveWithoutPayer} color="inherit">
            Leave without choosing
          </Button>
          <Button
            onClick={handleSavePayerAndLeave}
            variant="contained"
            disabled={!payerGuardPayerId}
          >
            Save and leave
          </Button>
        </DialogActions>
      </Dialog>

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
        <CurrencyAutocomplete
          id="receipt-currency"
          label="Receipt currency"
          value={receipt.currencyCode || 'USD'}
          onChange={(code) => updateReceiptProperty('currencyCode', code)}
          variant="standard"
          size="small"
          disabled={receipt.locked}
          sx={{ minWidth: { xs: '100%', sm: 280 }, maxWidth: 360 }}
        />
        {((receipt.taxCost || 0) > 0 || receipt.taxBehavior === 'inclusive') && (
          <TextField
            select
            label="Tax"
            value={receipt.taxBehavior === 'inclusive' ? 'inclusive' : 'exclusive'}
            onChange={(e) =>
              updateReceiptProperty('taxBehavior', e.target.value === 'inclusive' ? 'inclusive' : 'exclusive')
            }
            variant="standard"
            size="small"
            disabled={receipt.locked}
            sx={{ minWidth: { xs: '100%', sm: 220 } }}
            helperText={
              receipt.taxBehavior === 'inclusive'
                ? 'Included in prices'
                : 'Added after items'
            }
            FormHelperTextProps={{ sx: { mt: 0 } }}
          >
            <MenuItem value="exclusive">Added after items</MenuItem>
            <MenuItem value="inclusive">Included in prices</MenuItem>
          </TextField>
        )}
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
