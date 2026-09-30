import { useCallback } from 'react';

export const useFullscreen = () => {
  const toggle = useCallback(async (el?: HTMLElement) => {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
      return;
    }
    const target = el ?? document.documentElement;
    if (target.requestFullscreen) {
      await target.requestFullscreen().catch(() => {});
    }
  }, []);

  return { toggle };
};
