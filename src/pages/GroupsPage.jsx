import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Fab from '@mui/material/Fab';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import AddIcon from '@mui/icons-material/Add';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import SearchIcon from '@mui/icons-material/Search';
import currency from 'currency.js';
import useEditTextModal from '../components/useEditTextModal.jsx';
import { useGroups } from '../hooks/useGroupData.js';

export default function GroupsPage() {
  const navigate = useNavigate();
  const { groups, addGroup } = useGroups();
  const { EditTextModal, showEditTextModal } = useEditTextModal();
  const [searchQuery, setSearchQuery] = useState('');

  const sorted = useMemo(
    () => [...groups].sort((a, b) => b.date - a.date),
    [groups],
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((g) => g.name.toLowerCase().includes(q));
  }, [sorted, searchQuery]);

  const handleCreate = (name) => {
    if (!name.trim()) return;
    const id = addGroup(name.trim());
    if (id) navigate(`/groups/${id}/people`);
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 4 } }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
        Groups
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Create a group for a trip, dinner, or any shared expense. Add
        receipts inside and settle up at the end.
      </Typography>

      {sorted.length === 0 ? (
        <Paper
          sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}
          elevation={0}
          variant="outlined"
        >
          <FolderSharedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            No groups yet. Tap + to create one.
          </Typography>
        </Paper>
      ) : (
        <>
          <TextField
            fullWidth
            size="small"
            placeholder="Search groups"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          {filtered.length === 0 ? (
            <Paper
              sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}
              elevation={0}
              variant="outlined"
            >
              <Typography color="text.secondary">
                No groups match &ldquo;{searchQuery.trim()}&rdquo;.
              </Typography>
            </Paper>
          ) : (
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <List disablePadding>
            {filtered.map((g, idx) => (
              <Box key={g.id}>
                {idx > 0 && <Divider />}
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => navigate(`/groups/${g.id}/people`)}
                    sx={{ py: 1.5, px: 2 }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <FolderSharedIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography fontWeight={600}>{g.name}</Typography>
                      }
                      secondary={
                        <Box
                          component="span"
                          sx={{
                            display: 'flex',
                            gap: 1,
                            alignItems: 'center',
                            mt: 0.5,
                            flexWrap: 'wrap',
                          }}
                        >
                          <Chip
                            label={`${g.peopleCount} people`}
                            size="small"
                            variant="outlined"
                            sx={{ height: 22, fontSize: '0.72rem' }}
                          />
                          <Chip
                            label={`${g.receiptCount} receipts`}
                            size="small"
                            variant="outlined"
                            sx={{ height: 22, fontSize: '0.72rem' }}
                          />
                        </Box>
                      }
                    />
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color="text.secondary"
                      sx={{ ml: 2, whiteSpace: 'nowrap' }}
                    >
                      {currency(g.totalSpent).format()}
                    </Typography>
                  </ListItemButton>
                </ListItem>
              </Box>
            ))}
          </List>
        </Paper>
          )}
        </>
      )}

      <Fab
        color="primary"
        onClick={() =>
          showEditTextModal({
            value: '',
            setValue: handleCreate,
            title: 'Create New Group',
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
