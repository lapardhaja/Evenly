import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Fab from '@mui/material/Fab';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import AddIcon from '@mui/icons-material/Add';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import currency from 'currency.js';
import useEditTextModal from '../components/useEditTextModal.jsx';
import { useGetReceipts } from '../hooks/useReceiptData.js';

export default function ReceiptsPage() {
  const navigate = useNavigate();
  const { receipts, pushReceipt } = useGetReceipts();
  const { EditTextModal, showEditTextModal } = useEditTextModal();

  const sorted = useMemo(
    () => [...receipts].sort((a, b) => b.date - a.date),
    [receipts],
  );

  const handleCreate = (title) => {
    if (!title.trim()) return;
    const id = pushReceipt({ title: title.trim() });
    if (id) navigate(`/receipts/${id}`);
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 4 } }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Receipts
      </Typography>

      {sorted.length === 0 ? (
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
          }}
          elevation={0}
          variant="outlined"
        >
          <ReceiptLongIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            No receipts yet. Tap + to create one.
          </Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <List disablePadding>
            {sorted.map((receipt, idx) => (
              <Box key={receipt.id}>
                {idx > 0 && <Divider />}
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => navigate(`/receipts/${receipt.id}`)}
                    sx={{ py: 1.5, px: 2 }}
                  >
                    <ListItemText
                      primary={
                        <Typography fontWeight={600}>
                          {receipt.title}
                        </Typography>
                      }
                      secondary={formatDate(receipt.date)}
                    />
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color="text.secondary"
                      sx={{ ml: 2, whiteSpace: 'nowrap' }}
                    >
                      {currency(receipt.total).format()}
                    </Typography>
                  </ListItemButton>
                </ListItem>
              </Box>
            ))}
          </List>
        </Paper>
      )}

      <Fab
        color="primary"
        onClick={() =>
          showEditTextModal({
            value: '',
            setValue: handleCreate,
            title: 'Create New Receipt',
          })
        }
        sx={{
          position: 'fixed',
          bottom: { xs: 24, sm: 32 },
          right: { xs: 24, sm: 32 },
        }}
      >
        <AddIcon />
      </Fab>

      {EditTextModal}
    </Container>
  );
}
