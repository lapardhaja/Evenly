import { useState, useCallback, useRef } from 'react';

export default function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  // Keep latest value in a ref so we can persist to localStorage synchronously.
  // Otherwise writes only happen when React runs the setState updater — after
  // navigate() the next page can mount and read storage before the updater runs
  // (e.g. create group + Enter → "Group not found").
  const storedValueRef = useRef(storedValue);
  storedValueRef.current = storedValue;

  const setValue = useCallback(
    (updater) => {
      const prev = storedValueRef.current;
      const next = updater instanceof Function ? updater(prev) : updater;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* quota exceeded */
      }
      storedValueRef.current = next;
      setStoredValue(next);
    },
    [key],
  );

  return [storedValue, setValue];
}
