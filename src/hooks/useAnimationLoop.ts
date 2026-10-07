import { useEffect, useRef, type RefObject } from 'react';
import { useSettings } from '@/stores/settingsStore';
import { getAnimation, getNextInPlaylist } from '@/animations';
import type { Animation, Settings } from '@/types';

interface Options {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  backgroundRef?: RefObject<HTMLDivElement | null>;
  paused: boolean;
  onFps?: (fps: number) => void;
  customImageUrl: string | null;
}

interface LoopController {
  start: () => void;
  stop: () => void;
  invalidate: () => void;
}

/**
 * Owns the requestAnimationFrame loop. Reads settings via getState() each frame
 * so tuning is live without triggering React re-renders. Handles DPR/4K sizing,
 * FPS cap, tab-visibility pause, anti-burn-in drift, and playlist auto-switch.
 */
export const useAnimationLoop = ({
  canvasRef,
  backgroundRef,
  paused,
  onFps,
  customImageUrl,
}: Options): void => {
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const onFpsRef = useRef(onFps);
  onFpsRef.current = onFps;

  const customImageUrlRef = useRef(customImageUrl);
  customImageUrlRef.current = customImageUrl;

  const backgroundRefRef = useRef(backgroundRef);
  backgroundRefRef.current = backgroundRef;

  const controllerRef = useRef<LoopController | null>(null);
  const canvas = canvasRef.current;

  useEffect(() => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let lastCallbackTime = performance.now();
    let lastRenderTime = lastCallbackTime;
    let time = 0;
    let accum = 0; // fps-cap accumulator
    let fpsAccum = 0;
    let fpsFrames = 0;
    let visible = !document.hidden;

    let currentId = useSettings.getState().animationId;
    let instance: Animation = getAnimation(currentId).create();
    let switchTimer = 0;

    // Anti burn-in drift state.
    let offX = 0;
    let offY = 0;
    let targetX = 0;
    let targetY = 0;
    let driftTimer = 0;

    // Cached DOM style states to avoid per-frame DOM style recalculation.
    let lastOpacity = '';

    let cssW = canvas.clientWidth;
    let cssH = canvas.clientHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const applyStyles = (s: Settings) => {
      const nextOpacity = String(s.animationId === 'solid' ? 1 : s.opacity);
      if (nextOpacity !== lastOpacity) {
        canvas.style.opacity = nextOpacity;
        lastOpacity = nextOpacity;
      }
    };

    const drawFrame = (dt: number) => {
      if (cssW <= 0 || cssH <= 0) return;
      const s = useSettings.getState();

      if (s.animationId !== currentId) {
        currentId = s.animationId;
        instance = getAnimation(currentId).create();
      }

      applyStyles(s);

      if (s.animationId === 'solid' || s.animationId === 'colorCycle') {
        offX = offY = targetX = targetY = driftTimer = 0;
      }

      const bg = backgroundRefRef.current?.current;
      const snappedOffX = Math.round(offX);
      const snappedOffY = Math.round(offY);
      if (bg) {
        if (s.antiBurnIn) {
          bg.style.transform = `translate(${snappedOffX}px, ${snappedOffY}px)`;
        } else if (bg.style.transform) {
          bg.style.transform = '';
        }
      }

      ctx.setTransform(dpr, 0, 0, dpr, snappedOffX * dpr, snappedOffY * dpr);
      // Clear a margin larger than the viewport so drift never exposes edges.
      ctx.clearRect(-30, -30, cssW + 60, cssH + 60);
      instance.draw({
        ctx,
        width: cssW,
        height: cssH,
        dt,
        time,
        settings: s,
        customImageUrl: customImageUrlRef.current,
      });
    };

    const loop = (now: number) => {
      raf = 0;
      if (!visible || pausedRef.current) {
        return;
      }

      raf = requestAnimationFrame(loop);

      const callbackElapsed = Math.max(0, (now - lastCallbackTime) / 1000);
      lastCallbackTime = now;

      const s = useSettings.getState();

      // FPS cap.
      if (s.fpsLimit > 0) {
        accum += callbackElapsed;
        const interval = 1 / s.fpsLimit;
        if (accum < interval - 0.001) return;
        accum = accum % interval;
      }

      const dt = Math.min(Math.max(0, now - lastRenderTime) / 1000, 0.1);

      lastRenderTime = now;
      time += dt;

      // FPS report (~4x/sec) only when subscriber exists
      if (onFpsRef.current) {
        fpsAccum += dt;
        fpsFrames++;
        if (fpsAccum >= 0.25) {
          onFpsRef.current(Math.round(fpsFrames / fpsAccum));
          fpsAccum = 0;
          fpsFrames = 0;
        }
      }

      // Playlist auto-switch.
      if (s.autoSwitch > 0 && s.playlist.length > 1) {
        switchTimer += dt;
        if (switchTimer >= s.autoSwitch) {
          switchTimer = 0;
          useSettings.getState().set('animationId', getNextInPlaylist(s));
        }
      }

      // Anti burn-in: slow global drift so nothing sits still.
      if (s.antiBurnIn && s.animationId !== 'solid' && s.animationId !== 'colorCycle') {
        driftTimer += dt;
        if (driftTimer > 5) {
          driftTimer = 0;
          targetX = (Math.random() - 0.5) * 24;
          targetY = (Math.random() - 0.5) * 24;
        }
        offX += (targetX - offX) * dt * 0.5;
        offY += (targetY - offY) * dt * 0.5;
      } else {
        offX = offY = 0;
        targetX = targetY = 0;
      }

      drawFrame(dt);
    };

    const startLoop = () => {
      if (raf !== 0 || !visible || pausedRef.current) return;
      lastCallbackTime = performance.now();
      lastRenderTime = lastCallbackTime;
      accum = 0;
      raf = requestAnimationFrame(loop);
    };

    const stopLoop = () => {
      if (raf !== 0) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    controllerRef.current = {
      start: startLoop,
      stop: stopLoop,
      invalidate: () => drawFrame(0),
    };

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w <= 0 || h <= 0) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.floor(w * dpr);
      const targetH = Math.floor(h * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      cssW = w;
      cssH = h;
      if (pausedRef.current) {
        drawFrame(0);
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const handleVisibilityChange = () => {
      visible = !document.hidden;
      if (visible && !pausedRef.current) {
        startLoop();
      } else {
        stopLoop();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const unsubscribe = useSettings.subscribe((state, prevState) => {
      if (state.animationId !== currentId) {
        currentId = state.animationId;
        instance = getAnimation(currentId).create();
        if (pausedRef.current) {
          drawFrame(0);
        }
      } else if (pausedRef.current) {
        if (
          state.size !== prevState.size ||
          state.color !== prevState.color ||
          state.colorPaletteId !== prevState.colorPaletteId ||
          state.customColorPalette !== prevState.customColorPalette ||
          state.opacity !== prevState.opacity ||
          state.customText !== prevState.customText ||
          state.count !== prevState.count ||
          state.antiBurnIn !== prevState.antiBurnIn
        ) {
          if (!state.antiBurnIn) {
            offX = offY = 0;
          }
          drawFrame(0);
        }
      }
    });

    if (!pausedRef.current) {
      startLoop();
    } else {
      drawFrame(0);
    }

    return () => {
      stopLoop();
      controllerRef.current = null;
      ro.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      unsubscribe();
      const bg = backgroundRefRef.current?.current;
      if (bg) {
        bg.style.transform = '';
      }
    };
  }, [canvas]);

  useEffect(() => {
    if (paused) {
      controllerRef.current?.stop();
    } else {
      controllerRef.current?.start();
    }
  }, [paused]);

  useEffect(() => {
    if (pausedRef.current && customImageUrl !== undefined) {
      controllerRef.current?.invalidate();
    }
  }, [customImageUrl]);
};
