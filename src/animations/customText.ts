import type { Animation, AnimationFrame } from '@/types';
import { rand } from '@/utils/math';

export const createCustomText = (): Animation => {
  let initialized = false;
  let x = 0;
  let y = 0;
  let vx = 1;
  let vy = 1;
  let lastWidth = 0;
  let lastHeight = 0;

  return {
    draw({ ctx, width, height, dt, settings }: AnimationFrame) {
      if (width <= 0 || height <= 0) return;

      const text = settings.customText || 'Watchman';
      const marginX = Math.min(12, width / 4);
      const marginY = Math.min(12, height / 4);
      const maxW = Math.max(1, width - marginX * 2);
      const maxH = Math.max(1, height - marginY * 2);

      const prefFontSize = settings.size * 2;
      ctx.font = `bold ${prefFontSize}px system-ui, sans-serif`;
      const measuredW = ctx.measureText ? ctx.measureText(text)?.width || 1 : 1;
      const measuredH = prefFontSize;
      const fitScale = Math.min(1, maxW / measuredW, maxH / measuredH);
      const fontSize = Math.max(1, prefFontSize * fitScale);

      ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const halfW = (ctx.measureText ? ctx.measureText(text)?.width || 1 : 1) / 2;
      const halfH = fontSize / 2;

      if (!initialized) {
        initialized = true;
        x = width / 2;
        y = height / 2;
        const a = rand(0, Math.PI * 2);
        vx = Math.cos(a);
        vy = Math.sin(a);
      } else if (
        lastWidth > 0 &&
        lastHeight > 0 &&
        (width !== lastWidth || height !== lastHeight)
      ) {
        x = (x / lastWidth) * width;
        y = (y / lastHeight) * height;
      }
      lastWidth = width;
      lastHeight = height;

      const speed = 120 * settings.speed;
      x += vx * speed * dt;
      y += vy * speed * dt;

      const minX = marginX + halfW;
      const maxX = width - marginX - halfW;
      const minY = marginY + halfH;
      const maxY = height - marginY - halfH;

      if (maxX <= minX) {
        x = width / 2;
      } else {
        if (x < minX) {
          x = minX;
          vx = Math.abs(vx);
        } else if (x > maxX) {
          x = maxX;
          vx = -Math.abs(vx);
        }
      }

      if (maxY <= minY) {
        y = height / 2;
      } else {
        if (y < minY) {
          y = minY;
          vy = Math.abs(vy);
        } else if (y > maxY) {
          y = maxY;
          vy = -Math.abs(vy);
        }
      }

      ctx.fillStyle = settings.color;
      ctx.fillText(text, x, y);
    },
  };
};
