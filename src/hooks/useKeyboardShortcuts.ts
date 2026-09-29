import { useEffect, useRef } from 'react';

export interface ShortcutHandlers {
  toggleFullscreen: () => void;
  togglePause: () => void;
  nextAnimation: () => void;
  prevAnimation: () => void;
  toggleSettings: () => void;
  toggleShortcuts?: () => void;
  escape?: () => void;
}

/** Global keyboard control. Ignores keys while typing in inputs. */
export const useKeyboardShortcuts = (h: ShortcutHandlers, enabled = true): void => {
  const handlersRef = useRef(h);
  handlersRef.current = h;

  useEffect(() => {
    if (!enabled) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || e.isComposing) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const el = e.target as HTMLElement | null;
      if (el && typeof el.closest === 'function') {
        if (
          el.isContentEditable ||
          el.closest('input, textarea, select, button, a, [contenteditable="true"]')
        ) {
          return;
        }
      }

      const handlers = handlersRef.current;
      switch (e.key.toLowerCase()) {
        case 'f':
          handlers.toggleFullscreen();
          break;
        case ' ':
          e.preventDefault();
          handlers.togglePause();
          break;
        case 'n':
          handlers.nextAnimation();
          break;
        case 'p':
          handlers.prevAnimation();
          break;
        case 's':
          handlers.toggleSettings();
          break;
        case 'h':
        case '?':
          handlers.toggleShortcuts?.();
          break;
        // Esc: no preventDefault so the browser still exits fullscreen natively.
        case 'escape':
          if (handlers.escape) handlers.escape();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
};
