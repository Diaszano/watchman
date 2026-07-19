import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScreensaverCanvas } from '@/components/ScreensaverCanvas';
import { SettingsPanel } from '@/components/SettingsPanel';
import { FpsMonitor } from '@/components/FpsMonitor';
import { Button } from '@/components/Button';
import { useAnimationLoop } from '@/hooks/useAnimationLoop';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useI18n } from '@/hooks/useI18n';
import { useSettings } from '@/stores/settingsStore';
import { animationIds } from '@/animations';

export const PlayerPage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [paused, setPaused] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fps, setFps] = useState(0);
  const [uiVisible, setUiVisible] = useState(true);

  const showFps = useSettings((s) => s.showFps);
  const setSetting = useSettings((s) => s.set);
  const { toggle } = useFullscreen();
  const wake = useWakeLock(!paused);

  const onFps = useCallback((v: number) => setFps(v), []);
  useAnimationLoop({ canvasRef, paused, onFps });

  const step = useCallback(
    (dir: 1 | -1) => {
      const i = animationIds.indexOf(useSettings.getState().animationId);
      const next = animationIds[(i + dir + animationIds.length) % animationIds.length]!;
      setSetting('animationId', next);
    },
    [setSetting],
  );

  const handlers = useMemo(
    () => ({
      toggleFullscreen: () => toggle(),
      togglePause: () => setPaused((p) => !p),
      nextAnimation: () => step(1),
      prevAnimation: () => step(-1),
      toggleSettings: () => setSettingsOpen((o) => !o),
    }),
    [toggle, step],
  );
  useKeyboardShortcuts(handlers);

  // Auto-hide cursor + controls after idle. Panel open keeps them visible.
  useEffect(() => {
    let timer: number;
    const onActivity = () => {
      setUiVisible(true);
      clearTimeout(timer);
      timer = window.setTimeout(() => setUiVisible(false), 3000);
    };
    onActivity();
    window.addEventListener('mousemove', onActivity);
    window.addEventListener('touchstart', onActivity);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('touchstart', onActivity);
    };
  }, []);

  const controlsShown = uiVisible || settingsOpen;

  return (
    <div className={`relative h-full w-full bg-black ${controlsShown ? '' : 'cursor-none'}`}>
      <ScreensaverCanvas ref={canvasRef} />

      {showFps && <FpsMonitor fps={fps} />}

      {paused && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <span className="rounded-2xl bg-black/50 px-8 py-4 text-2xl font-semibold text-white/90 backdrop-blur">
            ⏸ {t('player.paused')}
          </span>
        </div>
      )}

      {!wake.supported && controlsShown && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-lg bg-amber-500/20 px-3 py-1.5 text-center text-xs text-amber-200 backdrop-blur">
          {t('settings.wakeLockUnsupported')}
        </div>
      )}

      <div
        className={`absolute right-3 top-3 z-30 flex gap-2 transition-opacity duration-300 ${
          controlsShown ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <Button variant="ghost" onClick={() => setPaused((p) => !p)}>
          {paused ? '▶' : '⏸'}
        </Button>
        <Button variant="ghost" onClick={() => setSettingsOpen((o) => !o)}>
          ⚙
        </Button>
        <Button variant="ghost" onClick={() => toggle()}>
          ⛶
        </Button>
        <Button variant="ghost" onClick={() => navigate('/')}>
          ✕
        </Button>
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};
