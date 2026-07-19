import type { Animation, AnimationFrame } from '@/types';
import { rgba } from '@/utils/color';
import { rand } from '@/utils/math';

interface B {
  x: number;
  y: number;
  r: number;
  vy: number;
  drift: number;
  alpha: number;
}

export const createBubbles = (): Animation => {
  const bs: B[] = [];
  let w = 0;
  let h = 0;

  const spawn = (base: number): B => ({
    x: rand(0, w),
    y: rand(0, h) + rand(0, h), // start below on refill
    r: rand(base * 0.3, base),
    vy: rand(15, 45),
    drift: rand(-20, 20),
    alpha: rand(0.15, 0.55),
  });

  return {
    draw({ ctx, width, height, dt, time, settings }: AnimationFrame) {
      w = width;
      h = height;
      const count = Math.max(10, Math.round(settings.count / 4));
      while (bs.length < count) bs.push(spawn(settings.size));
      if (bs.length > count) bs.length = count;

      const speed = settings.speed;
      for (const b of bs) {
        b.y -= b.vy * speed * dt;
        b.x += Math.sin(time + b.y * 0.01) * b.drift * speed * dt;
        if (b.y + b.r < 0) {
          b.y = h + b.r;
          b.x = rand(0, w);
        }
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(settings.color, b.alpha * settings.opacity);
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = rgba(settings.color, b.alpha * 0.9 * settings.opacity);
        ctx.stroke();
      }
    },
  };
};
