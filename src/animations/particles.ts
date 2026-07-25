import type { Animation, AnimationFrame } from '@/types';
import { rand } from '@/utils/math';

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const densityCount = (raw: number, minimum: number, renderDensity: number) =>
  Math.max(minimum, Math.round(raw * renderDensity));

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
    draw({ ctx, width, height, dt, settings, renderDensity }: AnimationFrame) {
      w = width;
      h = height;
      const count = densityCount(settings.count, 1, renderDensity);
      // Reconcile pool to requested count live.
      while (ps.length < count) ps.push(spawn());
      if (ps.length > count) ps.length = count;

      const speed = 60 * settings.speed;
      const rad = Math.max(1, settings.size / 20);
      ctx.fillStyle = settings.color;
      ctx.beginPath();
      for (const p of ps) {
        p.x += p.vx * speed * dt;
        p.y += p.vy * speed * dt;
        if (p.x < 0) p.x += w;
        else if (p.x > w) p.x -= w;
        if (p.y < 0) p.y += h;
        else if (p.y > h) p.y -= h;
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
      }
      ctx.fill();
    },
  };
};
