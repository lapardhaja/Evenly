import { useRef, useState, useEffect, useCallback } from 'react';
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
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import { nameToInitials } from '../functions/utils.js';
import useEditTextModal from '../components/useEditTextModal.jsx';
import { useConfirmDialog } from '../components/useConfirmDialog.jsx';
import { isSupabaseConfigured } from '../lib/supabaseClient.js';
import { listFriends } from '../lib/friendsApi.js';

export default function GroupPeopleTab({ groupData }) {
  const { people, addPerson, updatePerson, removePerson } = groupData;
  const { EditTextModal, showEditTextModal } = useEditTextModal();
  const { ask, confirmDialog } = useConfirmDialog();
  const newPersonRef = useRef(null);
  const [friendsMenuAnchor, setFriendsMenuAnchor] = useState(null);
  const [friendsList, setFriendsList] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);

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
    if (friendsMenuAnchor) loadFriends();
  }, [friendsMenuAnchor, loadFriends]);

  const linkedIds = new Set(people.map((p) => p.linkedUserId).filter(Boolean));

  const handleAddPerson = () => {
    const name = newPersonRef.current?.value?.trim();
    if (!name) return;
    addPerson(name);
    newPersonRef.current.value = '';
    newPersonRef.current.focus();
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        People added here are shared across all receipts in this group.
      </Typography>

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <List disablePadding>
          {people.map((person) => (
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
                {person.linkedUserId ? (
                  <Typography variant="caption" color="text.secondary">
                    Friend account
                  </Typography>
                ) : null}
              </ButtonBase>
            </ListItem>
          ))}

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

      <Box sx={{ display: 'flex', gap: 1, mt: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <PersonAddIcon color="action" sx={{ display: { xs: 'none', sm: 'block' } }} />
        <TextField
          inputRef={newPersonRef}
          placeholder="Person name"
          size="small"
          fullWidth
          sx={{ flex: '1 1 160px' }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddPerson();
          }}
          variant="outlined"
        />
        <Button variant="contained" onClick={handleAddPerson} sx={{ whiteSpace: 'nowrap' }}>
          Add
        </Button>
        {isSupabaseConfigured() ? (
          <>
            <Button
              variant="outlined"
              startIcon={<GroupAddIcon />}
              onClick={(e) => setFriendsMenuAnchor(e.currentTarget)}
              sx={{ whiteSpace: 'nowrap' }}
            >
              From friends
            </Button>
            <Menu
              anchorEl={friendsMenuAnchor}
              open={Boolean(friendsMenuAnchor)}
              onClose={() => setFriendsMenuAnchor(null)}
            >
              {friendsLoading ? (
                <MenuItem disabled>Loading…</MenuItem>
              ) : friendsList.length === 0 ? (
                <MenuItem disabled onClick={() => {}}>
                  No friends yet — add some under Friends in the menu
                </MenuItem>
              ) : (
                friendsList.map((f) => (
                  <MenuItem
                    key={f.user_id}
                    disabled={linkedIds.has(f.user_id)}
                    onClick={() => {
                      const label = f.display_name || f.username || 'Friend';
                      addPerson(label, { linkedUserId: f.user_id });
                      setFriendsMenuAnchor(null);
                    }}
                  >
                    {f.username ? `@${f.username}` : f.display_name}
                    {linkedIds.has(f.user_id) ? ' (already in group)' : ''}
                  </MenuItem>
                ))
              )}
            </Menu>
          </>
        ) : null}
      </Box>

      {EditTextModal}
      {confirmDialog}
    </Box>
  );
}
