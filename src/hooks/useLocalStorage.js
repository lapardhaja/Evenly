import { useState, useCallback } from 'react';

export default function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (updater) => {
      setStoredValue((prev) => {
        const next = updater instanceof Function ? updater(prev) : updater;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* quota exceeded */
        }
        return next;
      });
    },
    [key],
  );

  return [storedValue, setValue];
}
