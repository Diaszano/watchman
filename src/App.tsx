import { useEffect, useState } from 'react';
import { HomePage } from '@/pages/HomePage';
import { PlayerPage } from '@/pages/PlayerPage';
import { useSettings } from '@/stores/settingsStore';

export const App = () => {
  const theme = useSettings((s) => s.theme);
  const lang = useSettings((s) => s.lang);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.lang = lang;
  }, [theme, lang]);

  const [route, setRoute] = useState(() => window.location.hash);

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return route === '#/play' ? <PlayerPage /> : <HomePage />;
};
