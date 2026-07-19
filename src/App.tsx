import { HashRouter, Route, Routes } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { PlayerPage } from '@/pages/PlayerPage';
import { useTheme } from '@/hooks/useTheme';

export const App = () => {
  useTheme();
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
