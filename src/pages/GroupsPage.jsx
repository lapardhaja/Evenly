import { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Container from '@mui/material/Container';
import Snackbar from '@mui/material/Snackbar';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import AddIcon from '@mui/icons-material/Add';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import SearchIcon from '@mui/icons-material/Search';
import useEditTextModal from '../components/useEditTextModal.jsx';
import { useGroups } from '../hooks/useGroupData.js';
import { useGroupsData } from '../context/GroupsDataContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useConfirmDialog } from '../components/useConfirmDialog.jsx';
import { getDefaultPeopleMapForNewGroup } from '../lib/defaultGroupPeople.js';
import { convertGroupTotals } from '../lib/groupSpendConvert.js';
import {
  GROUP_TOTAL_FX_FAILED_COPY,
  groupListFxFailed,
  groupListTotalDisplay,
} from '../lib/groupListTotals.js';
import { canDeleteGroup, groupListBadge } from '../lib/groupMembership.js';
import { leaveGroup } from '../lib/groupMembersApi.js';
import { isSupabaseConfigured } from '../lib/supabaseClient.js';
import { fabFixedPlacementSx, fabScrollClearanceSx } from '../core/fabPlacement.js';
import FabPortal from '../core/FabPortal.jsx';
import SwipeableDeleteList from '../components/SwipeableDeleteList.jsx';

export default function GroupsPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobileSwipe = useMediaQuery(theme.breakpoints.down('md'));
  const { groups, addGroup, deleteGroup, getGroupSnapshot, restoreGroup } = useGroups();
  const { data, reloadFromServer } = useGroupsData();
  const { user, profile } = useAuth();
  const { ask, confirmDialog } = useConfirmDialog();
  const [convertedTotals, setConvertedTotals] = useState({});
  const [totalsLoading, setTotalsLoading] = useState(true);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setTotalsLoading(true);
    (async () => {
      const next = await convertGroupTotals(data.groups || {});
      if (cancelled) return;
      setConvertedTotals(next);
      setTotalsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [data.groups]);
  const { EditTextModal, showEditTextModal } = useEditTextModal();
  const [searchQuery, setSearchQuery] = useState('');
  const [undoDelete, setUndoDelete] = useState(null);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);

  const sorted = useMemo(
    () => [...groups].sort((a, b) => b.date - a.date),
    [groups],
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((g) => g.name.toLowerCase().includes(q));
  }, [sorted, searchQuery]);

  const fxFailed = useMemo(
    () =>
      groupListFxFailed({
        fxReady: !totalsLoading,
        groups: sorted,
        convertedTotals,
      }),
    [totalsLoading, sorted, convertedTotals],
  );

  const handleCreate = (name) => {
    if (!name.trim()) return;
    const id = addGroup(name.trim(), {
      initialPeople: getDefaultPeopleMapForNewGroup(user, profile),
    });
    if (id) navigate(`/groups/${id}/people`, { state: { showJoinQr: true } });
  };

  const openNewGroup = () => {
    setSpeedDialOpen(false);
    showEditTextModal({
      value: '',
      setValue: handleCreate,
      title: 'New group',
    });
  };

  const handleSwipeDeleteGroup = useCallback(
    async (g) => {
      if (isSupabaseConfigured() && !canDeleteGroup(g.membershipRole)) {
        const ok = await ask({
          title: 'Leave group?',
          message: `You will lose access to "${g.name}" unless its owner adds you again.`,
          confirmText: 'Leave group',
          destructive: true,
        });
        if (!ok) return;
        try {
          await leaveGroup(g.id);
          await reloadFromServer();
        } catch (error) {
          console.error('Could not leave group:', error);
          setActionError(error?.message || 'Could not leave the group.');
        }
        return;
      }

      const snapshot = getGroupSnapshot(g.id);
      deleteGroup(g.id);
      setUndoDelete({
        id: g.id,
        snapshot,
        label: g.name,
      });
    },
    [ask, deleteGroup, getGroupSnapshot, reloadFromServer],
  );

  const handleUndoGroupDelete = useCallback(() => {
    if (undoDelete?.snapshot) {
      restoreGroup(undoDelete.id, undoDelete.snapshot);
    }
    setUndoDelete(null);
  }, [undoDelete, restoreGroup]);

  const groupRow = (g) => {
    const listBadge = groupListBadge(g.membershipRole, g.ownerUserId, user?.id);
    const isSharedBadge = listBadge === 'shared';

    return (
    <ListItemButton
      onClick={() => navigate(`/groups/${g.id}/receipts`)}
      sx={{ py: 1.5, px: 2 }}
    >
      <ListItemIcon sx={{ minWidth: 40 }}>
        <FolderSharedIcon color="primary" />
      </ListItemIcon>
      <ListItemText
        primary={<Typography fontWeight={600}>{g.name}</Typography>}
        secondaryTypographyProps={{ component: 'div' }}
        secondary={
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              alignItems: 'center',
              mt: 0.5,
              flexWrap: 'wrap',
            }}
          >
            <Chip
              label={isSharedBadge ? 'Shared' : 'Owned'}
              size="small"
              color={isSharedBadge ? 'secondary' : 'primary'}
              sx={{ height: 22, fontSize: '0.72rem' }}
            />
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
        sx={{ ml: 2, whiteSpace: 'nowrap', minWidth: 72, textAlign: 'right' }}
      >
        {totalsLoading ? (
          <CircularProgress size={16} />
        ) : (
          groupListTotalDisplay({
            convertedTotal: convertedTotals[g.id],
            totalSpent: g.totalSpent,
            displayCurrency: g.displayCurrency || 'USD',
          })
        )}
      </Typography>
    </ListItemButton>
    );
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 4 } }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Groups
      </Typography>

      {fxFailed ? (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          {GROUP_TOTAL_FX_FAILED_COPY}
        </Alert>
      ) : null}

      {sorted.length === 0 ? (
        <Paper
          sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}
          elevation={0}
          variant="outlined"
        >
          <FolderSharedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            No groups yet. Tap + to create one or scan a QR.
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
          {isMobileSwipe ? (
            <SwipeableDeleteList
              items={filtered}
              getKey={(g) => g.id}
              onDelete={handleSwipeDeleteGroup}
              getActionLabel={(g) =>
                isSupabaseConfigured() && !canDeleteGroup(g.membershipRole)
                  ? 'Leave'
                  : 'Delete'
              }
            >
              {(g) => (
                <ListItem disablePadding sx={{ display: 'block' }}>
                  {groupRow(g)}
                </ListItem>
              )}
            </SwipeableDeleteList>
          ) : (
            <List disablePadding>
              {filtered.map((g, idx) => (
                <Box key={g.id}>
                  {idx > 0 && <Divider />}
                  <ListItem disablePadding>{groupRow(g)}</ListItem>
                </Box>
              ))}
            </List>
          )}
        </Paper>
          )}
        </>
      )}

      <Box aria-hidden sx={fabScrollClearanceSx} />

      <FabPortal>
        <SpeedDial
          ariaLabel="Add group or scan QR"
          sx={fabFixedPlacementSx}
          icon={<SpeedDialIcon />}
          open={speedDialOpen}
          onOpen={() => setSpeedDialOpen(true)}
          onClose={() => setSpeedDialOpen(false)}
        >
          <SpeedDialAction
            icon={<AddIcon />}
            tooltipTitle="New group"
            tooltipOpen
            onClick={openNewGroup}
          />
          <SpeedDialAction
            icon={<QrCodeScannerIcon />}
            tooltipTitle="Scan QR"
            tooltipOpen
            onClick={() => {
              setSpeedDialOpen(false);
              navigate('/scan');
            }}
          />
        </SpeedDial>
      </FabPortal>

      {EditTextModal}
      {confirmDialog}

      <Snackbar
        open={!!undoDelete}
        autoHideDuration={7000}
        onClose={(_, reason) => {
          if (reason === 'clickaway') return;
          setUndoDelete(null);
        }}
        message={
          undoDelete
            ? `Removed "${undoDelete.label}"`
            : ''
        }
        action={
          <Button color="secondary" size="small" onClick={handleUndoGroupDelete}>
            Undo
          </Button>
        }
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          bottom: { xs: 'calc(16px + env(safe-area-inset-bottom, 0px))', sm: 24 },
        }}
      />
      <Snackbar
        open={!!actionError}
        autoHideDuration={7000}
        onClose={() => setActionError('')}
        message={actionError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Container>
  );
}
