import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import ChatThread from '../components/ChatThread.jsx';
import { getGroupConversation } from '../lib/chatApi.js';
import { isSupabaseConfigured } from '../lib/supabaseClient.js';
import { useGroupsData } from '../context/GroupsDataContext.jsx';

export default function GroupChatTab({ groupId, groupData }) {
  const { group, people } = groupData;
  const { setData } = useGroupsData();
  const [conversationId, setConversationId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isSupabaseConfigured() || !groupId) {
        setLoading(false);
        return;
      }
      try {
        const id = await getGroupConversation(groupId);
        if (!cancelled) setConversationId(id);
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Couldn’t open group chat.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const nameByUserId = useMemo(() => {
    const map = {};
    (people || []).forEach((p) => {
      if (p.linkedUserId) map[p.linkedUserId] = p.name;
    });
    return map;
  }, [people]);

  const onPaymentSettled = ({ groupId: gid, transferKey }) => {
    if (!gid || !transferKey) return;
    setData((prev) => {
      const g = prev.groups?.[gid];
      if (!g) return prev;
      const cur = Array.isArray(g.settledTransfers) ? g.settledTransfers : [];
      if (cur.includes(transferKey)) return prev;
      return {
        ...prev,
        groups: {
          ...prev.groups,
          [gid]: { ...g, settledTransfers: [...cur, transferKey] },
        },
      };
    });
  };

  if (!isSupabaseConfigured()) {
    return (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        Group chat is available when you sign in to the cloud.
      </Typography>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <ChatThread
        conversationId={conversationId}
        groupName={group?.name}
        nameByUserId={nameByUserId}
        onPaymentSettled={onPaymentSettled}
        minHeight={0}
      />
    </Box>
  );
}
