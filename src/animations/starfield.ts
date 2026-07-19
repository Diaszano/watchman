import type { Animation, AnimationFrame } from '@/types';
import { rand } from '@/utils/math';

interface Star {
  x: number;
  y: number;
  z: number;
}

export const createStarfield = (): Animation => {
  const stars: Star[] = [];
  let w = 0;
  let h = 0;

  const spawn = (): Star => ({ x: rand(-w, w), y: rand(-h, h), z: rand(1, w) });

  return {
    draw({ ctx, width, height, dt, settings }: AnimationFrame) {
      w = width;
      h = height;
      const count = settings.count * 2;
      while (stars.length < count) stars.push(spawn());
      if (stars.length > count) stars.length = count;

      const cx = width / 2;
      const cy = height / 2;
      const speed = 300 * settings.speed;
      ctx.fillStyle = settings.color;

      for (const s of stars) {
        s.z -= speed * dt; // parallax: nearer stars sweep faster
        if (s.z <= 1) {
          s.x = rand(-w, w);
          s.y = rand(-h, h);
          s.z = w;
        }
        const k = 128 / s.z;
        const px = cx + s.x * k;
        const py = cy + s.y * k;
        if (px < 0 || px > width || py < 0 || py > height) continue;
        const r = Math.max(0.4, (1 - s.z / w) * settings.size * 0.1);
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };
};
