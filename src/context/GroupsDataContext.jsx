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
import { applyPersistResult, conflictSyncMessage } from '../lib/syncConflict.js';
import {
  readLegacyEvenlyData,
  writeLegacyEvenlyData,
  purgeEvenlyDataFromLocalStorage,
  readCloudUserCache,
  writeCloudUserCache,
  rememberCloudCacheUserId,
  readLastCloudCacheUserId,
  hasGroupsData,
  resolveCloudFailureData,
  shouldKeepCloudDataWithoutUser,
  shouldKeepDataReadyOnAuthLoading,
  shouldFlushCloudPersist,
} from '../lib/evenlyStorageKey.js';
import { useAuth } from './AuthContext.jsx';

const defaultData = () => ({ groups: {} });

const GroupsDataContext = createContext(null);

function errorMessage(e, fallback) {
  return e?.message || e?.error_description || String(e) || fallback;
}

function initialCloudData() {
  const lastId = readLastCloudCacheUserId();
  const cached = lastId ? readCloudUserCache(lastId) : null;
  return cached ? { groups: cached.groups } : defaultData();
}

export function GroupsDataProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const useServerOnly = isSupabaseConfigured();
  const cloud = useServerOnly && !!user;

  const [data, setStoredValue] = useState(() =>
    useServerOnly ? initialCloudData() : readLegacyEvenlyData(),
  );
  const [dataReady, setDataReady] = useState(() =>
    useServerOnly ? hasGroupsData(initialCloudData()) : true,
  );
  const [syncError, setSyncError] = useState('');

  const storedValueRef = useRef(data);
  storedValueRef.current = data;
  const dataReadyRef = useRef(dataReady);
  dataReadyRef.current = dataReady;
  const lastUserIdRef = useRef(user?.id || readLastCloudCacheUserId());
  const serverHydratedRef = useRef(false);
  const dirtyRef = useRef((() => {
    if (!useServerOnly) return false;
    const lastId = readLastCloudCacheUserId();
    const cached = lastId ? readCloudUserCache(lastId) : null;
    return Boolean(cached?.pendingPersist);
  })());
  const persistGenRef = useRef(0);
  const persistTimer = useRef(null);
  const persistNowRef = useRef(() => Promise.resolve());

  const writeCache = useCallback((uid, payload, meta) => {
    if (!uid) return;
    writeCloudUserCache(uid, payload, meta);
  }, []);

  const setData = useCallback(
    (updater) => {
      const prev = storedValueRef.current;
      const next = updater instanceof Function ? updater(prev) : updater;
      storedValueRef.current = next;
      setStoredValue(next);
      if (!useServerOnly) {
        writeLegacyEvenlyData(next);
        return;
      }
      dirtyRef.current = true;
      persistGenRef.current += 1;
      const uid = user?.id || lastUserIdRef.current;
      if (uid) writeCache(uid, next, { pendingPersist: true });
    },
    [useServerOnly, user?.id, writeCache],
  );

  const persistNow = useCallback(() => {
    if (!useServerOnly || !dirtyRef.current) return Promise.resolve();
    const uid = user?.id || lastUserIdRef.current || readLastCloudCacheUserId();
    if (!uid) return Promise.resolve();
    const payload = storedValueRef.current;
    if (!shouldFlushCloudPersist({ data: payload, serverHydrated: serverHydratedRef.current })) {
      return Promise.resolve();
    }
    writeCache(uid, payload, { pendingPersist: true });
    const client = getSupabase();
    if (!client) return Promise.resolve();
    const gen = persistGenRef.current;
    return persistNormalizedData(client, uid, payload)
      .then(async (result) => {
        const skippedIds = result?.skippedIds || [];
        const writtenAt = result?.writtenAt || {};
        let serverGroups = {};
        let reloaded = true;
        if (skippedIds.length > 0) {
          try {
            const fresh = await loadNormalizedData(client, uid);
            serverGroups = fresh?.groups || {};
          } catch {
            reloaded = false;
          }
        }
        const merged = {
          groups: applyPersistResult(storedValueRef.current.groups, {
            skippedIds: reloaded ? skippedIds : [],
            writtenAt,
            serverGroups,
          }),
        };
        storedValueRef.current = merged;
        setStoredValue(merged);
        const stillDirty = gen !== persistGenRef.current || (skippedIds.length > 0 && !reloaded);
        dirtyRef.current = stillDirty;
        writeCache(uid, merged, { pendingPersist: stillDirty });
        setSyncError(conflictSyncMessage({ skippedIds, reloaded }));
      })
      .catch((err) => {
        const partial = err?.persistPartial;
        if (partial && Object.keys(partial.writtenAt || {}).length > 0) {
          const merged = {
            groups: applyPersistResult(storedValueRef.current.groups, {
              writtenAt: partial.writtenAt,
            }),
          };
          storedValueRef.current = merged;
          setStoredValue(merged);
          dirtyRef.current = true;
          writeCache(uid, merged, { pendingPersist: true });
        }
        console.error('Evenly cloud sync save failed:', err);
        setSyncError(errorMessage(err, 'Could not save to the cloud.'));
        throw err;
      });
  }, [useServerOnly, user?.id, writeCache]);
  persistNowRef.current = persistNow;

  // Load: hydrate cache immediately, then refresh from server. Never wipe on flicker/failure.
  useEffect(() => {
    if (!useServerOnly) {
      setSyncError('');
      setDataReady(true);
      const local = readLegacyEvenlyData();
      setStoredValue(local);
      storedValueRef.current = local;
      return undefined;
    }

    if (authLoading) {
      const lastId = lastUserIdRef.current || readLastCloudCacheUserId();
      const cached = lastId ? readCloudUserCache(lastId) : null;
      if (
        shouldKeepDataReadyOnAuthLoading({
          inMemory: storedValueRef.current,
          cached,
          dataReady: dataReadyRef.current,
        })
      ) {
        if (!hasGroupsData(storedValueRef.current) && hasGroupsData(cached)) {
          const hydrated = { groups: cached.groups };
          storedValueRef.current = hydrated;
          setStoredValue(hydrated);
          if (cached.pendingPersist) dirtyRef.current = true;
        }
        setDataReady(true);
        return undefined;
      }
      setDataReady(false);
      return undefined;
    }

    if (!user) {
      const lastId = lastUserIdRef.current || readLastCloudCacheUserId();
      const cached = lastId ? readCloudUserCache(lastId) : null;
      const inMemory = storedValueRef.current;
      if (shouldKeepCloudDataWithoutUser({ inMemory, cached, lastUserId: lastId })) {
        if (!hasGroupsData(inMemory) && hasGroupsData(cached)) {
          const hydrated = { groups: cached.groups };
          storedValueRef.current = hydrated;
          setStoredValue(hydrated);
          if (cached.pendingPersist) dirtyRef.current = true;
        }
        setDataReady(true);
        persistNowRef.current().catch(() => {});
        return undefined;
      }
      setSyncError('');
      setDataReady(true);
      const empty = defaultData();
      setStoredValue(empty);
      storedValueRef.current = empty;
      return undefined;
    }

    const prevUserId = lastUserIdRef.current;
    if (prevUserId && prevUserId !== user.id) {
      const switched = readCloudUserCache(user.id);
      const next = switched ? { groups: switched.groups } : defaultData();
      storedValueRef.current = next;
      setStoredValue(next);
      serverHydratedRef.current = false;
      dirtyRef.current = Boolean(switched?.pendingPersist);
      setDataReady(hasGroupsData(next));
    }
    lastUserIdRef.current = user.id;
    rememberCloudCacheUserId(user.id);

    const cached = readCloudUserCache(user.id);
    if (!hasGroupsData(storedValueRef.current) && hasGroupsData(cached)) {
      const hydrated = { groups: cached.groups };
      storedValueRef.current = hydrated;
      setStoredValue(hydrated);
      if (cached.pendingPersist) dirtyRef.current = true;
      setDataReady(true);
    } else if (hasGroupsData(storedValueRef.current) || dataReadyRef.current) {
      if (cached?.pendingPersist) dirtyRef.current = true;
      setDataReady(true);
    } else {
      setDataReady(false);
    }

    let cancelled = false;

    (async () => {
      try {
        const client = getSupabase();
        if (!client) {
          if (!cancelled) setDataReady(true);
          return;
        }

        const local = storedValueRef.current;
        let skippedIds = [];
        if (dirtyRef.current) {
          try {
            const result = await persistNormalizedData(client, user.id, local);
            if (cancelled) return;
            skippedIds = result?.skippedIds || [];
            const writtenAt = result?.writtenAt || {};
            if (Object.keys(writtenAt).length > 0) {
              const stamped = {
                groups: applyPersistResult(storedValueRef.current.groups, { writtenAt }),
              };
              storedValueRef.current = stamped;
              setStoredValue(stamped);
            }
          } catch (persistErr) {
            if (cancelled) return;
            const partial = persistErr?.persistPartial;
            if (partial && Object.keys(partial.writtenAt || {}).length > 0) {
              const stamped = {
                groups: applyPersistResult(storedValueRef.current.groups, {
                  writtenAt: partial.writtenAt,
                }),
              };
              storedValueRef.current = stamped;
              setStoredValue(stamped);
              writeCache(user.id, stamped, { pendingPersist: true });
            }
            console.error('Evenly cloud sync save failed:', persistErr);
            setSyncError(errorMessage(persistErr, 'Could not save to the cloud.'));
            setDataReady(true);
            return;
          }
        }

        const cloudData = await loadNormalizedData(client, user.id);
        if (cancelled) return;

        const merged = cloudData?.groups ? { groups: { ...cloudData.groups } } : defaultData();
        storedValueRef.current = merged;
        setStoredValue(merged);
        writeCache(user.id, merged, { pendingPersist: false });
        purgeEvenlyDataFromLocalStorage();
        serverHydratedRef.current = true;
        dirtyRef.current = false;
        setSyncError(conflictSyncMessage({ skippedIds, reloaded: true }));
        setDataReady(true);
      } catch (e) {
        console.error('Evenly cloud sync load failed:', e);
        if (!cancelled) {
          const cachedOnFail = readCloudUserCache(user.id);
          const kept = resolveCloudFailureData(storedValueRef.current, cachedOnFail);
          storedValueRef.current = kept;
          setStoredValue(kept);
          if (hasGroupsData(kept)) writeCache(user.id, kept, { pendingPersist: dirtyRef.current });
          setSyncError(errorMessage(e, 'Could not load your data from the cloud.'));
          setDataReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id, useServerOnly, writeCache]);

  // Debounced persist to Supabase (server-only mode). Still runs after a prior syncError.
  useEffect(() => {
    if (!useServerOnly || !dataReady || !dirtyRef.current) return undefined;
    const uid = user?.id || lastUserIdRef.current;
    if (!uid) return undefined;
    if (!shouldFlushCloudPersist({ data, serverHydrated: serverHydratedRef.current })) {
      return undefined;
    }

    writeCache(uid, storedValueRef.current, { pendingPersist: true });

    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(() => {
      persistNowRef.current().catch(() => {});
    }, 700);

    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [data, useServerOnly, dataReady, user?.id, writeCache]);

  // Flush immediately when the tab is backgrounded; retry pending saves on resume.
  useEffect(() => {
    if (!useServerOnly) return undefined;

    const flush = () => {
      if (persistTimer.current) {
        clearTimeout(persistTimer.current);
        persistTimer.current = null;
      }
      persistNowRef.current().catch(() => {});
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flush();
      } else if (document.visibilityState === 'visible' && dirtyRef.current) {
        persistNowRef.current().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, [useServerOnly]);

  const clearSyncError = useCallback(() => setSyncError(''), []);

  const reloadFromServer = useCallback(async () => {
    if (!useServerOnly) return;
    const uid = user?.id || lastUserIdRef.current;
    if (!uid) return;
    const client = getSupabase();
    if (!client) return;
    try {
      const local = storedValueRef.current;
      let skippedIds = [];
      if (dirtyRef.current) {
        try {
          const result = await persistNormalizedData(client, uid, local);
          skippedIds = result?.skippedIds || [];
          const writtenAt = result?.writtenAt || {};
          if (Object.keys(writtenAt).length > 0) {
            const stamped = {
              groups: applyPersistResult(storedValueRef.current.groups, { writtenAt }),
            };
            storedValueRef.current = stamped;
            setStoredValue(stamped);
          }
        } catch (persistErr) {
          const partial = persistErr?.persistPartial;
          if (partial && Object.keys(partial.writtenAt || {}).length > 0) {
            const stamped = {
              groups: applyPersistResult(storedValueRef.current.groups, {
                writtenAt: partial.writtenAt,
              }),
            };
            storedValueRef.current = stamped;
            setStoredValue(stamped);
            writeCache(uid, stamped, { pendingPersist: true });
          }
          console.error('Evenly cloud sync save failed:', persistErr);
          setSyncError(errorMessage(persistErr, 'Could not save to the cloud.'));
          return;
        }
      }
      const cloudData = await loadNormalizedData(client, uid);
      const merged = cloudData?.groups ? { groups: { ...cloudData.groups } } : defaultData();
      storedValueRef.current = merged;
      setStoredValue(merged);
      writeCache(uid, merged, { pendingPersist: false });
      purgeEvenlyDataFromLocalStorage();
      serverHydratedRef.current = true;
      dirtyRef.current = false;
      setSyncError(conflictSyncMessage({ skippedIds, reloaded: true }));
      setDataReady(true);
    } catch (e) {
      console.error('Evenly pull-to-refresh reload failed:', e);
      const cachedOnFail = readCloudUserCache(uid);
      const kept = resolveCloudFailureData(storedValueRef.current, cachedOnFail);
      storedValueRef.current = kept;
      setStoredValue(kept);
      setSyncError(errorMessage(e, 'Could not refresh.'));
      setDataReady(true);
    }
  }, [useServerOnly, user, writeCache]);

  const value = useMemo(
    () => ({
      data,
      setData,
      ready: dataReady,
      cloudSync: cloud && !syncError,
      syncError,
      clearSyncError,
      reloadFromServer,
      persistNow,
    }),
    [data, setData, dataReady, cloud, syncError, clearSyncError, reloadFromServer, persistNow],
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
