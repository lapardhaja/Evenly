import { useNavigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import HomeBalancesCard from '../components/HomeBalancesCard.jsx';
import { useHomeBalances } from '../hooks/useHomeBalances.js';
import { useGroups } from '../hooks/useGroupData.js';
import { useGroupsData } from '../context/GroupsDataContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function HomePage() {
  const navigate = useNavigate();
  const { groups } = useGroups();
  const { data } = useGroupsData();
  const { user } = useAuth();
  const { summary: homeSummary, fxFailed: homeFxFailed } = useHomeBalances(
    data.groups,
    user?.id,
  );

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 4 } }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Home
      </Typography>

      {homeFxFailed && homeSummary?.visible ? (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          Some amounts couldn’t be converted, so they may mix currencies.
        </Alert>
      ) : null}

      {homeSummary?.visible ? (
        <HomeBalancesCard
          summary={homeSummary}
          onOpenGroup={(id) => navigate(`/groups/${id}/settle`)}
        />
      ) : (
        <Paper
          sx={{ p: 4, textAlign: 'center', borderRadius: 3, mb: 2 }}
          elevation={0}
          variant="outlined"
        >
          <Typography fontWeight={700} sx={{ mb: 1 }}>
            {groups.length === 0 ? 'No groups yet' : 'All settled'}
          </Typography>
          <Typography color="text.secondary">
            {groups.length === 0
              ? 'Create a group or scan a QR to start splitting.'
              : 'Nobody owes anyone right now.'}
          </Typography>
        </Paper>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button variant="outlined" onClick={() => navigate('/groups')}>
          Your groups
        </Button>
      </Box>
    </Container>
  );
}
