import { useEffect } from 'react';

const THEME = 'light';

export function useTheme() {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', THEME);
  }, []);

  return {
    theme: THEME,
  };
}
