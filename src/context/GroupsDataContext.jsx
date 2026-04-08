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
  EVENLY_DATA_LEGACY_KEY,
  getEvenlyDataStorageKey,
  readEvenlyDataJson,
  writeEvenlyDataJson,
  mergeCloudWithLocalOnlyGroups,
} from '../lib/evenlyStorageKey.js';
import { useAuth } from './AuthContext.jsx';

const defaultData = () => ({ groups: {} });

const GroupsDataContext = createContext(null);

export function GroupsDataProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const cloud = isSupabaseConfigured() && !!user;

  const [data, setStoredValue] = useState(() => readEvenlyDataJson(EVENLY_DATA_LEGACY_KEY));
  const [dataReady, setDataReady] = useState(() => !isSupabaseConfigured());
  const [syncError, setSyncError] = useState('');

  const storedValueRef = useRef(data);
  storedValueRef.current = data;

  const storageKeyRef = useRef(EVENLY_DATA_LEGACY_KEY);

  const setData = useCallback((updater) => {
    const prev = storedValueRef.current;
    const next = updater instanceof Function ? updater(prev) : updater;
    writeEvenlyDataJson(storageKeyRef.current, next);
    storedValueRef.current = next;
    setStoredValue(next);
  }, []);

  // Load from cloud or local when auth / user changes
  useEffect(() => {
    if (authLoading) {
      if (isSupabaseConfigured()) setDataReady(false);
      return undefined;
    }

    if (!isSupabaseConfigured() || !user) {
      storageKeyRef.current = EVENLY_DATA_LEGACY_KEY;
      setSyncError('');
      setDataReady(true);
      const local = readEvenlyDataJson(EVENLY_DATA_LEGACY_KEY);
      setStoredValue(local);
      storedValueRef.current = local;
      return undefined;
    }

    const userKey = getEvenlyDataStorageKey(user.id);
    storageKeyRef.current = userKey;

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

        // One-time: copy pre-account local data into this user's cache key
        let localCached = readEvenlyDataJson(userKey);
        if (Object.keys(localCached.groups || {}).length === 0) {
          const legacy = readEvenlyDataJson(EVENLY_DATA_LEGACY_KEY);
          if (Object.keys(legacy.groups || {}).length > 0) {
            writeEvenlyDataJson(userKey, legacy);
            try {
              localStorage.removeItem(EVENLY_DATA_LEGACY_KEY);
            } catch {
              /* ignore */
            }
            localCached = legacy;
          }
        }

        const cloudData = await loadNormalizedData(client, user.id);
        if (cancelled) return;

        const cloudEmpty =
          !cloudData.groups || Object.keys(cloudData.groups).length === 0;
        const cloudIds = new Set(Object.keys(cloudData.groups || {}));
        const localIds = Object.keys(localCached.groups || {});

        let merged = mergeCloudWithLocalOnlyGroups(cloudData, localCached);
        const addedLocalOnly = localIds.some((id) => !cloudIds.has(id));

        if (cloudEmpty && localIds.length > 0) {
          merged = { groups: { ...localCached.groups } };
        }

        const shouldPersist =
          (cloudEmpty && localIds.length > 0) || (!cloudEmpty && addedLocalOnly);

        if (shouldPersist) {
          await persistNormalizedData(client, user.id, merged);
        }

        if (!cancelled) {
          storedValueRef.current = merged;
          setStoredValue(merged);
          writeEvenlyDataJson(userKey, merged);
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
  }, [authLoading, user?.id]);

  // Debounced persist to Supabase
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
