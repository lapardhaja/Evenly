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
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
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
import { friendSearchAction } from '../lib/friendInvite.js';
import { nameToInitials } from '../functions/utils.js';

function personLabel(row) {
  return formatFullName(row) || row?.username || row?.display_name || 'Someone';
}

export default function FriendsPage() {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [friends, setFriends] = useState([]);
  const [nameById, setNameById] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const loadAll = useCallback(async (opts = {}) => {
    const silent = !!opts.silent;
    if (!silent) setLoading(true);
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
      setError('Couldn’t load friends. Try again in a moment.');
    } finally {
      if (!silent) setLoading(false);
      if (!opts.skipNotify) notifyFriendRequestsChanged();
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const onFriends = () => loadAll({ silent: true, skipNotify: true });
    window.addEventListener('evenly-pull-to-refresh', onFriends);
    window.addEventListener('evenly-friend-requests-changed', onFriends);
    return () => {
      window.removeEventListener('evenly-pull-to-refresh', onFriends);
      window.removeEventListener('evenly-friend-requests-changed', onFriends);
    };
  }, [loadAll]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const q = search.trim();
      if (q.length < 2) {
        setSearchResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      try {
        const rows = await searchPeople(q);
        setSearchResults(rows);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const friendIds = useMemo(() => new Set(friends.map((f) => f.user_id)), [friends]);
  const outgoingTo = useMemo(() => new Set(outgoing.map((o) => o.to_user_id)), [outgoing]);
  const incomingFrom = useMemo(() => {
    const m = new Map();
    incoming.forEach((r) => m.set(r.from_user_id, r.id));
    return m;
  }, [incoming]);

  const displayName = (userId) => nameById[userId] || userId;

  const run = async (id, fn, ok) => {
    setBusyId(id);
    setError('');
    try {
      await fn();
      if (ok) setMessage(ok);
      await loadAll();
    } catch (e) {
      setError(e?.message || 'Couldn’t do that.');
    } finally {
      setBusyId('');
    }
  };

  const q = search.trim();

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 4 } }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
        Friends
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Find people by name, username, or email. After they accept, invite them into a group from
        People.
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
        placeholder="Name, @username, or email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 1 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        helperText={
          q.length === 1
            ? 'Type at least 2 characters.'
            : q.length >= 2 && !searching && searchResults.length === 0
              ? 'No account matches that. Try their Evenly username or the email they signed up with.'
              : 'They need an Evenly account. Guest names on a receipt are not friends.'
        }
      />

      {q.length >= 2 && searchResults.length > 0 ? (
        <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
          <List disablePadding>
            {searchResults.map((row, i) => {
              const label = personLabel(row);
              const action = friendSearchAction({
                userId: row.user_id,
                friendIds,
                outgoingTo,
                incomingFrom,
              });
              return (
                <Box key={row.user_id}>
                  {i > 0 ? <Divider /> : null}
                  <ListItem
                    sx={{ py: 1.25, pr: 16 }}
                    secondaryAction={
                      action.kind === 'friends' ? (
                        <Typography variant="caption" color="success.main">
                          Friends
                        </Typography>
                      ) : action.kind === 'pending' ? (
                        <Typography variant="caption" color="text.secondary">
                          Pending
                        </Typography>
                      ) : action.kind === 'accept' ? (
                        <Button
                          size="small"
                          variant="contained"
                          disabled={busyId === row.user_id}
                          onClick={() =>
                            run(row.user_id, () => acceptFriendRequest(action.requestId), 'You’re now friends.')
                          }
                        >
                          Accept
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<PersonAddIcon />}
                          disabled={busyId === row.user_id}
                          onClick={() =>
                            run(row.user_id, () => sendFriendRequest(row.user_id), 'Request sent.')
                          }
                        >
                          Add friend
                        </Button>
                      )
                    }
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>{nameToInitials(label)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={label}
                      secondary={row.username ? `@${row.username}` : null}
                    />
                  </ListItem>
                </Box>
              );
            })}
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
                  sx={{ pr: 22 }}
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Button
                        size="small"
                        color="error"
                        disabled={busyId === r.id}
                        onClick={() => run(r.id, () => declineFriendRequest(r.id))}
                      >
                        Decline
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        disabled={busyId === r.id}
                        onClick={() =>
                          run(r.id, () => acceptFriendRequest(r.id), 'You’re now friends.')
                        }
                      >
                        Accept
                      </Button>
                    </Box>
                  }
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                      {nameToInitials(displayName(r.from_user_id))}
                    </Avatar>
                  </ListItemAvatar>
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
                    <Button
                      size="small"
                      disabled={busyId === r.id}
                      onClick={() => run(r.id, () => cancelFriendRequest(r.id))}
                    >
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
            <Typography color="text.secondary">
              Nobody yet. Search above, tap Add friend, and wait for them to accept.
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {friends.map((f, i) => {
              const full = personLabel(f);
              return (
                <Box key={f.user_id}>
                  {i > 0 && <Divider />}
                  <ListItem
                    sx={{ py: 1.25, pr: 14 }}
                    secondaryAction={
                      <Button
                        size="small"
                        color="inherit"
                        startIcon={<PersonRemoveIcon />}
                        disabled={busyId === f.user_id}
                        onClick={() => run(f.user_id, () => removeFriend(f.user_id))}
                      >
                        Remove
                      </Button>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>{nameToInitials(full)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={full}
                      secondary={f.username && full !== f.username ? `@${f.username}` : null}
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
