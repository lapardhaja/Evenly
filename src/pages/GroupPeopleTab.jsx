import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import ListItemText from '@mui/material/ListItemText';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import { nameToInitials } from '../functions/utils.js';
import useEditTextModal from '../components/useEditTextModal.jsx';
import { useConfirmDialog } from '../components/useConfirmDialog.jsx';
import { useGroupsData } from '../context/GroupsDataContext.jsx';
import { isSupabaseConfigured } from '../lib/supabaseClient.js';
import { formatFullName, listFriends } from '../lib/friendsApi.js';
import { addFriendToGroup } from '../lib/groupMembersApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { personRowCaption } from '../lib/defaultGroupPeople.js';

function friendLabel(f) {
  return formatFullName(f) || f.username || f.display_name || 'Friend';
}

export default function GroupPeopleTab({ groupData }) {
  const { group, people, addPerson, updatePerson, removePerson } = groupData;
  const { reloadFromServer } = useGroupsData();
  const { user } = useAuth();
  const { EditTextModal, showEditTextModal } = useEditTextModal();
  const { ask, confirmDialog } = useConfirmDialog();
  const newPersonRef = useRef(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [friendsList, setFriendsList] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendFilter, setFriendFilter] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [addingId, setAddingId] = useState('');

  const loadFriends = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    setFriendsLoading(true);
    try {
      const f = await listFriends();
      setFriendsList(f);
    } catch {
      setFriendsList([]);
    } finally {
      setFriendsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (inviteOpen) {
      setFriendFilter('');
      loadFriends();
    }
  }, [inviteOpen, loadFriends]);

  const linkedIds = new Set(people.map((p) => p.linkedUserId).filter(Boolean));

  const filteredFriends = useMemo(() => {
    const q = friendFilter.trim().toLowerCase();
    if (!q) return friendsList;
    return friendsList.filter((f) => {
      const blob = `${f.username || ''} ${f.display_name || ''} ${f.first_name || ''} ${f.last_name || ''}`.toLowerCase();
      return blob.includes(q);
    });
  }, [friendsList, friendFilter]);

  const handleAddPerson = () => {
    const name = newPersonRef.current?.value?.trim();
    if (!name) return;
    addPerson(name);
    newPersonRef.current.value = '';
    newPersonRef.current.focus();
  };

  const handleInvite = async (f) => {
    setAddingId(f.user_id);
    setInviteError('');
    try {
      if (isSupabaseConfigured()) {
        await addFriendToGroup(group.id, f.user_id);
        await reloadFromServer();
      } else {
        addPerson(friendLabel(f), { linkedUserId: f.user_id });
      }
      setInviteOpen(false);
    } catch (e) {
      setInviteError(e?.message || 'Couldn’t add them to the group.');
    } finally {
      setAddingId('');
    }
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Split people are shared across every receipt. Invite an Evenly friend so they can see this
        group — or add a name-only guest for someone without an account.
      </Typography>

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <List disablePadding>
          {people.map((person) => {
            const caption = personRowCaption(person, user?.id);
            return (
            <ListItem
              key={person.id}
              secondaryAction={
                <IconButton
                  edge="end"
                  color="error"
                  onClick={async () => {
                    const ok = await ask({
                      title: 'Remove person?',
                      message: `${person.name} will be removed from every receipt in this group.`,
                      confirmText: 'Remove',
                      destructive: true,
                    });
                    if (ok) removePerson(person.id);
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              }
              sx={{ py: 1.5 }}
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                  {nameToInitials(person.name)}
                </Avatar>
              </ListItemAvatar>
              <ButtonBase
                onClick={() =>
                  showEditTextModal({
                    title: 'Edit Person',
                    value: person.name,
                    setValue: (value) => updatePerson({ ...person, name: value }),
                  })
                }
                sx={{ borderRadius: 1, px: 1, py: 0.5, alignItems: 'flex-start', flexDirection: 'column' }}
              >
                <Typography fontWeight={500}>{person.name}</Typography>
                {caption ? (
                  <Typography variant="caption" color="text.secondary">
                    {caption}
                  </Typography>
                ) : null}
              </ButtonBase>
            </ListItem>
            );
          })}

          {people.length === 0 && (
            <ListItem>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ py: 3, width: '100%', textAlign: 'center' }}
              >
                No people added yet.
              </Typography>
            </ListItem>
          )}
        </List>
      </Paper>

      <Box sx={{ display: 'flex', gap: 1, mt: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 220px', minWidth: 0 }}>
          <TextField
            inputRef={newPersonRef}
            placeholder="Guest name (no account)"
            size="small"
            fullWidth
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddPerson();
            }}
            variant="outlined"
            helperText="Won’t get the group in their Evenly — just a split label."
          />
        </Box>
        <Button variant="outlined" onClick={handleAddPerson} sx={{ whiteSpace: 'nowrap', mt: 0.25 }}>
          Add name
        </Button>
        {isSupabaseConfigured() ? (
          <Button
            variant="contained"
            startIcon={<GroupAddIcon />}
            onClick={() => {
              setInviteError('');
              setInviteOpen(true);
            }}
            sx={{ whiteSpace: 'nowrap', mt: 0.25 }}
          >
            Invite friend
          </Button>
        ) : null}
      </Box>

      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Invite a friend to this group</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            They must already be your Evenly friend. That adds them as a member so they can see
            receipts and chat.
          </Typography>
          <TextField
            size="small"
            fullWidth
            placeholder="Filter friends"
            value={friendFilter}
            onChange={(e) => setFriendFilter(e.target.value)}
            sx={{ mb: 1 }}
          />
          {inviteError ? (
            <Alert severity="error" sx={{ mb: 1 }} onClose={() => setInviteError('')}>
              {inviteError}
            </Alert>
          ) : null}
          {friendsLoading ? (
            <Typography color="text.secondary">Loading…</Typography>
          ) : friendsList.length === 0 ? (
            <Typography color="text.secondary">
              No friends yet. Open Friends (person icon, top right), search them, and tap Add
              friend.
            </Typography>
          ) : filteredFriends.length === 0 ? (
            <Typography color="text.secondary">No friends match that filter.</Typography>
          ) : (
            <List disablePadding>
              {filteredFriends.map((f, i) => {
                const label = friendLabel(f);
                const inGroup = linkedIds.has(f.user_id);
                return (
                  <Box key={f.user_id}>
                    {i > 0 ? <Divider /> : null}
                    <ListItem
                      secondaryAction={
                        inGroup ? (
                          <Typography variant="caption" color="text.secondary">
                            Already in group
                          </Typography>
                        ) : (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<PersonAddIcon />}
                            disabled={addingId === f.user_id}
                            onClick={() => handleInvite(f)}
                          >
                            Add
                          </Button>
                        )
                      }
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>{nameToInitials(label)}</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={label}
                        secondary={f.username ? `@${f.username}` : null}
                      />
                    </ListItem>
                  </Box>
                );
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {EditTextModal}
      {confirmDialog}
    </Box>
  );
}
