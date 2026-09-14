import { useState } from 'react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/Button';
import { AnimationSelector } from '@/components/AnimationSelector';
import { SettingsPanel } from '@/components/SettingsPanel';
import { useI18n } from '@/hooks/useI18n';
import { useFullscreen } from '@/hooks/useFullscreen';

export const HomePage = () => {
  const { t } = useI18n();
  const { toggle } = useFullscreen();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <main className="relative flex min-h-full items-center justify-center overflow-hidden bg-neutral-100 px-4 text-neutral-900 dark:bg-neutral-950 dark:text-white">
      <div className="pointer-events-none absolute -top-1/3 left-1/2 h-[80vh] w-[80vh] -translate-x-1/2 rounded-full bg-sky-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[60vh] w-[60vh] rounded-full bg-fuchsia-500/10 blur-3xl" />
      <div className="relative z-10 w-full max-w-xl">
        <div className="flex flex-col items-center gap-6 text-center">
          <Logo size={88} />
          <div>
            <h1 className="text-5xl font-bold tracking-tight">{t('app.title')}</h1>
            <p className="mt-2 text-neutral-600 dark:text-white/60">{t('app.subtitle')}</p>
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
            onClick={() => {
              window.location.hash = '/play';
            }}
          >
            ▶ {t('home.start')}
          </Button>
        </div>

        <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
    </main>
  );
};
