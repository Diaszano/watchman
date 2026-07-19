import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CenteredLayout } from '@/layouts/CenteredLayout';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/Button';
import { AnimationSelector } from '@/components/AnimationSelector';
import { SettingsPanel } from '@/components/SettingsPanel';
import { useI18n } from '@/hooks/useI18n';
import { useFullscreen } from '@/hooks/useFullscreen';

export const HomePage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { toggle } = useFullscreen();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <CenteredLayout>
      <div className="flex flex-col items-center gap-6 text-center">
        <Logo size={88} />
        <div>
          <h1 className="text-5xl font-bold tracking-tight">{t('app.title')}</h1>
          <p className="mt-2 text-white/60">{t('app.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <AnimationSelector />
          <Button variant="ghost" onClick={() => toggle()}>
            ⛶ {t('home.fullscreen')}
          </Button>
          <Button variant="ghost" onClick={() => setSettingsOpen(true)}>
            ⚙ {t('home.settings')}
          </Button>
        </div>

        <Button
          variant="primary"
          className="mt-2 px-10 py-3 text-lg"
          onClick={() => navigate('/play')}
        >
          ▶ {t('home.start')}
        </Button>
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </CenteredLayout>
  );
};
