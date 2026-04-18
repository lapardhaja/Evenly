import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import IconButton from '@mui/material/IconButton';
import ButtonBase from '@mui/material/ButtonBase';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import useEditTextModal from '../components/useEditTextModal.jsx';
import { useConfirmDialog } from '../components/useConfirmDialog.jsx';
import { useGroup, useGroups } from '../hooks/useGroupData.js';
import GroupReceiptsTab from './GroupReceiptsTab.jsx';
import GroupPeopleTab from './GroupPeopleTab.jsx';
import GroupSettleTab from './GroupSettleTab.jsx';

const TABS = ['people', 'receipts', 'settle'];

export default function GroupDetailPage() {
  const { groupId, tab } = useParams();
  const navigate = useNavigate();
  const groupData = useGroup(groupId);
  const { deleteGroup } = useGroups();
  const { group, renameGroup } = groupData;
  const { EditTextModal, showEditTextModal } = useEditTextModal();
  const { ask, confirmDialog } = useConfirmDialog();

  // Default tab when URL has no :tab — Receipts (People only right after "create group")
  const currentTab = TABS.indexOf(tab) >= 0 ? TABS.indexOf(tab) : 1;

  useEffect(() => {
    if (!groupId) return;
    if (!tab || TABS.indexOf(tab) < 0) {
      navigate(`/groups/${groupId}/receipts`, { replace: true });
    }
  }, [groupId, tab, navigate]);

  if (!group) {
    return (
      <Container maxWidth="sm" sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Group not found.</Typography>
      </Container>
    );
  }

  const handleDelete = async () => {
    const ok = await ask({
      title: 'Delete group?',
      message: 'This removes the group and all its receipts. This can’t be undone.',
      confirmText: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    deleteGroup(groupId);
    navigate('/');
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 1, sm: 3 }, px: { xs: 1, sm: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <IconButton onClick={() => navigate('/')} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ButtonBase
            onClick={() =>
              showEditTextModal({
                setValue: renameGroup,
                title: 'Rename Group',
                value: group.name,
              })
            }
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
              sx={{ maxWidth: { xs: '55vw', sm: 'none' } }}
            >
              {group.name}
            </Typography>
          </ButtonBase>
        </Box>
        <IconButton onClick={handleDelete} size="small" color="error">
          <DeleteOutlineIcon />
        </IconButton>
      </Box>

      <Tabs
        value={currentTab}
        onChange={(_, v) => navigate(`/groups/${groupId}/${TABS[v]}`)}
        indicatorColor="primary"
        textColor="primary"
        centered
        sx={{ mb: { xs: 1, sm: 2 } }}
      >
        {TABS.map((t) => (
          <Tab key={t} label={t.charAt(0).toUpperCase() + t.slice(1)} />
        ))}
      </Tabs>

      {currentTab === 0 && <GroupPeopleTab groupData={groupData} />}
      {currentTab === 1 && <GroupReceiptsTab groupId={groupId} groupData={groupData} />}
      {currentTab === 2 && <GroupSettleTab groupId={groupId} groupData={groupData} />}

      {EditTextModal}
      {confirmDialog}
    </Container>
  );
}
