import { describe, expect, it } from 'vitest';
import { rgba } from './color';

describe('color', () => {
  it('builds 8-digit hex string with alpha', () => {
    expect(rgba('#38bdf8', 0.5)).toBe('#38bdf880');
    expect(rgba('#000000', 0.5)).toBe('#00000080');
    expect(rgba('38bdf8', 1)).toBe('#38bdf8ff');
    expect(rgba('#ffffff', 0)).toBe('#ffffff00');
  });

  it('clamps alpha between 0 and 1', () => {
    expect(rgba('#123456', -0.5)).toBe('#12345600');
    expect(rgba('#123456', 1.5)).toBe('#123456ff');
  });
});
