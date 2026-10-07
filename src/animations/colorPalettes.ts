import type { ColorPaletteId, ColorPaletteStops } from '@/types';

export const DEFAULT_COLOR_PALETTE: ColorPaletteStops = [
  '#7AA2F7',
  '#BB9AF7',
  '#7DCFFF',
  '#9ECE6A',
];

export const COLOR_PALETTES: Record<Exclude<ColorPaletteId, 'custom'>, ColorPaletteStops> = {
  watchman: DEFAULT_COLOR_PALETTE,
  aurora: ['#80D6C4', '#79C7E3', '#8D9CF7', '#C7A0F6'],
  sunset: ['#ECA580', '#E0AF68', '#E58BA6', '#B29BE7'],
  ocean: ['#70C1CE', '#4E9FA3', '#6996CB', '#8BAFCB'],
};
