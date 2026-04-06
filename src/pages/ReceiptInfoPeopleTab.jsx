import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import InfoIcon from '@mui/icons-material/Info';
import { nameToInitials } from '../functions/utils.js';

export default function ReceiptInfoPeopleTab({ receiptData, isGroupReceipt }) {
  const { people } = receiptData;

  return (
    <Box>
      {isGroupReceipt && (
        <Alert
          severity="info"
          icon={<InfoIcon />}
          sx={{ mb: 2, borderRadius: 2 }}
        >
          People are managed at the group level. Go back and use the
          People tab on the group to add or remove people.
        </Alert>
      )}

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <List disablePadding>
          {people.map((person) => (
            <ListItem key={person.id} sx={{ py: 1.5 }}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                  {nameToInitials(person.name)}
                </Avatar>
              </ListItemAvatar>
              <Typography fontWeight={500}>{person.name}</Typography>
            </ListItem>
          ))}

          {people.length === 0 && (
            <ListItem>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ py: 3, width: '100%', textAlign: 'center' }}
              >
                No people in this group yet.
              </Typography>
            </ListItem>
          )}
        </List>
      </Paper>
    </Box>
  );
}
