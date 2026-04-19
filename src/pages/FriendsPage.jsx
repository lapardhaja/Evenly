import { useState, useEffect, useCallback, useMemo } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import {
  searchPeople,
  sendFriendRequest,
  listIncomingRequests,
  listOutgoingRequests,
  listFriends,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriend,
  getProfilesByIds,
  notifyFriendRequestsChanged,
  formatFullName,
} from '../lib/friendsApi.js';

export default function FriendsPage() {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [friends, setFriends] = useState([]);
  const [nameById, setNameById] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [inc, out, fr] = await Promise.all([
        listIncomingRequests(),
        listOutgoingRequests(),
        listFriends(),
      ]);
      setIncoming(inc);
      setOutgoing(out);
      setFriends(fr);
      const ids = [
        ...inc.map((x) => x.from_user_id),
        ...out.map((x) => x.to_user_id),
      ];
      const uniq = [...new Set(ids)];
      if (uniq.length) {
        const profs = await getProfilesByIds(uniq);
        const m = {};
        profs.forEach((pr) => {
          m[pr.user_id] = formatFullName(pr) || pr.username || pr.display_name || pr.user_id;
        });
        setNameById(m);
      } else {
        setNameById({});
      }
    } catch (e) {
      setError('Couldn’t load friends. If this is new, run the database migration in Supabase.');
    } finally {
      setLoading(false);
      notifyFriendRequestsChanged();
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const q = search.trim();
      if (q.length < 2) {
        setSearchResults([]);
        return;
      }
      try {
        const rows = await searchPeople(q);
        setSearchResults(rows);
      } catch {
        setSearchResults([]);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const friendIds = useMemo(() => new Set(friends.map((f) => f.user_id)), [friends]);
  const outgoingTo = useMemo(() => new Set(outgoing.map((o) => o.to_user_id)), [outgoing]);

  const displayName = (userId) => nameById[userId] || userId;

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 4 } }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
        Friends
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Search by username or full email. Send a request — they accept to become friends. Then add them to groups from the People tab.
      </Typography>

      {message ? (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>
          {message}
        </Alert>
      ) : null}
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      ) : null}

      <TextField
        fullWidth
        size="small"
        placeholder="Search username or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      {search.trim().length >= 2 && searchResults.length > 0 ? (
        <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
          <List dense>
            {searchResults.map((row) => (
              <ListItem
                key={row.user_id}
                secondaryAction={
                  friendIds.has(row.user_id) ? (
                    <Typography variant="caption" color="success.main">
                      Friends
                    </Typography>
                  ) : outgoingTo.has(row.user_id) ? (
                    <Typography variant="caption" color="text.secondary">
                      Pending
                    </Typography>
                  ) : (
                    <Button
                      size="small"
                      onClick={async () => {
                        try {
                          await sendFriendRequest(row.user_id);
                          setMessage('Request sent.');
                          loadAll();
                        } catch (e) {
                          setError(e?.message || 'Could not send request.');
                        }
                      }}
                    >
                      Request
                    </Button>
                  )
                }
              >
                <ListItemText
                  primary={
                    row.username
                      ? `@${row.username}`
                      : row.display_name || 'User'
                  }
                  secondary={(() => {
                    const full = formatFullName(row);
                    if (!full) return null;
                    const un = row.username?.trim().toLowerCase();
                    if (un && full.trim().toLowerCase() === un) return null;
                    return full;
                  })()}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      ) : null}

      {!loading && incoming.length > 0 ? (
        <>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2, mb: 1 }}>
            Requests for you
          </Typography>
          <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
            <List dense>
              {incoming.map((r) => (
                <ListItem
                  key={r.id}
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Button
                        size="small"
                        color="error"
                        onClick={async () => {
                          await declineFriendRequest(r.id);
                          loadAll();
                        }}
                      >
                        Decline
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={async () => {
                          await acceptFriendRequest(r.id);
                          setMessage('You’re now friends.');
                          loadAll();
                        }}
                      >
                        Accept
                      </Button>
                    </Box>
                  }
                >
                  <ListItemText primary={displayName(r.from_user_id)} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </>
      ) : null}

      {!loading && outgoing.length > 0 ? (
        <>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2, mb: 1 }}>
            Waiting on them
          </Typography>
          <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
            <List dense>
              {outgoing.map((r) => (
                <ListItem
                  key={r.id}
                  secondaryAction={
                    <Button size="small" onClick={() => cancelFriendRequest(r.id).then(loadAll)}>
                      Cancel
                    </Button>
                  }
                >
                  <ListItemText primary={displayName(r.to_user_id)} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </>
      ) : null}

      <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2, mb: 1 }}>
        Your friends
      </Typography>
      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">Loading…</Typography>
          </Box>
        ) : friends.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">No friends yet. Search above to send a request.</Typography>
          </Box>
        ) : (
          <List dense>
            {friends.map((f, i) => {
              const full = formatFullName(f);
              return (
                <Box key={f.user_id}>
                  {i > 0 && <Divider />}
                  <ListItem
                    secondaryAction={
                      <Button
                        size="small"
                        color="inherit"
                        startIcon={<PersonRemoveIcon />}
                        onClick={async () => {
                          await removeFriend(f.user_id);
                          loadAll();
                        }}
                      >
                        Remove
                      </Button>
                    }
                  >
                    <ListItemText
                      primary={full || f.username || f.display_name || 'Friend'}
                      secondary={
                        f.username && full && full !== f.username ? `@${f.username}` : null
                      }
                    />
                  </ListItem>
                </Box>
              );
            })}
          </List>
        )}
      </Paper>
    </Container>
  );
}
