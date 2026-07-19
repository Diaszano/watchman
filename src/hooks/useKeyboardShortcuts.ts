import { useEffect } from 'react';

export interface ShortcutHandlers {
  toggleFullscreen: () => void;
  togglePause: () => void;
  nextAnimation: () => void;
  prevAnimation: () => void;
  toggleSettings: () => void;
}

/** Global keyboard control. Ignores keys while typing in inputs. */
export const useKeyboardShortcuts = (h: ShortcutHandlers): void => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable))
        return;

      switch (e.key.toLowerCase()) {
        case 'f':
          h.toggleFullscreen();
          break;
        case ' ':
          e.preventDefault();
          h.togglePause();
          break;
        case 'n':
          h.nextAnimation();
          break;
        case 'p':
          h.prevAnimation();
          break;
        case 's':
          h.toggleSettings();
          break;
        // Esc: browser exits fullscreen natively; nothing to do.
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [h]);
};
