import { useEffect, type RefObject } from 'react';
import { useSettings } from '@/stores/settingsStore';
import { getAnimation, getNextInPlaylist } from '@/animations/playlist';
import type { Animation } from '@/types';
import {
  getCanvasDimensions,
  initialAutoQualityState,
  nextAutoQualityState,
  QUALITY_PROFILES,
} from '@/utils/renderQuality';

interface Options {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  paused: boolean;
  onFps?: (fps: number) => void;
  customImageUrl: string | null;
}

/**
 * Owns the requestAnimationFrame loop. Reads settings via getState() each frame
 * so tuning is live without triggering React re-renders. Handles DPR/4K sizing,
 * FPS cap, tab-visibility pause, anti-burn-in drift, and playlist auto-switch.
 */
export const useAnimationLoop = ({ canvasRef, paused, onFps, customImageUrl }: Options): void => {
  useEffect(() => {
    const canvas = canvasRef.current;
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
    let autoState = initialAutoQualityState();

    let currentId = '';
    let instance: Animation | null = null;
    let switchTimer = 0;

    // Anti burn-in drift state.
    let offX = 0;
    let offY = 0;
    let targetX = 0;
    let targetY = 0;
    let driftTimer = 0;

    // Cached DOM style states to avoid per-frame DOM style recalculation.
    let lastFilter = '';
    let lastOpacity = '';

    let cssW = 0;
    let cssH = 0;
    let lastSizedLevel = autoState.level;
    const resize = () => {
      cssW = canvas.clientWidth;
      cssH = canvas.clientHeight;
      if (cssW <= 0 || cssH <= 0) return 1;

      const quality = useSettings.getState().renderQuality;
      const level = quality === 'auto' ? autoState.level : quality;
      lastSizedLevel = level;
      const dimensions = getCanvasDimensions({
        cssWidth: cssW,
        cssHeight: cssH,
        deviceDpr: window.devicePixelRatio || 1,
        level,
      });
      if (canvas.width !== dimensions.width) canvas.width = dimensions.width;
      if (canvas.height !== dimensions.height) canvas.height = dimensions.height;
      return dimensions.dpr;
    };
    let dpr = resize();
    const ro = new ResizeObserver(() => {
      dpr = resize();
    });
    ro.observe(canvas);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const callbackElapsed = Math.max(0, (now - lastCallbackTime) / 1000);
      lastCallbackTime = now;
      if (paused) return;

      const s = useSettings.getState();
      const intervalMs = s.fpsLimit > 0 ? 1_000 / s.fpsLimit : 1_000 / 60;

      // FPS cap.
      if (s.fpsLimit > 0) {
        accum += callbackElapsed;
        const interval = 1 / s.fpsLimit;
        if (accum < interval) return;
        accum = accum % interval;
      }
      const dt = Math.min(Math.max(0, now - lastRenderTime) / 1000, 0.1);
      lastRenderTime = now;
      time += dt;

      // FPS report (~4x/sec).
      fpsAccum += dt;
      fpsFrames++;
      if (fpsAccum >= 0.25) {
        onFps?.(Math.round(fpsFrames / fpsAccum));
        fpsAccum = 0;
        fpsFrames = 0;
      }

      // Playlist auto-switch.
      if (s.autoSwitch > 0 && s.playlist.length > 1) {
        switchTimer += dt;
        if (switchTimer >= s.autoSwitch) {
          switchTimer = 0;
          useSettings.getState().set('animationId', getNextInPlaylist(s));
        }
      }

      // (Re)create animation on id change.
      if (s.animationId !== currentId || !instance) {
        currentId = s.animationId;
        instance = getAnimation(currentId).create();
      }

      const effectiveLevel = s.renderQuality === 'auto' ? autoState.level : s.renderQuality;
      if (effectiveLevel !== lastSizedLevel) dpr = resize();

      // Anti burn-in: slow global drift so nothing sits still.
      const brightness = s.brightness;
      if (s.antiBurnIn) {
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
      }

      // Only update DOM styles when the computed string actually changes.
      const nextFilter = `brightness(${brightness})`;
      if (nextFilter !== lastFilter) {
        canvas.style.filter = nextFilter;
        lastFilter = nextFilter;
      }

      const nextOpacity = String(s.opacity);
      if (nextOpacity !== lastOpacity) {
        canvas.style.opacity = nextOpacity;
        lastOpacity = nextOpacity;
      }

      ctx.setTransform(dpr, 0, 0, dpr, offX * dpr, offY * dpr);
      // Clear a margin larger than the viewport so drift never exposes edges.
      ctx.clearRect(-30, -30, cssW + 60, cssH + 60);
      const drawStartedAt = performance.now();
      instance.draw({
        ctx,
        width: cssW,
        height: cssH,
        dt,
        time,
        settings: s,
        renderDensity: QUALITY_PROFILES[effectiveLevel].density,
        customImageUrl,
      });
      const drawMs = performance.now() - drawStartedAt;
      if (s.renderQuality === 'auto') {
        const nextState = nextAutoQualityState(autoState, drawMs, intervalMs);
        const levelChanged = nextState.level !== autoState.level;
        autoState = nextState;
        if (levelChanged) dpr = resize();
      }
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [canvasRef, paused, onFps, customImageUrl]);
};
