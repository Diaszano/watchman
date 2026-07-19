import type { Animation, AnimationFrame } from '@/types';

export const createClock = (): Animation => {
  let x = -1;
  let y = 0;
  let vx = 1;
  let vy = 1;

  return {
    draw({ ctx, width, height, dt, time, settings }: AnimationFrame) {
      if (x < 0) {
        x = width / 2;
        y = height / 2;
      }
      // Slow drift so digits never sit in one place.
      const speed = 24 * settings.speed;
      x += Math.cos(time * 0.13) * speed * dt + vx * speed * 0.2 * dt;
      y += Math.sin(time * 0.17) * speed * dt + vy * speed * 0.2 * dt;

      const now = new Date();
      const label = now.toLocaleTimeString('en-GB', { hour12: false }); // HH:MM:SS 24h

      const fontSize = settings.size * 3;
      ctx.font = `600 ${fontSize}px ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const half = ctx.measureText(label).width / 2;
      const margin = fontSize * 0.7;

      // Bounce the drift off the walls to keep it on-screen.
      if (x - half < margin) {
        x = margin + half;
        vx = 1;
      }
      if (x + half > width - margin) {
        x = width - margin - half;
        vx = -1;
      }
      if (y < margin) {
        y = margin;
        vy = 1;
      }
      if (y > height - margin) {
        y = height - margin;
        vy = -1;
      }

      ctx.fillStyle = settings.color;
      ctx.fillText(label, x, y);
    },
  };
};
