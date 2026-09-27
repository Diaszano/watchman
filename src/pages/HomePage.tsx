import { useState } from 'react';
import { Logo } from '@/components/Logo';
import { PlayIcon, SettingsIcon, FullscreenIcon } from '@/components/icons';
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
    <main className="home-shell">
      <div className="home-content">
        <header className="home-header">
          <div className="brand">
            <Logo size={64} />
            <span>
              watchman<span className="brand-dot">.</span>
            </span>
          </div>
          <Button onClick={() => setSettingsOpen(true)}>
            <SettingsIcon /> {t('home.settings')}
          </Button>
        </header>

        <section className="home-hero" aria-labelledby="home-title">
          <div>
            <p className="eyebrow">
              <span /> {t('home.eyebrow')}
            </p>
            <h1 id="home-title">
              {t('home.headline')}
              <br />
              <span>{t('home.headlineAccent')}</span>
            </h1>
            <p className="hero-description">{t('app.subtitle')}</p>
            <div className="hero-actions">
              <Button
                variant="primary"
                onClick={() => {
                  window.location.hash = '/play';
                }}
              >
                <PlayIcon /> {t('home.start')}
              </Button>
              <Button onClick={() => toggle()}>
                <FullscreenIcon /> {t('home.fullscreen')}
              </Button>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="orbit orbit-outer" />
            <div className="orbit orbit-inner" />
            <div className="hero-mark">
              <Logo size={260} />
            </div>
            <span className="art-caption">WATCHMAN / SCREENSAVER</span>
          </div>
        </section>

        <section className="animation-library" aria-labelledby="animation-title">
          <div className="library-heading">
            <div>
              <p className="eyebrow">{t('home.collection')}</p>
              <h2 id="animation-title">{t('home.choose')}</h2>
            </div>
            <span className="library-note">{t('home.selectionHint')}</span>
          </div>
          <AnimationSelector />
        </section>
        <footer className="home-footer">
          <span>{t('home.footer')}</span>
          <span>
            WATCHMAN <span className="brand-dot">✦</span>
          </span>
        </footer>
      </div>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
};
