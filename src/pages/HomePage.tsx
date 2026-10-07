import { useState } from 'react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/Button';
import { PlayIcon } from '@/components/icons';
import { AnimationSelector } from '@/components/AnimationSelector';
import { SettingsPanel } from '@/components/SettingsPanel';
import { ShortcutsOverlay } from '@/components/ShortcutsOverlay';
import { DesktopHeader } from '@/components/DesktopHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ToastContainer } from '@/components/ui/Toast';
import { useI18n } from '@/hooks/useI18n';

type CategoryFilter = 'all' | 'classic' | 'effects' | 'custom';

export const HomePage = () => {
  const { t } = useI18n();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');

  return (
    <div className="desktop-shell">
      <DesktopHeader
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />

      <main className="desktop-main">
        <div className="home-content">
          <section className="home-hero" aria-labelledby="home-title">
            <div className="hero-copy">
              <h1 id="home-title">
                {t('home.headline')} <span>{t('home.headlineAccent')}</span>
              </h1>
              <p className="hero-description">{t('app.subtitle')}</p>
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  window.location.hash = '/play';
                }}
              >
                <PlayIcon /> {t('home.start')}
              </Button>
            </div>
            <div className="hero-art" aria-hidden="true">
              <Logo size={160} />
            </div>
          </section>

          <section className="animation-library" aria-labelledby="animation-title">
            <div className="library-heading">
              <div>
                <h2 id="animation-title">{t('home.choose')}</h2>
                <p className="library-note">{t('home.selectionHint')}</p>
              </div>
              <div className="library-controls">
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder={t('home.search')}
                />
                <SegmentedControl<CategoryFilter>
                  size="sm"
                  value={category}
                  options={[
                    { value: 'all', label: t('home.all') },
                    { value: 'classic', label: t('home.category.classic') },
                    { value: 'effects', label: t('home.category.effects') },
                    { value: 'custom', label: t('home.category.custom') },
                  ]}
                  onChange={setCategory}
                />
              </div>
            </div>

            <AnimationSelector
              category={category}
              searchQuery={searchQuery}
              onClearSearch={() => setSearchQuery('')}
            />
          </section>
        </div>
      </main>

      {/* Sheets & Dialogs */}
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ShortcutsOverlay open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <ToastContainer />
    </div>
  );
};
