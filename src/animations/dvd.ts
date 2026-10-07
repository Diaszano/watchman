import type { Animation, AnimationFrame } from '@/types';
import { randomColor } from '@/utils/color';
import { rand } from '@/utils/math';

export const createDvd = (): Animation => {
  let initialized = false;
  let x = 0;
  let y = 0;
  let vx = 1;
  let vy = 1;
  let lastWidth = 0;
  let lastHeight = 0;
  let color = randomColor();

  return {
    draw({ ctx, width, height, dt, settings }: AnimationFrame) {
      if (width <= 0 || height <= 0) return;

      const marginX = Math.min(12, width / 4);
      const marginY = Math.min(12, height / 4);
      const maxW = Math.max(1, width - marginX * 2);
      const maxH = Math.max(1, height - marginY * 2);

      const prefW = settings.size * 2.4;
      const prefH = settings.size;
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

      const speed = 180 * settings.speed;
      x += vx * speed * dt;
      y += vy * speed * dt;

      let bounced = false;
      if (maxX <= minX) {
        x = (width - w) / 2;
      } else {
        if (x < minX) {
          x = minX;
          vx = Math.abs(vx);
          bounced = true;
        } else if (x > maxX) {
          x = maxX;
          vx = -Math.abs(vx);
          bounced = true;
        }
      }

      if (maxY <= minY) {
        y = (height - h) / 2;
      } else {
        if (y < minY) {
          y = minY;
          vy = Math.abs(vy);
          bounced = true;
        } else if (y > maxY) {
          y = maxY;
          vy = -Math.abs(vy);
          bounced = true;
        }
      }

      if (bounced) color = randomColor();

      ctx.fillStyle = color;
      const r = Math.min(12, h / 3);
      ctx.beginPath();
      ctx.roundRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h), r);
      ctx.fill();

      ctx.fillStyle = settings.background;
      ctx.font = `bold ${h * 0.5}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('DVD', Math.round(x + w / 2), Math.round(y + h / 2));
    },
  };
};
