import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import IosShareIcon from '@mui/icons-material/IosShare';
import currency from 'currency.js';
import { nameToInitials } from '../functions/utils.js';
import { computeNetBalances, minimizeTransfers } from '../functions/settlement.js';
import SettlementShareDialog from '../components/SettlementShareDialog.jsx';

export default function GroupSettleTab({ groupId, groupData }) {
  const { group, people, receipts } = groupData;
  const [settledSet, setSettledSet] = useState(new Set());
  const [shareLinkOpen, setShareLinkOpen] = useState(false);

  const peopleMap = useMemo(() => {
    const map = {};
    people.forEach((p) => { map[p.id] = p; });
    return map;
  }, [people]);

  const netBalances = useMemo(
    () => (group ? computeNetBalances(group) : {}),
    [group],
  );

  const transfers = useMemo(
    () => minimizeTransfers(netBalances),
    [netBalances],
  );

  const missingPayers = useMemo(
    () => receipts.filter((r) => r.total > 0 && !r.paidById),
    [receipts],
  );

  const shareWarnings = useMemo(() => {
    if (missingPayers.length === 0) return [];
    if (missingPayers.length === 1) {
      return [
        `"${missingPayers[0].title || 'A receipt'}" has no payer set — totals may be off.`,
      ];
    }
    return [`${missingPayers.length} receipts have no payer set — totals may be off.`];
  }, [missingPayers]);

  const transfersForShare = useMemo(
    () =>
      transfers
        .map((t) => {
          const fromPerson = peopleMap[t.from];
          const toPerson = peopleMap[t.to];
          if (!fromPerson || !toPerson) return null;
          return {
            from: fromPerson.name,
            to: toPerson.name,
            amount: t.amount,
          };
        })
        .filter(Boolean),
    [transfers, peopleMap],
  );

  const toggleSettled = (idx) => {
    setSettledSet((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const allSettled = transfers.length > 0 && settledSet.size === transfers.length;

  if (people.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">
          Add people in the People tab first.
        </Typography>
      </Box>
    );
  }

  if (receipts.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">
          Add receipts first to see who owes whom.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {missingPayers.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          {missingPayers.length === 1
            ? `"${missingPayers[0].title}" has no payer set.`
            : `${missingPayers.length} receipts have no payer set.`}{' '}
          Set the "Paid By" on each receipt for accurate settlement.
        </Alert>
      )}

      {/* Net Balances */}
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
        Net Balances
      </Typography>
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
        <List disablePadding>
          {people.map((person, idx) => {
            const bal = netBalances[person.id] || 0;
            const isPositive = bal > 0.005;
            const isNegative = bal < -0.005;
            return (
              <Box key={person.id}>
                {idx > 0 && <Divider />}
                <ListItem sx={{ py: 1.5 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: '0.85rem' }}>
                      {nameToInitials(person.name)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography fontWeight={500}>{person.name}</Typography>
                    }
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {isPositive && (
                      <Chip
                        label={`gets back ${currency(bal).format()}`}
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    )}
                    {isNegative && (
                      <Chip
                        label={`owes ${currency(Math.abs(bal)).format()}`}
                        size="small"
                        color="error"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    )}
                    {!isPositive && !isNegative && (
                      <Chip
                        label="settled"
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    )}
                  </Box>
                </ListItem>
              </Box>
            );
          })}
        </List>
      </Paper>

      {/* Transfers */}
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
        Settle Up
      </Typography>

      <Button
        size="small"
        variant="contained"
        startIcon={<IosShareIcon />}
        onClick={() => setShareLinkOpen(true)}
        sx={{ mb: 2 }}
      >
        Share Evenly
      </Button>

      <SettlementShareDialog
        open={shareLinkOpen}
        onClose={() => setShareLinkOpen(false)}
        groupName={group?.name}
        transfers={transfersForShare}
        warnings={shareWarnings}
      />

      {transfers.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}
        >
          <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
          <Typography color="text.secondary">
            Everyone is settled up!
          </Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <List disablePadding>
            {transfers.map((t, idx) => {
              const fromPerson = peopleMap[t.from];
              const toPerson = peopleMap[t.to];
              const isSettled = settledSet.has(idx);
              if (!fromPerson || !toPerson) return null;
              return (
                <Box key={idx}>
                  {idx > 0 && <Divider />}
                  <ListItem
                    sx={{
                      py: 1.5,
                      opacity: isSettled ? 0.5 : 1,
                      transition: 'opacity 0.2s',
                    }}
                    secondaryAction={
                      <Checkbox
                        checked={isSettled}
                        onChange={() => toggleSettled(idx)}
                        icon={<AccountBalanceWalletIcon />}
                        checkedIcon={<CheckCircleIcon color="success" />}
                      />
                    }
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: { xs: 0.75, sm: 1.5 },
                        flexWrap: 'wrap',
                        pr: 4,
                      }}
                    >
                      <Avatar
                        sx={{
                          bgcolor: 'error.main',
                          width: 32,
                          height: 32,
                          fontSize: '0.75rem',
                        }}
                      >
                        {nameToInitials(fromPerson.name)}
                      </Avatar>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        sx={{
                          maxWidth: { xs: 60, sm: 'none' },
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {fromPerson.name}
                      </Typography>
                      <ArrowForwardIcon
                        sx={{ fontSize: 16, color: 'text.secondary' }}
                      />
                      <Avatar
                        sx={{
                          bgcolor: 'success.main',
                          width: 32,
                          height: 32,
                          fontSize: '0.75rem',
                        }}
                      >
                        {nameToInitials(toPerson.name)}
                      </Avatar>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        sx={{
                          maxWidth: { xs: 60, sm: 'none' },
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {toPerson.name}
                      </Typography>
                      <Chip
                        label={currency(t.amount).format()}
                        size="small"
                        color="primary"
                        sx={{ fontWeight: 700 }}
                      />
                    </Box>
                  </ListItem>
                </Box>
              );
            })}
          </List>
        </Paper>
      )}

      {allSettled && (
        <Alert
          severity="success"
          icon={<CheckCircleIcon />}
          sx={{ mt: 2, borderRadius: 2 }}
        >
          All transfers marked as settled!
        </Alert>
      )}
    </Box>
  );
}
