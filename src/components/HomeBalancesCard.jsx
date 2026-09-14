import { useState } from 'react';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import Collapse from '@mui/material/Collapse';
import { nameToInitials } from '../functions/utils.js';
import { formatMoneyWithCode } from '../lib/currencies.js';

export default function HomeBalancesCard({ summary, onOpenGroup }) {
  const [openKey, setOpenKey] = useState('');
  if (!summary?.visible) return null;

  const code = summary.currency;
  const even = summary.rows.length === 0;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', mb: 2 }}>
      {even ? (
        <Box sx={{ px: 2, py: 2 }}>
          <Typography fontWeight={700}>{"You're even"}</Typography>
          <Typography variant="body2" color="text.secondary">
            No open IOUs across your groups.
          </Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ display: 'flex', px: 2, py: 2, gap: 2 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary">
                {"You're owed"}
              </Typography>
              <Typography variant="h6" fontWeight={700} color="success.main">
                {formatMoneyWithCode(summary.owedToMe, code)}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary">
                You owe
              </Typography>
              <Typography variant="h6" fontWeight={700} color="error.main">
                {formatMoneyWithCode(summary.iOwe, code)}
              </Typography>
            </Box>
          </Box>
          <Divider />
          <List disablePadding>
            {summary.rows.map((row, idx) => {
              const owesYou = row.amount > 0;
              const money = formatMoneyWithCode(Math.abs(row.amount), code);
              const primary = owesYou
                ? `${row.name} owes you ${money}`
                : `You owe ${row.name} ${money}`;
              const multi = row.groups.length > 1;
              const expanded = openKey === row.key;
              return (
                <Box key={row.key}>
                  {idx > 0 ? <Divider /> : null}
                  <ListItemButton
                    onClick={() => {
                      if (multi) {
                        setOpenKey(expanded ? '' : row.key);
                        return;
                      }
                      const gid = row.groups[0]?.groupId;
                      if (gid) onOpenGroup?.(gid);
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          bgcolor: 'primary.main',
                          width: 36,
                          height: 36,
                          fontSize: '0.85rem',
                        }}
                      >
                        {nameToInitials(row.name)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Typography fontWeight={600}>{primary}</Typography>}
                      secondary={
                        multi ? `${row.groups.length} groups` : row.groups[0]?.groupName
                      }
                    />
                  </ListItemButton>
                  <Collapse in={expanded} unmountOnExit>
                    {row.groups.map((g) => {
                      const gOwesYou = g.amount > 0;
                      const gMoney = formatMoneyWithCode(Math.abs(g.amount), code);
                      return (
                        <ListItemButton
                          key={g.groupId}
                          sx={{ pl: 9 }}
                          onClick={() => onOpenGroup?.(g.groupId)}
                        >
                          <ListItemText
                            primary={g.groupName}
                            secondary={
                              gOwesYou ? `owes you ${gMoney}` : `you owe ${gMoney}`
                            }
                          />
                        </ListItemButton>
                      );
                    })}
                  </Collapse>
                </Box>
              );
            })}
          </List>
        </>
      )}
    </Paper>
  );
}
