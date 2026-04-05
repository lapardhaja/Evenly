import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'evenly:app:v1';

const defaultState = () => ({
  groups: [],
  meName: '',
});

/**
 * @template T
 * @param {string} key
 * @param {() => T} getDefault
 * @returns {[T, (updater: T | ((prev: T) => T)) => void]}
 */
export function useLocalStorage(key, getDefault) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...getDefault(), ...parsed };
      }
    } catch {
      /* ignore */
    }
    return getDefault();
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* quota */
    }
  }, [key, state]);

  const update = useCallback((updater) => {
    setState((prev) =>
      typeof updater === 'function' ? updater(prev) : updater
    );
  }, []);

  return [state, update];
}

export { STORAGE_KEY, defaultState };
