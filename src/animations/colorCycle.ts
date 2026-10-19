import type { Animation, ColorPaletteStops } from '@/types';
import { COLOR_PALETTES, DEFAULT_COLOR_PALETTE } from './colorPalettes';

const channels = (hex: string): [number, number, number] => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16),
];

const interpolate = (from: string, to: string, amount: number): string => {
  const a = channels(from);
  const b = channels(to);
  const smooth = amount * amount * (3 - 2 * amount);
  return `#${a
    .map((value, index) =>
      Math.round(value + (b[index]! - value) * smooth)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
};

export const createColorCycle = (): Animation => {
  let position = 0;

  return {
    draw({ ctx, width, height, dt, settings }) {
      position = (position + (Math.max(0, dt) * settings.speed) / 20) % 4;
      const stops: ColorPaletteStops =
        settings.colorPaletteId === 'custom'
          ? settings.customColorPalette
          : (COLOR_PALETTES[settings.colorPaletteId] ?? DEFAULT_COLOR_PALETTE);
      const index = Math.floor(position) % stops.length;
      const next = (index + 1) % stops.length;
      ctx.fillStyle = interpolate(stops[index]!, stops[next]!, position % 1);
      ctx.fillRect(0, 0, width, height);
    },
  };
};
