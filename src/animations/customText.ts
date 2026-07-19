import type { Animation, AnimationFrame } from '@/types';
import { rand } from '@/utils/math';

export const createCustomText = (): Animation => {
  let x = -1;
  let y = 0;
  let vx = 1;
  let vy = 1;

  return {
    draw({ ctx, width, height, dt, settings }: AnimationFrame) {
      const text = settings.customText || 'Watchman';
      const fontSize = settings.size * 2;
      ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const half = ctx.measureText(text).width / 2;
      const margin = fontSize * 0.6;

      if (x < 0) {
        x = width / 2;
        y = height / 2;
        const a = rand(0, Math.PI * 2);
        vx = Math.cos(a);
        vy = Math.sin(a);
      }

      const speed = 120 * settings.speed;
      x += vx * speed * dt;
      y += vy * speed * dt;
      if (x - half <= margin) {
        x = margin + half;
        vx = Math.abs(vx);
      }
      if (x + half >= width - margin) {
        x = width - margin - half;
        vx = -Math.abs(vx);
      }
      if (y <= margin) {
        y = margin;
        vy = Math.abs(vy);
      }
      if (y >= height - margin) {
        y = height - margin;
        vy = -Math.abs(vy);
      }

      ctx.globalAlpha = settings.opacity;
      ctx.fillStyle = settings.color;
      ctx.fillText(text, x, y);
      ctx.globalAlpha = 1;
    },
  };
};
