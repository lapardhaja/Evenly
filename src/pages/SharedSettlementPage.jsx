import { useMemo } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { nameToInitials } from '../functions/utils.js';
import { parseSettlementShareToken } from '../lib/settlementShareLink.js';
import { formatMoneyWithCode } from '../lib/currencies.js';

export default function SharedSettlementPage() {
  const { token } = useParams();

  const parsed = useMemo(() => parseSettlementShareToken(token), [token]);

  if (!parsed.ok) {
    return (
      <Container maxWidth="sm" sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Link couldn’t be opened
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Get a new Share Cost Evenly link.
        </Typography>
        <Button component={RouterLink} to="/" variant="contained">
          Open Evenly
        </Button>
      </Container>
    );
  }

  const { groupName, note, warnings, transfers, currencyCode } = parsed.data;
  const title = groupName || 'Settle up';
  const fmt = (amount) => formatMoneyWithCode(amount, currencyCode || 'USD');

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" fontWeight={800} gutterBottom>
        {title}
      </Typography>

      {note ? (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {note}
          </Typography>
        </Paper>
      ) : null}

      {warnings.length > 0 ? (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          {warnings.map((w) => (
            <Typography key={w} variant="body2" display="block">
              {w}
            </Typography>
          ))}
        </Alert>
      ) : null}

      {transfers.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
          <Typography color="text.secondary">Everyone is settled up!</Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <List disablePadding>
            {transfers.map((row, idx) => (
              <Box key={`${row.from}-${row.to}-${row.cents}-${idx}`}>
                {idx > 0 && <Divider />}
                <ListItem sx={{ py: 2, flexWrap: 'wrap', gap: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      flexWrap: 'wrap',
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <Avatar sx={{ bgcolor: 'error.main', width: 36, height: 36, fontSize: '0.85rem' }}>
                      {nameToInitials(row.from)}
                    </Avatar>
                    <Typography fontWeight={700} sx={{ maxWidth: 140 }} noWrap title={row.from}>
                      {row.from}
                    </Typography>
                    <ArrowForwardIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Avatar sx={{ bgcolor: 'success.main', width: 36, height: 36, fontSize: '0.85rem' }}>
                      {nameToInitials(row.to)}
                    </Avatar>
                    <Typography fontWeight={700} sx={{ maxWidth: 140 }} noWrap title={row.to}>
                      {row.to}
                    </Typography>
                  </Box>
                  <Chip
                    label={fmt(row.cents / 100)}
                    color="primary"
                    sx={{ fontWeight: 800 }}
                  />
                </ListItem>
              </Box>
            ))}
          </List>
        </Paper>
      )}

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button component={RouterLink} to="/" variant="outlined" size="large">
          Open Evenly
        </Button>
      </Box>
    </Container>
  );
}
