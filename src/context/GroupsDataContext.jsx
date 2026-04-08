import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabaseClient.js';
import { loadNormalizedData, persistNormalizedData } from '../lib/supabaseSync.js';
import {
  readLegacyEvenlyData,
  writeLegacyEvenlyData,
  purgeEvenlyDataFromLocalStorage,
} from '../lib/evenlyStorageKey.js';
import { useAuth } from './AuthContext.jsx';

const defaultData = () => ({ groups: {} });

const GroupsDataContext = createContext(null);

export function GroupsDataProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const useServerOnly = isSupabaseConfigured();
  const cloud = useServerOnly && !!user;

  const [data, setStoredValue] = useState(() =>
    useServerOnly ? defaultData() : readLegacyEvenlyData(),
  );
  const [dataReady, setDataReady] = useState(() => !useServerOnly);
  const [syncError, setSyncError] = useState('');

  const storedValueRef = useRef(data);
  storedValueRef.current = data;

  const setData = useCallback(
    (updater) => {
      const prev = storedValueRef.current;
      const next = updater instanceof Function ? updater(prev) : updater;
      if (!useServerOnly) {
        writeLegacyEvenlyData(next);
      }
      storedValueRef.current = next;
      setStoredValue(next);
    },
    [useServerOnly],
  );

  // Load: server-only from Supabase when configured + signed in; else legacy localStorage
  useEffect(() => {
    if (authLoading) {
      if (useServerOnly) setDataReady(false);
      return undefined;
    }

    if (!useServerOnly) {
      setSyncError('');
      setDataReady(true);
      const local = readLegacyEvenlyData();
      setStoredValue(local);
      storedValueRef.current = local;
      return undefined;
    }

    if (!user) {
      setSyncError('');
      setDataReady(true);
      const empty = defaultData();
      setStoredValue(empty);
      storedValueRef.current = empty;
      return undefined;
    }

    let cancelled = false;
    setDataReady(false);
    setSyncError('');

    (async () => {
      try {
        const client = getSupabase();
        if (!client) {
          if (!cancelled) setDataReady(true);
          return;
        }

        const cloudData = await loadNormalizedData(client, user.id);
        if (cancelled) return;

        const merged = cloudData?.groups ? { groups: { ...cloudData.groups } } : defaultData();

        if (!cancelled) {
          storedValueRef.current = merged;
          setStoredValue(merged);
          purgeEvenlyDataFromLocalStorage();
          setDataReady(true);
        }
      } catch (e) {
        console.error('Evenly cloud sync load failed:', e);
        if (!cancelled) {
          const msg =
            e?.message ||
            e?.error_description ||
            String(e) ||
            'Could not load your data from the cloud.';
          setSyncError(msg);
          setStoredValue(defaultData());
          storedValueRef.current = defaultData();
          setDataReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id, useServerOnly]);

  // Debounced persist to Supabase (server-only mode)
  const persistTimer = useRef(null);
  useEffect(() => {
    if (!cloud || !dataReady || syncError) return undefined;

    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(() => {
      const client = getSupabase();
      if (!client || !user) return;
      persistNormalizedData(client, user.id, storedValueRef.current).catch((err) => {
        console.error('Evenly cloud sync save failed:', err);
        setSyncError(err?.message || 'Could not save to the cloud.');
      });
    }, 700);

    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [data, cloud, dataReady, user, syncError]);

  const clearSyncError = useCallback(() => setSyncError(''), []);

  const value = useMemo(
    () => ({
      data,
      setData,
      ready: !authLoading && dataReady,
      cloudSync: cloud && !syncError,
      syncError,
      clearSyncError,
    }),
    [data, setData, authLoading, dataReady, cloud, syncError, clearSyncError],
  );

  return (
    <GroupsDataContext.Provider value={value}>{children}</GroupsDataContext.Provider>
  );
}

export function useGroupsData() {
  const ctx = useContext(GroupsDataContext);
  if (!ctx) {
    throw new Error('useGroupsData must be used within GroupsDataProvider');
  }
  return ctx;
}
