import type { RenderQualityDecision, RenderQualityLevel, RenderQualityState } from '@/types';

export const QUALITY_PROFILES = {
  economy: { maxPixels: 6_000_000, density: 0.5 },
  balanced: { maxPixels: 12_000_000, density: 0.75 },
  high: { maxPixels: 20_000_000, density: 1 },
} as const;

const QUALITY_LEVELS: readonly RenderQualityLevel[] = ['economy', 'balanced', 'high'];
const OVER_BUDGET_FRAME_LIMIT = 20;
const HEADROOM_FRAME_LIMIT = 300;

export const getCanvasDimensions = ({
  cssWidth,
  cssHeight,
  deviceDpr,
  level,
}: {
  cssWidth: number;
  cssHeight: number;
  deviceDpr: number;
  level: RenderQualityLevel;
}): RenderQualityDecision => {
  const maxPixels = QUALITY_PROFILES[level].maxPixels;
  const cappedDpr = Math.min(
    Math.max(deviceDpr || 1, 1),
    Math.sqrt(maxPixels / Math.max(cssWidth * cssHeight, 1)),
  );

  return {
    dpr: cappedDpr,
    width: Math.max(1, Math.floor(cssWidth * cappedDpr)),
    height: Math.max(1, Math.floor(cssHeight * cappedDpr)),
  };
};

export const initialAutoQualityState = (): RenderQualityState => ({
  level: 'balanced',
  overBudgetFrames: 0,
  headroomFrames: 0,
});

export const nextAutoQualityState = (
  state: RenderQualityState,
  renderDurationMs: number,
  intervalMs: number,
): RenderQualityState => {
  if (renderDurationMs > intervalMs * 0.8) {
    const overBudgetFrames = state.overBudgetFrames + 1;
    if (overBudgetFrames < OVER_BUDGET_FRAME_LIMIT) {
      return { ...state, overBudgetFrames, headroomFrames: 0 };
    }

    return {
      level: QUALITY_LEVELS[Math.max(0, QUALITY_LEVELS.indexOf(state.level) - 1)]!,
      overBudgetFrames: 0,
      headroomFrames: 0,
    };
  }

  if (renderDurationMs <= intervalMs * 0.5) {
    const headroomFrames = state.headroomFrames + 1;
    if (headroomFrames < HEADROOM_FRAME_LIMIT) {
      return { ...state, overBudgetFrames: 0, headroomFrames };
    }

    return {
      level:
        QUALITY_LEVELS[
          Math.min(QUALITY_LEVELS.length - 1, QUALITY_LEVELS.indexOf(state.level) + 1)
        ]!,
      overBudgetFrames: 0,
      headroomFrames: 0,
    };
  }

  return { ...state, overBudgetFrames: 0, headroomFrames: 0 };
};
