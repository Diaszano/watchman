import type { Animation, AnimationFrame } from '@/types';
import { randomColor } from '@/utils/color';
import { densityCount, pick, rand } from '@/utils/math';

type Kind = 'square' | 'circle' | 'triangle' | 'hexagon';
const KINDS: Kind[] = ['square', 'circle', 'triangle', 'hexagon'];

interface Shape {
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  rot: number;
  vrot: number;
  kind: Kind;
  color: string;
}

const path = (ctx: CanvasRenderingContext2D, kind: Kind, s: number) => {
  ctx.beginPath();
  if (kind === 'circle') {
    ctx.arc(0, 0, s, 0, Math.PI * 2);
  } else if (kind === 'square') {
    ctx.rect(-s, -s, s * 2, s * 2);
  } else {
    const sides = kind === 'triangle' ? 3 : 6;
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(a) * s;
      const py = Math.sin(a) * s;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
};

export const createShapes = (): Animation => {
  const shapes: Shape[] = [];
  let w = 0;
  let h = 0;

  const spawn = (): Shape => ({
    x: rand(0, w),
    y: rand(0, h),
    vx: rand(-1, 1),
    vy: rand(-1, 1),
    scale: rand(0.4, 1),
    rot: rand(0, Math.PI * 2),
    vrot: rand(-1, 1),
    kind: pick(KINDS),
    color: randomColor(),
  });

  return {
    draw({ ctx, width, height, dt, settings, renderDensity }: AnimationFrame) {
      w = width;
      h = height;
      const count = densityCount(settings.count / 8, 6, renderDensity);
      while (shapes.length < count) shapes.push(spawn());
      if (shapes.length > count) shapes.length = count;

      const speed = 70 * settings.speed;
      for (const s of shapes) {
        const size = s.scale * settings.size;
        s.x += s.vx * speed * dt;
        s.y += s.vy * speed * dt;
        s.rot += s.vrot * settings.speed * dt;
        if (s.x < -size) s.x = w + size;
        else if (s.x > w + size) s.x = -size;
        if (s.y < -size) s.y = h + size;
        else if (s.y > h + size) s.y = -size;

        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rot);
        ctx.lineWidth = 3;
        ctx.strokeStyle = s.color;
        path(ctx, s.kind, size);
        ctx.stroke();
        ctx.restore();
      }
    },
  };
};
