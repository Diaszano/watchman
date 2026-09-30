import type { Animation, AnimationFrame } from '@/types';
import { hueShift } from '@/utils/color';
import { rand } from '@/utils/math';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export const createNeon = (): Animation => {
  const nodes: Node[] = [];
  let w = 0;
  let h = 0;

  const spawn = (): Node => ({
    x: rand(0, w),
    y: rand(0, h),
    vx: rand(-1, 1),
    vy: rand(-1, 1),
  });

  return {
    draw({ ctx, width, height, dt, time, settings }: AnimationFrame) {
      w = width;
      h = height;
      const count = Math.max(4, Math.round(settings.count / 25));
      while (nodes.length < count) nodes.push(spawn());
      if (nodes.length > count) nodes.length = count;

      const speed = 120 * settings.speed;
      for (const n of nodes) {
        n.x += n.vx * speed * dt;
        n.y += n.vy * speed * dt;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }

      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(2, settings.size / 12);
      ctx.shadowBlur = 24;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]!;
        const b = nodes[(i + 1) % nodes.length]!;
        const color = hueShift((time * 40 + i * 40) % 360);
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    },
  };
};
