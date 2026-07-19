import type { Animation, AnimationFrame } from '@/types';
import { rand } from '@/utils/math';

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export const createParticles = (): Animation => {
  const ps: P[] = [];
  let w = 0;
  let h = 0;

  const spawn = (): P => ({
    x: rand(0, w),
    y: rand(0, h),
    vx: rand(-1, 1),
    vy: rand(-1, 1),
  });

  return {
    draw({ ctx, width, height, dt, settings }: AnimationFrame) {
      w = width;
      h = height;
      // Reconcile pool to requested count live.
      while (ps.length < settings.count) ps.push(spawn());
      if (ps.length > settings.count) ps.length = settings.count;

      const speed = 60 * settings.speed;
      const rad = Math.max(1, settings.size / 20);
      ctx.fillStyle = settings.color;
      for (const p of ps) {
        p.x += p.vx * speed * dt;
        p.y += p.vy * speed * dt;
        if (p.x < 0) p.x += w;
        else if (p.x > w) p.x -= w;
        if (p.y < 0) p.y += h;
        else if (p.y > h) p.y -= h;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };
};
