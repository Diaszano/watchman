import { useCallback, useEffect, useState } from 'react';

export const useFullscreen = () => {
  const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const enter = useCallback(async (el?: HTMLElement) => {
    const target = el ?? document.documentElement;
    if (target.requestFullscreen) await target.requestFullscreen().catch(() => {});
  }, []);

  const exit = useCallback(async () => {
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
  }, []);

  const toggle = useCallback(
    (el?: HTMLElement) => (document.fullscreenElement ? exit() : enter(el)),
    [enter, exit],
  );

  return {
    isFullscreen,
    enter,
    exit,
    toggle,
    supported: !!document.documentElement.requestFullscreen,
  };
};
