import { useMemo, useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
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
import CurrencyAutocomplete from '../components/CurrencyAutocomplete.jsx';
import {
  getUsdRatesTable,
  conversionFactorFromUsdRates,
  formatMoneyWithCode,
  normalizeCurrencyCode,
} from '../lib/currencies.js';
import { listReceiptsCurrencyMeta, scaleGroupMoneyForDisplay } from '../lib/settlementCurrency.js';

function transferStorageKey(t) {
  return `${t.from}-${t.to}-${t.amount}`;
}

export default function GroupSettleTab({ groupId, groupData }) {
  const { group, people, receipts, displayCurrency, setDisplayCurrency } = groupData;
  const storageKey = `evenly-settled-${groupId}`;
  const [settledKeys, setSettledKeys] = useState(() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(`evenly-settled-${groupId}`) : null;
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(`evenly-settled-${groupId}`) : null;
      const arr = raw ? JSON.parse(raw) : [];
      setSettledKeys(new Set(Array.isArray(arr) ? arr : []));
    } catch {
      setSettledKeys(new Set());
    }
  }, [groupId]);
  const [shareLinkOpen, setShareLinkOpen] = useState(false);
  const [fxLoading, setFxLoading] = useState(false);
  const [fxError, setFxError] = useState('');
  const [receiptFactors, setReceiptFactors] = useState({});

  const peopleMap = useMemo(() => {
    const map = {};
    people.forEach((p) => { map[p.id] = p; });
    return map;
  }, [people]);

  const settleCode = normalizeCurrencyCode(displayCurrency || 'USD');

  useEffect(() => {
    if (!group?.receipts) {
      setReceiptFactors({});
      return undefined;
    }
    const target = settleCode;
    const meta = listReceiptsCurrencyMeta(group);
    if (meta.length === 0) {
      setReceiptFactors({});
      return undefined;
    }

    let cancelled = false;
    setFxLoading(true);
    setFxError('');

    (async () => {
      const factors = {};
      const failed = [];
      const rates = await getUsdRatesTable();
      if (cancelled) return;
      if (!rates) {
        for (const row of meta) {
          factors[row.id] = 1;
          failed.push(row.id);
        }
        setReceiptFactors(factors);
        setFxError('Couldn’t load exchange rates. Check your connection and try again.');
        setFxLoading(false);
        return;
      }
      for (const row of meta) {
        const from = normalizeCurrencyCode(row.currencyCode);
        const rate = conversionFactorFromUsdRates(rates, from, target);
        if (rate == null || !Number.isFinite(rate) || rate <= 0) {
          factors[row.id] = 1;
          failed.push(row.id);
        } else {
          factors[row.id] = rate;
        }
      }
      if (!cancelled) {
        setReceiptFactors(factors);
        if (failed.length > 0) {
          setFxError(
            'Some currencies couldn’t be converted — those receipts show original amounts.',
          );
        }
        setFxLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [group, settleCode]);

  const scaledGroup = useMemo(
    () => (group ? scaleGroupMoneyForDisplay(group, receiptFactors) : null),
    [group, receiptFactors],
  );

  const netBalances = useMemo(
    () => (scaledGroup ? computeNetBalances(scaledGroup) : {}),
    [scaledGroup],
  );

  const transfers = useMemo(
    () => minimizeTransfers(netBalances),
    [netBalances],
  );

  useEffect(() => {
    const valid = new Set(transfers.map((t) => transferStorageKey(t)));
    setSettledKeys((prev) => {
      const next = new Set();
      for (const k of prev) {
        if (valid.has(k)) next.add(k);
      }
      if (next.size === prev.size && [...prev].every((k) => next.has(k))) {
        return prev;
      }
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [transfers, storageKey]);

  const persistSettledKeys = useCallback(
    (nextSet) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify([...nextSet]));
      } catch {
        /* ignore */
      }
    },
    [storageKey],
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

  const fmt = (amount) => formatMoneyWithCode(amount, settleCode);

  const toggleSettled = (t) => {
    const k = transferStorageKey(t);
    setSettledKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      persistSettledKeys(next);
      return next;
    });
  };

  const allSettled =
    transfers.length > 0 &&
    transfers.every((t) => settledKeys.has(transferStorageKey(t)));

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

      <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
        <CurrencyAutocomplete
          id="settle-display-currency"
          label="Show amounts in"
          value={settleCode}
          onChange={setDisplayCurrency}
          variant="outlined"
          size="small"
          sx={{ minWidth: { xs: '100%', sm: 300 }, maxWidth: 400 }}
        />
        {fxLoading && <CircularProgress size={22} />}
      </Box>
      {fxError ? (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          {fxError}
        </Alert>
      ) : null}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Rates update daily and are for reference only. Edit each receipt’s currency on its detail page if a scan guessed wrong.
      </Typography>

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
                        label={`gets back ${fmt(bal)}`}
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    )}
                    {isNegative && (
                      <Chip
                        label={`owes ${fmt(Math.abs(bal))}`}
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
        Share Cost Evenly
      </Button>

      <SettlementShareDialog
        open={shareLinkOpen}
        onClose={() => setShareLinkOpen(false)}
        groupName={group?.name}
        transfers={transfersForShare}
        warnings={shareWarnings}
        settleCurrencyCode={settleCode}
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
              const isSettled = settledKeys.has(transferStorageKey(t));
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
                        onChange={() => toggleSettled(t)}
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
                        label={fmt(t.amount)}
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
