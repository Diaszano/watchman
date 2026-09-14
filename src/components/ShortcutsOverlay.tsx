import { useI18n } from '@/hooks/useI18n';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const ShortcutsOverlay = ({ open, onClose }: Props) => {
  const { t } = useI18n();

  if (!open) return null;

  const rows: Array<[string, string]> = [
    ['F', t('shortcuts.action.fullscreen')],
    ['Space', t('shortcuts.action.pause')],
    ['S', t('shortcuts.action.settings')],
    ['N', t('shortcuts.action.next')],
    ['P', t('shortcuts.action.prev')],
    ['H | ?', t('shortcuts.action.shortcuts')],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        aria-label={t('shortcuts.close')}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('shortcuts.title')}
        className="relative w-80 max-w-[90vw] rounded-2xl border border-white/10 bg-neutral-900/90 p-6 text-white backdrop-blur-xl"
      >
        <button
          onClick={onClose}
          aria-label={t('shortcuts.close')}
          className="absolute right-4 top-4 text-white/60 hover:text-white"
        >
          ✕
        </button>
        <h2 className="mb-4 pr-6 text-lg font-semibold">{t('shortcuts.title')}</h2>
        <ul className="flex flex-col gap-3">
          {rows.map(([key, label]) => (
            <li key={label} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-white/80">{label}</span>
              <kbd className="rounded bg-white/10 px-2 py-0.5 font-mono text-xs">{key}</kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
