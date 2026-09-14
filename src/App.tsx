import { useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { PlayerPage } from '@/pages/PlayerPage';
import { useSettings } from '@/stores/settingsStore';

export const App = () => {
  const theme = useSettings((s) => s.theme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  return (
    // HashRouter: works when served as static files from any path (Nginx/PWA).
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/play" element={<PlayerPage />} />
      </Routes>
    </HashRouter>
  );
};
