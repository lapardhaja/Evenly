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
import { useAuth } from './AuthContext.jsx';

const STORAGE_KEY = 'evenly:data:v2';

const defaultData = () => ({ groups: {} });

const GroupsDataContext = createContext(null);

function readLocalStorage() {
  try {
    const item = localStorage.getItem(STORAGE_KEY);
    return item ? JSON.parse(item) : defaultData();
  } catch {
    return defaultData();
  }
}

export function GroupsDataProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const supabase = getSupabase();
  const cloud = isSupabaseConfigured() && !!user;

  const [data, setStoredValue] = useState(() => readLocalStorage());
  // When Supabase is configured, wait for auth + first load before showing data
  const [dataReady, setDataReady] = useState(() => !isSupabaseConfigured());

  const storedValueRef = useRef(data);
  storedValueRef.current = data;

  const setData = useCallback((updater) => {
    const prev = storedValueRef.current;
    const next = updater instanceof Function ? updater(prev) : updater;
    // Always mirror to localStorage so logout / offline still has latest cache
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* quota */
    }
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
      setDataReady(true);
      const local = readLocalStorage();
      setStoredValue(local);
      storedValueRef.current = local;
      return undefined;
    }

    let cancelled = false;
    setDataReady(false);

    (async () => {
      try {
        const client = getSupabase();
        if (!client) {
          if (!cancelled) setDataReady(true);
          return;
        }
        let cloudData = await loadNormalizedData(client, user.id);
        const local = readLocalStorage();
        const cloudEmpty =
          !cloudData.groups || Object.keys(cloudData.groups).length === 0;
        const localHas = local.groups && Object.keys(local.groups).length > 0;

        let merged = cloudData;
        if (cloudEmpty && localHas) {
          merged = local;
          await persistNormalizedData(client, user.id, merged);
        }

        if (!cancelled) {
          storedValueRef.current = merged;
          setStoredValue(merged);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          } catch {
            /* quota */
          }
          setDataReady(true);
        }
      } catch (e) {
        console.error('Evenly cloud sync load failed:', e);
        if (!cancelled) {
          const fallback = readLocalStorage();
          setStoredValue(fallback);
          storedValueRef.current = fallback;
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
    if (!cloud || !dataReady) return undefined;

    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(() => {
      const client = getSupabase();
      if (!client || !user) return;
      persistNormalizedData(client, user.id, storedValueRef.current).catch((err) => {
        console.error('Evenly cloud sync save failed:', err);
      });
    }, 700);

    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [data, cloud, dataReady, user]);

  const value = useMemo(
    () => ({
      data,
      setData,
      ready: !authLoading && dataReady,
      cloudSync: cloud,
    }),
    [data, setData, authLoading, dataReady, cloud],
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
