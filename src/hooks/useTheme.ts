import { useEffect } from 'react';
import { useSettings } from '@/stores/settingsStore';

/** Applies the current theme as a `dark` class on <html> for Tailwind. */
export const useTheme = (): void => {
  const theme = useSettings((s) => s.theme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
};
