import { useEffect, useState } from 'react';

const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

/**
 * Holds a screen wake lock while `enabled`. Reacquires automatically after the
 * OS releases it (e.g. tab hidden then shown). Degrades silently when the API
 * is unsupported — callers can surface `supported` to the user.
 */
export const useWakeLock = (enabled: boolean) => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!supported || !enabled) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        sentinel = await navigator.wakeLock.request('screen');
        if (cancelled) {
          await sentinel.release();
          return;
        }
        setActive(true);
        sentinel.addEventListener('release', () => setActive(false));
      } catch {
        setActive(false);
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible' && (!sentinel || sentinel.released))
        void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void sentinel?.release().catch(() => {});
      setActive(false);
    };
  }, [enabled]);

  return { supported, active };
};
