import { useEffect, useRef } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { IconButton } from './IconButton';
import { CloseIcon } from './icons';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const ShortcutsOverlay = ({ open, onClose }: Props) => {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      if (!openerRef.current && document.activeElement) {
        openerRef.current = document.activeElement as HTMLElement;
      }
      const dialog = dialogRef.current;
      if (dialog && !dialog.open) {
        dialog.showModal();
      }
    } else {
      const dialog = dialogRef.current;
      if (dialog?.open) {
        dialog.close();
      }
      if (openerRef.current?.isConnected) {
        openerRef.current.focus();
        openerRef.current = null;
      }
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (openerRef.current?.isConnected) {
        openerRef.current.focus();
      }
    };
  }, []);

  if (!open) return null;

  const rows: Array<[string, string]> = [
    ['F', t('shortcuts.action.fullscreen')],
    ['Space', t('shortcuts.action.pause')],
    ['S', t('shortcuts.action.settings')],
    ['N', t('shortcuts.action.next')],
    ['P', t('shortcuts.action.prev')],
    ['H | ?', t('shortcuts.action.shortcuts')],
  ];

  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target !== e.currentTarget) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const rect = dialog.getBoundingClientRect();
    const isInDialog =
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width;

    if (!isInDialog) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="shortcuts-dialog-title"
      onClick={handleDialogClick}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="fixed inset-0 m-auto h-fit w-80 max-w-[90vw] rounded-2xl border border-white/10 bg-neutral-900/90 p-6 text-white backdrop-blur-xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="relative">
        <IconButton
          onClick={onClose}
          label={t('shortcuts.close')}
          icon={<CloseIcon />}
          className="absolute -right-2 -top-2 border-white/10 bg-white/10 text-white hover:bg-white/20"
        />
        <h2 id="shortcuts-dialog-title" className="mb-4 pr-6 text-lg font-semibold">
          {t('shortcuts.title')}
        </h2>
        <ul className="flex flex-col gap-3">
          {rows.map(([key, label]) => (
            <li key={label} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-white/80">{label}</span>
              <kbd className="rounded bg-white/10 px-2 py-0.5 font-mono text-xs">{key}</kbd>
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  );
};
