import type { Animation, AnimationFrame } from '@/types';
import { rand } from '@/utils/math';

export const createCustomLogo = (): Animation => {
  let img: HTMLImageElement | null = null;
  let src = '';
  let x = -1;
  let y = 0;
  let vx = 1;
  let vy = 1;

  return {
    draw({ ctx, width, height, dt, settings }: AnimationFrame) {
      if (settings.customImage && settings.customImage !== src) {
        src = settings.customImage;
        const el = new Image();
        el.src = src;
        img = el;
      }

      if (!settings.customImage || !img || !img.complete || img.naturalWidth === 0) {
        ctx.fillStyle = settings.color;
        ctx.font = `bold ${settings.size}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Upload a logo in Settings', width / 2, height / 2);
        return;
      }

      const target = settings.size * 4;
      const scale = target / Math.max(img.naturalWidth, img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;

      if (x < 0) {
        x = rand(0, width - w);
        y = rand(0, height - h);
        const a = rand(0, Math.PI * 2);
        vx = Math.cos(a);
        vy = Math.sin(a);
      }

      const speed = 160 * settings.speed;
      x += vx * speed * dt;
      y += vy * speed * dt;
      if (x <= 0) {
        x = 0;
        vx = Math.abs(vx);
      }
      if (x + w >= width) {
        x = width - w;
        vx = -Math.abs(vx);
      }
      if (y <= 0) {
        y = 0;
        vy = Math.abs(vy);
      }
      if (y + h >= height) {
        y = height - h;
        vy = -Math.abs(vy);
      }

      ctx.globalAlpha = settings.opacity;
      ctx.drawImage(img, x, y, w, h);
      ctx.globalAlpha = 1;
    },
  };
};
