import type { Animation, AnimationFrame } from '@/types';
import { randomColor } from '@/utils/color';
import { rand } from '@/utils/math';

export const createDvd = (): Animation => {
  let x = -1;
  let y = 0;
  let vx = 1;
  let vy = 1;
  let color = randomColor();

  return {
    draw({ ctx, width, height, dt, settings }: AnimationFrame) {
      const w = settings.size * 2.4;
      const h = settings.size;
      const speed = 180 * settings.speed;

      if (x < 0) {
        x = rand(0, width - w);
        y = rand(0, height - h);
        const a = rand(0, Math.PI * 2);
        vx = Math.cos(a);
        vy = Math.sin(a);
      }

      x += vx * speed * dt;
      y += vy * speed * dt;

      let bounced = false;
      if (x <= 0) {
        x = 0;
        vx = Math.abs(vx);
        bounced = true;
      }
      if (x + w >= width) {
        x = width - w;
        vx = -Math.abs(vx);
        bounced = true;
      }
      if (y <= 0) {
        y = 0;
        vy = Math.abs(vy);
        bounced = true;
      }
      if (y + h >= height) {
        y = height - h;
        vy = -Math.abs(vy);
        bounced = true;
      }
      if (bounced) color = randomColor();

      ctx.fillStyle = color;
      const r = Math.min(12, h / 3);
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();

      ctx.fillStyle = settings.background;
      ctx.font = `bold ${h * 0.5}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('DVD', x + w / 2, y + h / 2);
    },
  };
};
