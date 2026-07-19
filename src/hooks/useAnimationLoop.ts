import { useEffect, type RefObject } from 'react';
import { useSettings } from '@/stores/settingsStore';
import { getAnimation, getNextInPlaylist } from '@/animations/playlist';
import type { Animation } from '@/types';

interface Options {
  canvasRef: RefObject<HTMLCanvasElement>;
  paused: boolean;
  onFps?: (fps: number) => void;
}

/**
 * Owns the requestAnimationFrame loop. Reads settings via getState() each frame
 * so tuning is live without triggering React re-renders. Handles DPR/4K sizing,
 * FPS cap, tab-visibility pause, anti-burn-in drift, playlist auto-switch, and
 * background rendering.
 */
export const useAnimationLoop = ({ canvasRef, paused, onFps }: Options): void => {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    let time = 0;
    let accum = 0; // fps-cap accumulator
    let fpsAccum = 0;
    let fpsFrames = 0;

    let currentId = '';
    let instance: Animation | null = null;
    let switchTimer = 0;

    // Anti burn-in drift state.
    let offX = 0;
    let offY = 0;
    let targetX = 0;
    let targetY = 0;
    let driftTimer = 0;

    // Cached background image state.
    let bgImg: HTMLImageElement | null = null;
    let bgSrc = '';
    let bgLoadError = false;

    // Cached DOM style states to avoid per-frame DOM style recalculation.
    let lastFilter = '';
    let lastOpacity = '';

    let cssW = 0;
    let cssH = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3); // cap for 4K perf
      cssW = canvas.clientWidth;
      cssH = canvas.clientHeight;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      return dpr;
    };
    let dpr = resize();
    const ro = new ResizeObserver(() => {
      dpr = resize();
    });
    ro.observe(canvas);

    const drawBackground = (s: ReturnType<typeof useSettings.getState>) => {
      if (s.backgroundImage && !bgLoadError) {
        if (s.backgroundImage !== bgSrc) {
          bgSrc = s.backgroundImage;
          bgLoadError = false;
          const el = new Image();
          el.onload = () => {
            bgImg = el;
          };
          el.onerror = () => {
            bgLoadError = true;
            bgImg = null;
          };
          el.src = bgSrc;
        }
        if (bgImg && bgImg.complete && bgImg.naturalWidth) {
          const scale = Math.max(cssW / bgImg.naturalWidth, cssH / bgImg.naturalHeight);
          const w = bgImg.naturalWidth * scale;
          const h = bgImg.naturalHeight * scale;
          ctx.drawImage(bgImg, (cssW - w) / 2, (cssH - h) / 2, w, h);
          return;
        }
      }
      if (s.gradientBackground) {
        const g = ctx.createLinearGradient(0, 0, cssW, cssH);
        g.addColorStop(0, s.background);
        g.addColorStop(1, s.color);
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = s.background;
      }
      ctx.fillRect(0, 0, cssW, cssH);
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const rawDt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (paused) return;

      const s = useSettings.getState();

      // FPS cap.
      if (s.fpsLimit > 0) {
        accum += rawDt;
        const interval = 1 / s.fpsLimit;
        if (accum < interval) return;
        accum = accum % interval;
      }
      const dt = rawDt;
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

      // Anti burn-in: slow global drift so nothing sits still, plus a faint
      // brightness pulse.
      let brightness = s.brightness;
      if (s.antiBurnIn) {
        driftTimer += dt;
        if (driftTimer > 5) {
          driftTimer = 0;
          targetX = (Math.random() - 0.5) * 24;
          targetY = (Math.random() - 0.5) * 24;
        }
        offX += (targetX - offX) * dt * 0.5;
        offY += (targetY - offY) * dt * 0.5;
        brightness *= 0.94 + 0.06 * Math.sin(time * 0.4);
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
      drawBackground(s);

      instance.draw({ ctx, width: cssW, height: cssH, dt, time, settings: s });
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [canvasRef, paused, onFps]);
};
