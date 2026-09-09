import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChatThread from '../components/ChatThread.jsx';
import { fetchConversation, fetchConversationMembers } from '../lib/chatApi.js';
import { formatFullName, getProfilesByIds } from '../lib/friendsApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useGroupsData } from '../context/GroupsDataContext.jsx';
import { isSupabaseConfigured } from '../lib/supabaseClient.js';
import { chatThreadPageSx, CHAT_CONTAINER_MAX_WIDTH } from '../lib/appShell.js';

export default function ChatThreadPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, setData } = useGroupsData();
  const [meta, setMeta] = useState(null);
  const [title, setTitle] = useState('Chat');
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isSupabaseConfigured() || !conversationId) {
        setLoading(false);
        return;
      }
      try {
        const c = await fetchConversation(conversationId);
        if (cancelled) return;
        setMeta(c);
        if (c?.kind === 'group' && c.group_id) {
          const g = data.groups?.[c.group_id];
          setGroupName(g?.name || 'Group');
          setTitle(g?.name || 'Group');
        } else {
          const members = await fetchConversationMembers(conversationId);
          const other = members.find((id) => id !== user?.id);
          if (other) {
            const profs = await getProfilesByIds([other]);
            const p = profs[0];
            setTitle(formatFullName(p) || p?.username || 'Chat');
          } else {
            setTitle('Chat');
          }
        }
      } catch {
        setTitle('Chat');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId, data.groups, user?.id]);

  const onPaymentSettled = ({ groupId, transferKey }) => {
    if (!groupId || !transferKey) return;
    setData((prev) => {
      const g = prev.groups?.[groupId];
      if (!g) return prev;
      const cur = Array.isArray(g.settledTransfers) ? g.settledTransfers : [];
      if (cur.includes(transferKey)) return prev;
      return {
        ...prev,
        groups: {
          ...prev.groups,
          [groupId]: { ...g, settledTransfers: [...cur, transferKey] },
        },
      };
    });
  };

  const nameByUserId = useMemo(() => {
    const map = {};
    if (meta?.kind === 'group' && meta.group_id) {
      const people = data.groups?.[meta.group_id]?.people || {};
      Object.entries(people).forEach(([pid, p]) => {
        if (p.linkedUserId) map[p.linkedUserId] = p.name;
      });
    }
    return map;
  }, [meta, data.groups]);

  return (
    <Container maxWidth={CHAT_CONTAINER_MAX_WIDTH} sx={chatThreadPageSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexShrink: 0 }}>
        <IconButton onClick={() => navigate('/chat')} size="small" aria-label="Back to chats">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" fontWeight={700} noWrap>
          {title}
        </Typography>
      </Box>
      {loading ? (
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <ChatThread
          conversationId={conversationId}
          groupName={groupName}
          nameByUserId={nameByUserId}
          onPaymentSettled={onPaymentSettled}
          minHeight={0}
        />
      )}
    </Container>
  );
}
