import useMediaQuery from '@mui/material/useMediaQuery';
import useLocalStorage from './useLocalStorage.js';

/** @typedef {'system' | 'light' | 'dark'} ThemeMode */

const STORAGE_KEY = 'evenly:themeMode';

/**
 * Theme appearance: follow system, or force light/dark.
 * Persists in localStorage; "system" uses prefers-color-scheme.
 */
export default function useThemeMode() {
  const [themeMode, setThemeMode] = useLocalStorage(STORAGE_KEY, 'system');
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)', { noSsr: true });

  const normalized =
    themeMode === 'light' || themeMode === 'dark' || themeMode === 'system'
      ? themeMode
      : 'system';

  const resolvedMode = normalized === 'system' ? (prefersDark ? 'dark' : 'light') : normalized;

  return {
    themeMode: normalized,
    setThemeMode,
    resolvedMode,
    isDark: resolvedMode === 'dark',
  };
}
