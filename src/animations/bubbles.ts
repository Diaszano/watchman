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

const densityCount = (raw: number, minimum: number, renderDensity: number) =>
  Math.max(minimum, Math.round(raw * renderDensity));

export const createBubbles = (): Animation => {
  const bs: B[] = [];
  let w = 0;
  let h = 0;
  let cachedColor = '';
  let cachedOpacity = -1;
  let styles = new Map<number, { fill: string; stroke: string }>();

  const spawn = (base: number): B => ({
    x: rand(0, w),
    y: rand(0, h) + rand(0, h), // start below on refill
    r: rand(base * 0.3, base),
    vy: rand(15, 45),
    drift: rand(-20, 20),
    alpha: rand(0.15, 0.55),
  });

  return {
    draw({ ctx, width, height, dt, time, settings, renderDensity }: AnimationFrame) {
      w = width;
      h = height;
      const count = densityCount(settings.count / 4, 10, renderDensity);
      while (bs.length < count) bs.push(spawn(settings.size));
      if (bs.length > count) bs.length = count;

      if (settings.color !== cachedColor || settings.opacity !== cachedOpacity) {
        cachedColor = settings.color;
        cachedOpacity = settings.opacity;
        styles = new Map();
        for (let bucket = 0; bucket <= 100; bucket++) {
          const alpha = bucket / 100;
          styles.set(bucket, {
            fill: rgba(cachedColor, alpha * cachedOpacity),
            stroke: rgba(cachedColor, alpha * 0.9 * cachedOpacity),
          });
        }
      }

      const speed = settings.speed;
      for (const b of bs) {
        b.y -= b.vy * speed * dt;
        b.x += Math.sin(time + b.y * 0.01) * b.drift * speed * dt;
        if (b.y + b.r < 0) {
          b.y = h + b.r;
          b.x = rand(0, w);
        }
        const style = styles.get(Math.round(b.alpha * 100))!;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = style.fill;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = style.stroke;
        ctx.stroke();
      }
    },
  };
};
