import { useRef } from 'react';
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
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { nameToInitials } from '../functions/utils.js';
import useEditTextModal from '../components/useEditTextModal.jsx';

export default function GroupPeopleTab({ groupData }) {
  const { people, addPerson, updatePerson, removePerson } = groupData;
  const { EditTextModal, showEditTextModal } = useEditTextModal();
  const newPersonRef = useRef(null);

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
                  onClick={() => {
                    if (window.confirm(`Remove ${person.name}? They'll be removed from all receipts in this group.`))
                      removePerson(person.id);
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
                sx={{ borderRadius: 1, px: 1, py: 0.5 }}
              >
                <Typography fontWeight={500}>{person.name}</Typography>
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

      <Box sx={{ display: 'flex', gap: 1, mt: 2, alignItems: 'center' }}>
        <PersonAddIcon color="action" />
        <TextField
          inputRef={newPersonRef}
          placeholder="Person name"
          size="small"
          fullWidth
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddPerson();
          }}
          variant="outlined"
        />
        <Button variant="contained" onClick={handleAddPerson} sx={{ whiteSpace: 'nowrap' }}>
          Add
        </Button>
      </Box>

      {EditTextModal}
    </Box>
  );
}
