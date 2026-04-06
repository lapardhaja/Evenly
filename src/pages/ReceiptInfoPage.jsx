import { useParams, useNavigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import IconButton from '@mui/material/IconButton';
import ButtonBase from '@mui/material/ButtonBase';
import TextField from '@mui/material/TextField';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import useEditTextModal from '../components/useEditTextModal.jsx';
import { useGetReceipt } from '../hooks/useReceiptData.js';
import ReceiptInfoItemsTab from './ReceiptInfoItemsTab.jsx';
import ReceiptInfoPeopleTab from './ReceiptInfoPeopleTab.jsx';

const TABS = ['items', 'people'];

export default function ReceiptInfoPage() {
  const { receiptId, tab } = useParams();
  const navigate = useNavigate();
  const receiptData = useGetReceipt(receiptId);
  const { receipt, updateReceiptProperty, deleteReceipt } = receiptData;
  const { EditTextModal, showEditTextModal } = useEditTextModal();

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

  const handleDelete = () => {
    if (!window.confirm('Delete this receipt? This cannot be undone.')) return;
    deleteReceipt();
    navigate('/receipts');
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 1, sm: 3 }, px: { xs: 1, sm: 3 } }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 1,
        }}
      >
        <IconButton onClick={() => navigate('/receipts')} size="small">
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
              sx={{
                maxWidth: { xs: '55vw', sm: 'none' },
              }}
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
        <IconButton onClick={handleDelete} size="small" color="error">
          <DeleteOutlineIcon />
        </IconButton>
      </Box>

      <Box sx={{ px: 1, mb: 2 }}>
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
          InputProps={{ disableUnderline: false }}
          sx={{ maxWidth: 180 }}
        />
      </Box>

      <Tabs
        value={currentTab}
        onChange={(_, v) => navigate(`/receipts/${receiptId}/${TABS[v]}`)}
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
      {currentTab === 1 && <ReceiptInfoPeopleTab receiptData={receiptData} />}

      {EditTextModal}
    </Container>
  );
}
