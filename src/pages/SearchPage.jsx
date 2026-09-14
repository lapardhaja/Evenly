import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useGroups } from '../hooks/useGroupData.js';
import { useGroupsData } from '../context/GroupsDataContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  filterGroupPeopleForSearch,
  filterGroupsForSearch,
  filterReceiptsForSearch,
} from '../lib/appSearch.js';
import { isSupabaseConfigured } from '../lib/supabaseClient.js';
import {
  searchPeople,
  sendFriendRequest,
  listIncomingRequests,
  listOutgoingRequests,
  listFriends,
  acceptFriendRequest,
  declineFriendRequest,
  getProfilesByIds,
  notifyFriendRequestsChanged,
  formatFullName,
} from '../lib/friendsApi.js';
import { friendSearchAction } from '../lib/friendInvite.js';
import { getOrCreateDm } from '../lib/chatApi.js';
import { nameToInitials } from '../functions/utils.js';
import InviteQrDialog from '../components/InviteQrDialog.jsx';

function personLabel(row) {
  return formatFullName(row) || row?.username || row?.display_name || 'Someone';
}

export default function SearchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { groups } = useGroups();
  const { data } = useGroupsData();
  const { user } = useAuth();
  const cloud = isSupabaseConfigured() && !!user;
  const [q, setQ] = useState('');
  const [people, setPeople] = useState([]);
  const [searchingPeople, setSearchingPeople] = useState(false);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [friends, setFriends] = useState([]);
  const [nameById, setNameById] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  const [busyId, setBusyId] = useState('');

  const groupHits = useMemo(() => filterGroupsForSearch(groups, q), [groups, q]);
  const receiptHits = useMemo(
    () => filterReceiptsForSearch(data.groups, q),
    [data.groups, q],
  );
  const groupPeopleHits = useMemo(
    () => filterGroupPeopleForSearch(data.groups, q),
    [data.groups, q],
  );

  const friendIds = useMemo(() => new Set(friends.map((f) => f.user_id)), [friends]);
  const outgoingTo = useMemo(() => new Set(outgoing.map((r) => r.to_user_id)), [outgoing]);
  const incomingFrom = useMemo(() => {
    const m = new Map();
    incoming.forEach((r) => m.set(r.from_user_id, r.id));
    return m;
  }, [incoming]);

  const loadSocial = useCallback(async () => {
    if (!cloud) return;
    try {
      const [inc, out, fr] = await Promise.all([
        listIncomingRequests(),
        listOutgoingRequests(),
        listFriends(),
      ]);
      setIncoming(inc);
      setOutgoing(out);
      setFriends(fr);
      const ids = [...inc.map((x) => x.from_user_id), ...out.map((x) => x.to_user_id)];
      const uniq = [...new Set(ids)];
      if (uniq.length) {
        const profs = await getProfilesByIds(uniq);
        const m = {};
        profs.forEach((pr) => {
          if (pr?.user_id) m[pr.user_id] = personLabel(pr);
        });
        setNameById(m);
      } else {
        setNameById({});
      }
    } catch (e) {
      setError(e?.message || 'Couldn’t load people.');
    }
  }, [cloud]);

  useEffect(() => {
    loadSocial();
  }, [loadSocial]);

  useEffect(() => {
    const text = location.state?.notice;
    if (!text) return;
    setNotice(text);
  }, [location.state]);

  useEffect(() => {
    if (!cloud) return undefined;
    const onEvt = () => loadSocial();
    window.addEventListener('evenly-pull-to-refresh', onEvt);
    window.addEventListener('evenly-friend-requests-changed', onEvt);
    return () => {
      window.removeEventListener('evenly-pull-to-refresh', onEvt);
      window.removeEventListener('evenly-friend-requests-changed', onEvt);
    };
  }, [cloud, loadSocial]);

  useEffect(() => {
    if (!cloud) {
      setPeople([]);
      return undefined;
    }
    const query = q.trim();
    if (query.length < 2) {
      setPeople([]);
      setSearchingPeople(false);
      return undefined;
    }
    let cancelled = false;
    setSearchingPeople(true);
    const t = window.setTimeout(async () => {
      try {
        const rows = await searchPeople(query);
        if (!cancelled) setPeople(rows);
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Couldn’t search people.');
      } finally {
        if (!cancelled) setSearchingPeople(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [q, cloud]);

  const run = async (id, fn) => {
    setBusyId(id);
    setError('');
    try {
      await fn();
      notifyFriendRequestsChanged();
      await loadSocial();
    } catch (e) {
      setError(e?.message || 'Couldn’t update.');
    } finally {
      setBusyId('');
    }
  };

  const openDm = async (otherId) => {
    setBusyId(otherId);
    try {
      const id = await getOrCreateDm(otherId);
      navigate(`/chat/${id}`);
    } catch (e) {
      setError(e?.message || 'Couldn’t open chat.');
    } finally {
      setBusyId('');
    }
  };

  const typing = q.trim().length > 0;
  const emptyLocal =
    !typing && groupHits.length === 0 && (!cloud || (incoming.length === 0 && friends.length === 0));

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 4 } }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Search
      </Typography>
      <TextField
        fullWidth
        size="small"
        placeholder={cloud ? 'Groups, receipts, people, or @username' : 'Groups, receipts, or people'}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        sx={{ mb: 2 }}
        helperText={q.trim().length === 1 ? 'Type at least 2 characters for receipts and people.' : ' '}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />
      {cloud ? (
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Button size="small" startIcon={<QrCode2Icon />} onClick={() => setQrOpen(true)}>
            My QR
          </Button>
          <Button size="small" variant="outlined" component={RouterLink} to="/scan">
            Scan QR
          </Button>
        </Box>
      ) : null}
      {notice ? (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>
          {notice}
        </Alert>
      ) : null}
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      ) : null}

      {emptyLocal ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {cloud
            ? 'Find groups, receipts, friends, or Evenly usernames. Scan a QR to add someone.'
            : 'Find groups, receipts, and people on your bills.'}
        </Typography>
      ) : null}

      {groupHits.length > 0 ? (
        <>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Groups
          </Typography>
          <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
            <List disablePadding>
              {groupHits.map((g, i) => (
                <Box key={g.id}>
                  {i > 0 ? <Divider /> : null}
                  <ListItemButton onClick={() => navigate(`/groups/${g.id}/receipts`)}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <FolderSharedIcon fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={g.name}
                      secondary={`${g.peopleCount || 0} people · ${g.receiptCount || 0} receipts`}
                    />
                  </ListItemButton>
                </Box>
              ))}
            </List>
          </Paper>
        </>
      ) : typing ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          No groups match.
        </Typography>
      ) : null}

      {receiptHits.length > 0 ? (
        <>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Receipts
          </Typography>
          <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
            <List disablePadding>
              {receiptHits.map((r, i) => (
                <Box key={`${r.groupId}-${r.receiptId}`}>
                  {i > 0 ? <Divider /> : null}
                  <ListItemButton
                    onClick={() => navigate(`/groups/${r.groupId}/receipt/${r.receiptId}`)}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'secondary.main' }}>
                        <ReceiptLongIcon fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={r.title} secondary={r.groupName} />
                  </ListItemButton>
                </Box>
              ))}
            </List>
          </Paper>
        </>
      ) : null}

      {groupPeopleHits.length > 0 ? (
        <>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            On your bills
          </Typography>
          <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
            <List disablePadding>
              {groupPeopleHits.map((p, i) => (
                <Box key={`${p.groupId}-${p.personId}`}>
                  {i > 0 ? <Divider /> : null}
                  <ListItemButton onClick={() => navigate(`/groups/${p.groupId}/people`)}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>{nameToInitials(p.name)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={p.name} secondary={p.groupName} />
                  </ListItemButton>
                </Box>
              ))}
            </List>
          </Paper>
        </>
      ) : null}

      {cloud && q.trim().length >= 2 ? (
        <>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            People
          </Typography>
          <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
            {searchingPeople ? (
              <Box sx={{ p: 2 }}>
                <Typography color="text.secondary">Searching…</Typography>
              </Box>
            ) : people.length === 0 ? (
              <Box sx={{ p: 2 }}>
                <Typography color="text.secondary">
                  No account matches. Try their Evenly username or the email they signed up with.
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {people.map((row, i) => {
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
                      <ListItemButton
                        onClick={() => {
                          if (action.kind === 'friends') openDm(row.user_id);
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>{nameToInitials(label)}</Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={label}
                          secondary={
                            row.username
                              ? `@${row.username}`
                              : action.kind === 'friends'
                                ? 'Friends · tap to message'
                                : action.kind === 'pending'
                                  ? 'Request sent'
                                  : null
                          }
                        />
                        {action.kind === 'request' ? (
                          <Button
                            size="small"
                            variant="contained"
                            disabled={busyId === row.user_id}
                            onClick={(e) => {
                              e.stopPropagation();
                              run(row.user_id, () => sendFriendRequest(row.user_id));
                            }}
                          >
                            Add
                          </Button>
                        ) : null}
                        {action.kind === 'accept' ? (
                          <Button
                            size="small"
                            variant="contained"
                            disabled={busyId === row.user_id}
                            onClick={(e) => {
                              e.stopPropagation();
                              run(row.user_id, () => acceptFriendRequest(action.requestId));
                            }}
                          >
                            Accept
                          </Button>
                        ) : null}
                      </ListItemButton>
                    </Box>
                  );
                })}
              </List>
            )}
          </Paper>
        </>
      ) : null}

      {cloud && !typing && incoming.length > 0 ? (
        <>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Requests for you
          </Typography>
          <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
            <List disablePadding>
              {incoming.map((r) => (
                <ListItemButton key={r.id} sx={{ pr: 2 }}>
                  <ListItemText primary={nameById[r.from_user_id] || 'Someone'} />
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Button
                      size="small"
                      color="error"
                      disabled={busyId === r.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        run(r.id, () => declineFriendRequest(r.id));
                      }}
                    >
                      Decline
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={busyId === r.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        run(r.id, () => acceptFriendRequest(r.id));
                      }}
                    >
                      Accept
                    </Button>
                  </Box>
                </ListItemButton>
              ))}
            </List>
          </Paper>
        </>
      ) : null}

      {cloud && !typing ? (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              Friends
            </Typography>
            <Button size="small" onClick={() => navigate('/friends')}>
              Manage
            </Button>
          </Box>
          {friends.length > 0 ? (
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', mb: 2 }}>
              <List disablePadding>
                {friends.map((f, i) => {
                  const full = personLabel(f);
                  return (
                    <Box key={f.user_id}>
                      {i > 0 ? <Divider /> : null}
                      <ListItemButton
                        onClick={() => openDm(f.user_id)}
                        disabled={busyId === f.user_id}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>{nameToInitials(full)}</Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={full}
                          secondary={
                            f.username && full !== f.username ? `@${f.username}` : 'Message'
                          }
                        />
                      </ListItemButton>
                    </Box>
                  );
                })}
              </List>
            </Paper>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Remove friends, cancel requests, and scan QR from Friends.
            </Typography>
          )}
        </>
      ) : null}

      <InviteQrDialog
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        kind="friend"
        title="Your friend QR"
      />
    </Container>
  );
}
