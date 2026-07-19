import { describe, expect, it } from 'vitest';
import { hexToRgb, rgba } from './color';

describe('color', () => {
  it('parses #rrggbb', () => {
    expect(hexToRgb('#38bdf8')).toEqual({ r: 56, g: 189, b: 248 });
  });

  it('parses without leading hash', () => {
    expect(hexToRgb('ffffff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('falls back to black on garbage', () => {
    expect(hexToRgb('nope')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('builds rgba strings', () => {
    expect(rgba('#000000', 0.5)).toBe('rgba(0, 0, 0, 0.5)');
  });
});
