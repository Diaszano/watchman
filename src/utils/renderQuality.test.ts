import { describe, expect, it } from 'vitest';
import {
  getCanvasDimensions,
  initialAutoQualityState,
  nextAutoQualityState,
  QUALITY_PROFILES,
} from './renderQuality';
import type { RenderQualityState } from '@/types';

describe('getCanvasDimensions', () => {
  it('limits a 4K DPR-3 buffer to the balanced 12 MP budget', () => {
    const result = getCanvasDimensions({
      cssWidth: 3840,
      cssHeight: 2160,
      deviceDpr: 3,
      level: 'balanced',
    });

    expect(result.width * result.height).toBeLessThanOrEqual(12_000_000);
    expect(result.dpr).toBeLessThan(3);
  });

  it.each([
    ['economy', 6_000_000],
    ['balanced', 12_000_000],
    ['high', 20_000_000],
  ] as const)('keeps %s buffers within the %d pixel budget', (level, maxPixels) => {
    const result = getCanvasDimensions({
      cssWidth: 3840,
      cssHeight: 2160,
      deviceDpr: 3,
      level,
    });

    expect(result.width * result.height).toBeLessThanOrEqual(maxPixels);
  });

  it('returns a minimum-sized buffer for zero CSS dimensions', () => {
    expect(
      getCanvasDimensions({
        cssWidth: 0,
        cssHeight: 0,
        deviceDpr: 3,
        level: 'economy',
      }),
    ).toMatchObject({ width: 1, height: 1 });
  });

  it('preserves DPR 1 when it is within the profile budget', () => {
    expect(
      getCanvasDimensions({
        cssWidth: 1920,
        cssHeight: 1080,
        deviceDpr: 1,
        level: 'economy',
      }).dpr,
    ).toBe(1);
  });
});

describe('quality profiles', () => {
  it.each([
    ['economy', 0.5],
    ['balanced', 0.75],
    ['high', 1],
  ] as const)('uses render density %s for %s', (level, density) => {
    expect(QUALITY_PROFILES[level].density).toBe(density);
  });
});

describe('nextAutoQualityState', () => {
  it('lowers after exactly 20 over-budget rendered frames', () => {
    let state = initialAutoQualityState();
    for (let frame = 0; frame < 19; frame += 1) {
      state = nextAutoQualityState(state, 15, 16);
    }
    expect(state.level).toBe('balanced');

    state = nextAutoQualityState(state, 15, 16);
    expect(state.level).toBe('economy');
  });

  it('raises after exactly 300 headroom rendered frames', () => {
    let state: RenderQualityState = {
      ...initialAutoQualityState(),
      level: 'economy',
    };
    for (let frame = 0; frame < 299; frame += 1) {
      state = nextAutoQualityState(state, 8, 16);
    }
    expect(state.level).toBe('economy');

    state = nextAutoQualityState(state, 8, 16);
    expect(state.level).toBe('balanced');
  });

  it('does not move beyond economy or high', () => {
    let economy: RenderQualityState = {
      ...initialAutoQualityState(),
      level: 'economy',
    };
    for (let frame = 0; frame < 20; frame += 1) {
      economy = nextAutoQualityState(economy, 15, 16);
    }
    expect(economy.level).toBe('economy');

    let high: RenderQualityState = { ...initialAutoQualityState(), level: 'high' };
    for (let frame = 0; frame < 300; frame += 1) {
      high = nextAutoQualityState(high, 8, 16);
    }
    expect(high.level).toBe('high');
  });

  it('resets the opposite hysteresis counter after every observation', () => {
    let state = nextAutoQualityState(initialAutoQualityState(), 15, 16);
    expect(state).toMatchObject({ overBudgetFrames: 1, headroomFrames: 0 });

    state = nextAutoQualityState(state, 8, 16);
    expect(state).toMatchObject({ overBudgetFrames: 0, headroomFrames: 1 });
  });
});
