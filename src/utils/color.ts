import { randInt } from './math';

/** Random vivid HSL color — used by DVD bounce and geometric shapes. */
export const randomColor = (): string => `hsl(${randInt(0, 360)}, 90%, 60%)`;

/** Hue-rotate a base hue by degrees, returning an HSL string. */
export const hueShift = (hue: number, sat = 90, light = 60): string =>
  `hsl(${((hue % 360) + 360) % 360}, ${sat}%, ${light}%)`;

export const rgba = (hex: string, alpha: number): string => {
  const clean = hex.trim().replace(/^#/, '');
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${clean}${a}`;
};
