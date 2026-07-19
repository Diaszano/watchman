import { randInt } from './math';

/** Random vivid HSL color — used by DVD bounce and geometric shapes. */
export const randomColor = (): string => `hsl(${randInt(0, 360)}, 90%, 60%)`;

/** Hue-rotate a base hue by degrees, returning an HSL string. */
export const hueShift = (hue: number, sat = 90, light = 60): string =>
  `hsl(${((hue % 360) + 360) % 360}, ${sat}%, ${light}%)`;

/** Parse #rrggbb into {r,g,b}. Falls back to black on bad input. */
export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex.trim());
  if (!m) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(m[1]!, 16), g: parseInt(m[2]!, 16), b: parseInt(m[3]!, 16) };
};

export const rgba = (hex: string, alpha: number): string => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
