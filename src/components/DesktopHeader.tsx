import { Logo } from '@/components/Logo';
import { Button } from '@/components/Button';
import { SettingsIcon, HelpIcon } from '@/components/icons';
import { useI18n } from '@/hooks/useI18n';

interface Props {
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
}

export const DesktopHeader = ({ onOpenSettings, onOpenShortcuts }: Props) => {
  const { t } = useI18n();

  return (
    <header className="desktop-toolbar">
      <a href="#/" className="brand">
        <Logo size={24} />
        <span className="text-sm font-semibold tracking-tight">
          watchman<span className="brand-dot">.</span>
        </span>
      </a>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={onOpenShortcuts}
          title={t('shortcuts.title')}
          aria-label={t('shortcuts.title')}
        >
          <HelpIcon />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={onOpenSettings}
          title={t('home.settings')}
          aria-label={t('home.settings')}
        >
          <SettingsIcon />
          <span className="hidden sm:inline">{t('home.settings')}</span>
        </Button>
      </div>
    </header>
  );
};
