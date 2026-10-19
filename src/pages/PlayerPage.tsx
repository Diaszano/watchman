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

  const backgroundRef = useRef<HTMLDivElement>(null);
  const brightness = useSettings((s) => s.brightness);
  const animationId = useSettings((s) => s.animationId);
  const showFps = useSettings((s) => s.showFps);
  const customImageId = useSettings((s) => s.customImageId);
  const customImage = useStoredImage(customImageId);
  const setSetting = useSettings((s) => s.set);
  const { toggle } = useFullscreen();
  const wake = useWakeLock(!paused);

  const handleFps = useCallback((v: number) => setFps(v), []);
  const onFps = showFps ? handleFps : undefined;
  useAnimationLoop({
    canvasRef,
    backgroundRef,
    paused,
    onFps,
    customImageUrl: customImage.url,
  });

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
    // Return to Home if not in browser native fullscreen
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
      toggleSettings: () => {
        setShortcutsOpen(false);
        setSettingsOpen((o) => !o);
      },
      toggleShortcuts: () => {
        setSettingsOpen(false);
        setShortcutsOpen((o) => !o);
      },
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
      <div
        data-testid="screensaver-scene"
        className="relative h-full w-full overflow-hidden"
        style={{ filter: `brightness(${brightness})` }}
      >
        <ScreensaverBackground ref={backgroundRef} />
        <canvas ref={canvasRef} className="absolute inset-0 z-10 block h-full w-full" />
      </div>

      {showFps && <FpsMonitor fps={fps} />}

      {paused && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <span className="rounded-3xl border border-white/10 bg-black/60 px-8 py-4 text-xl font-semibold text-white/95 backdrop-blur-2xl shadow-2xl flex items-center gap-3">
            <span className="text-xl">⏸</span>
            <span>{t('player.paused')}</span>
          </span>
        </div>
      )}

      {!wake.supported && controlsShown && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-xl border border-amber-500/30 bg-amber-950/40 px-3.5 py-1.5 text-center text-xs font-medium text-amber-200 backdrop-blur-xl shadow-lg">
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
        className={`absolute right-4 top-4 z-30 flex items-center gap-1.5 p-1.5 rounded-2xl bg-black/50 border border-white/10 text-white backdrop-blur-xl shadow-2xl transition-opacity duration-300 ${
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
          onClick={() => {
            setSettingsOpen(false);
            setShortcutsOpen((o) => !o);
          }}
        />
        <IconButton
          label={t('player.settings')}
          icon={<SettingsIcon />}
          onClick={() => {
            setShortcutsOpen(false);
            setSettingsOpen((o) => !o);
          }}
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
        className={`absolute bottom-4 left-4 z-30 flex items-center gap-2 rounded-xl border border-white/10 bg-black/60 px-3.5 py-1.5 text-xs font-medium text-white/90 backdrop-blur-xl shadow-lg transition-opacity duration-300 ${
          controlsShown ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
        <span>{t(`anim.${animationId}`)}</span>
      </div>
    </div>
  );
};
