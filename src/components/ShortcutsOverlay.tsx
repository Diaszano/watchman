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
      className="fixed inset-0 m-auto h-fit w-96 max-w-[92vw] rounded-3xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6 text-[var(--text-primary)] shadow-2xl backdrop-blur-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="relative">
        <div className="flex items-center justify-between pb-3.5 mb-2 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] text-sm font-semibold">
              ⌘
            </span>
            <h2
              id="shortcuts-dialog-title"
              className="text-base font-semibold text-[var(--text-primary)]"
            >
              {t('shortcuts.title')}
            </h2>
          </div>
          <IconButton
            onClick={onClose}
            label={t('shortcuts.close')}
            icon={<CloseIcon />}
            className="border-transparent bg-transparent hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
          />
        </div>
        <ul className="flex flex-col divide-y divide-[var(--border)]/50">
          {rows.map(([key, label]) => (
            <li
              key={label}
              className="flex items-center justify-between py-2.5 text-xs sm:text-[13px]"
            >
              <span className="text-[var(--text-secondary)] font-medium">{label}</span>
              <kbd className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 text-[11px] font-mono font-medium rounded-md bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] shadow-[0_1px_1px_rgba(0,0,0,0.1)]">
                {key}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  );
};
