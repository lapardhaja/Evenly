import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchFriendGraph, notifyFriendRequestsChanged } from '../lib/friendsApi.js';

const SILENT_RELOAD_MS = 200;

/**
 * Shared Friends / Search social lists. First paint can show Loading…;
 * later mutations only busy the row and debounce a silent reconcile.
 */
export function useFriendGraph(enabled) {
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [friends, setFriends] = useState([]);
  const [nameById, setNameById] = useState({});
  const [loading, setLoading] = useState(() => !!enabled);
  const [error, setError] = useState('');
  const loadedRef = useRef(false);
  const timerRef = useRef(0);

  const applyGraph = useCallback((g) => {
    setIncoming(g.incoming);
    setOutgoing(g.outgoing);
    setFriends(g.friends);
    setNameById(g.nameById);
  }, []);

  const load = useCallback(
    async (opts = {}) => {
      const silent = !!opts.silent;
      if (!enabled) {
        setLoading(false);
        return;
      }
      if (!silent && !loadedRef.current) setLoading(true);
      if (!silent) setError('');
      try {
        applyGraph(await fetchFriendGraph());
        loadedRef.current = true;
      } catch {
        if (!silent) setError('Couldn’t load friends. Try again in a moment.');
      } finally {
        setLoading(false);
      }
    },
    [applyGraph, enabled],
  );

  const scheduleSilentReload = useCallback(() => {
    if (!enabled) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      void load({ silent: true });
    }, SILENT_RELOAD_MS);
  }, [enabled, load]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!enabled) return undefined;
    const onEvt = () => scheduleSilentReload();
    window.addEventListener('evenly-friend-requests-changed', onEvt);
    window.addEventListener('evenly-pull-to-refresh', onEvt);
    return () => {
      window.removeEventListener('evenly-friend-requests-changed', onEvt);
      window.removeEventListener('evenly-pull-to-refresh', onEvt);
      window.clearTimeout(timerRef.current);
    };
  }, [enabled, scheduleSilentReload]);

  return {
    incoming,
    setIncoming,
    outgoing,
    setOutgoing,
    friends,
    setFriends,
    nameById,
    setNameById,
    loading,
    error,
    setError,
    load,
    scheduleSilentReload,
    notifyAndReload: () => {
      notifyFriendRequestsChanged();
      scheduleSilentReload();
    },
  };
}
