import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import IconButton from '@mui/material/IconButton';
import ButtonBase from '@mui/material/ButtonBase';
import Snackbar from '@mui/material/Snackbar';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import useEditTextModal from '../components/useEditTextModal.jsx';
import { useConfirmDialog } from '../components/useConfirmDialog.jsx';
import { useGroup, useGroups } from '../hooks/useGroupData.js';
import { useGroupsData } from '../context/GroupsDataContext.jsx';
import { canDeleteGroup } from '../lib/groupMembership.js';
import { leaveGroup } from '../lib/groupMembersApi.js';
import GroupReceiptsTab from './GroupReceiptsTab.jsx';
import GroupPeopleTab from './GroupPeopleTab.jsx';
import GroupSettleTab from './GroupSettleTab.jsx';
import GroupChatTab from './GroupChatTab.jsx';
import { isSupabaseConfigured } from '../lib/supabaseClient.js';
import { chatThreadPageSx } from '../lib/appShell.js';

const TABS = isSupabaseConfigured()
  ? ['people', 'receipts', 'settle', 'chat']
  : ['people', 'receipts', 'settle'];

export default function GroupDetailPage() {
  const { groupId, tab } = useParams();
  const navigate = useNavigate();
  const groupData = useGroup(groupId);
  const { deleteGroup } = useGroups();
  const { reloadFromServer } = useGroupsData();
  const { group, renameGroup } = groupData;
  const { EditTextModal, showEditTextModal } = useEditTextModal();
  const { ask, confirmDialog } = useConfirmDialog();
  const [actionError, setActionError] = useState('');

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
    if (isSupabaseConfigured() && !canDeleteGroup(group.membershipRole)) {
      const ok = await ask({
        title: 'Leave group?',
        message: `You will lose access to "${group.name}" unless its owner adds you again.`,
        confirmText: 'Leave group',
        destructive: true,
      });
      if (!ok) return;
      try {
        await leaveGroup(groupId);
        await reloadFromServer();
        navigate('/');
      } catch (error) {
        console.error('Could not leave group:', error);
        setActionError(error?.message || 'Could not leave the group.');
      }
      return;
    }

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
  const isCloudMember =
    isSupabaseConfigured() && !canDeleteGroup(group.membershipRole);

  return (
    <Container
      maxWidth="md"
      sx={
        TABS[currentTab] === 'chat'
          ? { ...chatThreadPageSx, py: { xs: 1, sm: 3 }, px: { xs: 1, sm: 3 } }
          : { py: { xs: 1, sm: 3 }, px: { xs: 1, sm: 3 } }
      }
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexShrink: 0 }}>
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
        <IconButton
          onClick={handleDelete}
          size="small"
          color="error"
          aria-label={isCloudMember ? 'Leave group' : 'Delete group'}
        >
          {isCloudMember ? <ExitToAppIcon /> : <DeleteOutlineIcon />}
        </IconButton>
      </Box>

      <Tabs
        value={currentTab}
        onChange={(_, v) => navigate(`/groups/${groupId}/${TABS[v]}`)}
        indicatorColor="primary"
        textColor="primary"
        centered
        sx={{ mb: { xs: 1, sm: 2 }, flexShrink: 0 }}
      >
        {TABS.map((t) => (
          <Tab key={t} label={t.charAt(0).toUpperCase() + t.slice(1)} />
        ))}
      </Tabs>

      {currentTab === 0 && <GroupPeopleTab groupData={groupData} />}
      {currentTab === 1 && <GroupReceiptsTab groupId={groupId} groupData={groupData} />}
      {currentTab === 2 && <GroupSettleTab groupId={groupId} groupData={groupData} />}
      {TABS[currentTab] === 'chat' && (
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <GroupChatTab groupId={groupId} groupData={groupData} />
        </Box>
      )}

      {EditTextModal}
      {confirmDialog}
      <Snackbar
        open={!!actionError}
        autoHideDuration={7000}
        onClose={() => setActionError('')}
        message={actionError}
      />
    </Container>
  );
}
