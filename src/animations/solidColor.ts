import type { Animation } from '@/types';

export const createSolidColor = (): Animation => ({
  draw({ ctx, width, height, settings }) {
    ctx.fillStyle = settings.color;
    ctx.fillRect(0, 0, width, height);
  },
});
