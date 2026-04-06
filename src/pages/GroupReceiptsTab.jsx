import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Fab from '@mui/material/Fab';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import AddIcon from '@mui/icons-material/Add';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import currency from 'currency.js';
import useEditTextModal from '../components/useEditTextModal.jsx';

export default function GroupReceiptsTab({ groupId, groupData }) {
  const { receipts, people, addReceipt } = groupData;
  const navigate = useNavigate();
  const { EditTextModal, showEditTextModal } = useEditTextModal();

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

  const formatDate = (ts) =>
    new Date(ts).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  return (
    <Box>
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

      <Fab
        color="primary"
        onClick={() =>
          showEditTextModal({
            value: '',
            setValue: handleCreate,
            title: 'New Receipt',
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
    </Box>
  );
}
