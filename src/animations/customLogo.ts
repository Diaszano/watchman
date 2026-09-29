import type { Animation, AnimationFrame } from '@/types';
import { translate } from '@/services/i18n';
import { rand } from '@/utils/math';

export const createCustomLogo = (): Animation => {
  let img: HTMLImageElement | null = null;
  let src = '';
  let initialized = false;
  let x = 0;
  let y = 0;
  let vx = 1;
  let vy = 1;
  let lastWidth = 0;
  let lastHeight = 0;

  return {
    draw({ ctx, width, height, dt, settings, customImageUrl }: AnimationFrame) {
      if (width <= 0 || height <= 0) return;

      if (customImageUrl && customImageUrl !== src) {
        src = customImageUrl;
        const el = new Image();
        el.src = src;
        img = el;
      }

      const marginX = Math.min(12, width / 4);
      const marginY = Math.min(12, height / 4);
      const maxW = Math.max(1, width - marginX * 2);
      const maxH = Math.max(1, height - marginY * 2);

      if (!customImageUrl || !img?.complete || img.naturalWidth === 0) {
        const prompt = translate(settings.lang, 'logo.uploadPrompt');
        const prefFontSize = settings.size;
        ctx.font = `bold ${prefFontSize}px system-ui, sans-serif`;
        const measuredW = ctx.measureText ? ctx.measureText(prompt)?.width || 1 : 1;
        const fitScale = Math.min(1, maxW / measuredW, maxH / prefFontSize);
        const fontSize = Math.max(8, prefFontSize * fitScale);

        ctx.fillStyle = settings.color;
        ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(prompt, width / 2, height / 2);
        return;
      }

      const prefDim = settings.size * 4;
      const baseScale = prefDim / Math.max(img.naturalWidth, img.naturalHeight);
      const prefW = img.naturalWidth * baseScale;
      const prefH = img.naturalHeight * baseScale;
      const fitScale = Math.min(1, maxW / prefW, maxH / prefH);
      const w = Math.max(1, prefW * fitScale);
      const h = Math.max(1, prefH * fitScale);

      const minX = marginX;
      const maxX = width - marginX - w;
      const minY = marginY;
      const maxY = height - marginY - h;

      if (!initialized) {
        initialized = true;
        x = maxX > minX ? rand(minX, maxX) : (width - w) / 2;
        y = maxY > minY ? rand(minY, maxY) : (height - h) / 2;
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

      const speed = 160 * settings.speed;
      x += vx * speed * dt;
      y += vy * speed * dt;

      if (maxX <= minX) {
        x = (width - w) / 2;
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
        y = (height - h) / 2;
      } else {
        if (y < minY) {
          y = minY;
          vy = Math.abs(vy);
        } else if (y > maxY) {
          y = maxY;
          vy = -Math.abs(vy);
        }
      }

      ctx.drawImage(img, x, y, w, h);
    },
  };
};
