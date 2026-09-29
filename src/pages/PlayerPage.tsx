import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScreensaverBackground } from '@/components/ScreensaverBackground';
import { SettingsPanel } from '@/components/SettingsPanel';
import { ShortcutsOverlay } from '@/components/ShortcutsOverlay';
import { FpsMonitor } from '@/components/FpsMonitor';
import { IconButton } from '@/components/IconButton';
import {
  PlayIcon,
  PauseIcon,
  HelpIcon,
  SettingsIcon,
  FullscreenIcon,
  CloseIcon,
} from '@/components/icons';
import { useAnimationLoop } from '@/hooks/useAnimationLoop';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useI18n } from '@/hooks/useI18n';
import { useSettings } from '@/stores/settingsStore';
import { useStoredImage } from '@/hooks/useStoredImage';
import { animationIds } from '@/animations';

export const PlayerPage = () => {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [paused, setPaused] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [fps, setFps] = useState(0);
  const [uiVisible, setUiVisible] = useState(true);

  const animationId = useSettings((s) => s.animationId);
  const showFps = useSettings((s) => s.showFps);
  const customImageId = useSettings((s) => s.customImageId);
  const customImage = useStoredImage(customImageId);
  const setSetting = useSettings((s) => s.set);
  const { toggle } = useFullscreen();
  const wake = useWakeLock(!paused);

  const handleFps = useCallback((v: number) => setFps(v), []);
  const onFps = showFps ? handleFps : undefined;
  useAnimationLoop({ canvasRef, paused, onFps, customImageUrl: customImage.url });

  const step = useCallback(
    (dir: 1 | -1) => {
      const i = animationIds.indexOf(useSettings.getState().animationId);
      const next = animationIds[(i + dir + animationIds.length) % animationIds.length]!;
      setSetting('animationId', next);
    },
    [setSetting],
  );

  const handleEscape = useCallback(() => {
    if (shortcutsOpen) {
      setShortcutsOpen(false);
      return;
    }
    if (settingsOpen) {
      setSettingsOpen(false);
      return;
    }
    // Se não estiver em fullscreen nativo (o browser já trata fullscreen), volta para a Home
    if (!document.fullscreenElement) {
      window.location.hash = '';
    }
  }, [shortcutsOpen, settingsOpen]);

  const [hudFocused, setHudFocused] = useState(false);
  const hudFocusedRef = useRef(false);
  const idleTimerRef = useRef<number>(0);

  const resetIdleTimer = useCallback(() => {
    window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = window.setTimeout(() => {
      if (!hudFocusedRef.current) {
        setUiVisible(false);
      }
    }, 3000);
  }, []);

  const handlers = useMemo(
    () => ({
      toggleFullscreen: () => toggle(),
      togglePause: () => setPaused((p) => !p),
      nextAnimation: () => step(1),
      prevAnimation: () => step(-1),
      toggleSettings: () => setSettingsOpen((o) => !o),
      toggleShortcuts: () => setShortcutsOpen((o) => !o),
      escape: handleEscape,
    }),
    [toggle, step, handleEscape],
  );
  useKeyboardShortcuts(handlers, !settingsOpen && !shortcutsOpen);

  // Auto-hide cursor + controls after idle. Panel open or focused control keeps them visible.
  useEffect(() => {
    const onActivity = () => {
      setUiVisible(true);
      resetIdleTimer();
    };
    onActivity();
    window.addEventListener('mousemove', onActivity);
    window.addEventListener('touchstart', onActivity);
    window.addEventListener('keydown', onActivity);
    return () => {
      window.clearTimeout(idleTimerRef.current);
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('touchstart', onActivity);
      window.removeEventListener('keydown', onActivity);
    };
  }, [resetIdleTimer]);

  const controlsShown = uiVisible || settingsOpen || shortcutsOpen || hudFocused;

  return (
    <div className={`relative h-full w-full bg-black ${controlsShown ? '' : 'cursor-none'}`}>
      <ScreensaverBackground />
      <canvas ref={canvasRef} className="absolute inset-0 z-10 block h-full w-full" />

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
        role="toolbar"
        aria-label="Controls"
        onFocus={() => {
          hudFocusedRef.current = true;
          setHudFocused(true);
          setUiVisible(true);
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            hudFocusedRef.current = false;
            setHudFocused(false);
            resetIdleTimer();
          }
        }}
        className={`absolute right-3 top-3 z-30 flex gap-2 text-white transition-opacity duration-300 ${
          controlsShown ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <IconButton
          label={paused ? t('player.play') : t('player.pause')}
          icon={paused ? <PlayIcon /> : <PauseIcon />}
          onClick={() => setPaused((p) => !p)}
        />
        <IconButton
          label={t('player.shortcuts')}
          icon={<HelpIcon />}
          onClick={() => setShortcutsOpen(true)}
        />
        <IconButton
          label={t('player.settings')}
          icon={<SettingsIcon />}
          onClick={() => setSettingsOpen((o) => !o)}
        />
        <IconButton
          label={t('player.fullscreen')}
          icon={<FullscreenIcon />}
          onClick={() => toggle()}
        />
        <IconButton
          label={t('player.close')}
          icon={<CloseIcon />}
          onClick={() => {
            window.location.hash = '';
          }}
        />
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} overlay />
      <ShortcutsOverlay open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      <div
        aria-live="polite"
        className={`absolute bottom-3 left-3 z-30 rounded-md bg-black/50 px-2 py-1 text-xs text-white/90 backdrop-blur transition-opacity duration-300 ${
          controlsShown ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        {t(`anim.${animationId}`)}
      </div>
    </div>
  );
};
