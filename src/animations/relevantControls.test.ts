import { describe, expect, it } from 'vitest';
import type { AnimationMeta, PerModeControl } from '@/types';
import { isRelevant } from './relevantControls';

const meta = (controls?: PerModeControl[]): AnimationMeta => ({
  id: 'test',
  create: () => ({ draw: () => undefined }),
  ...(controls ? { controls } : {}),
});

describe('isRelevant', () => {
  it('returns true when the control is listed', () => {
    expect(isRelevant(meta(['speed', 'size']), 'size')).toBe(true);
  });

  it('returns false when the control is not listed', () => {
    expect(isRelevant(meta(['speed', 'size']), 'count')).toBe(false);
  });

  it('defaults to true when the mode declares no controls list', () => {
    expect(isRelevant(meta(undefined), 'color')).toBe(true);
    expect(isRelevant(meta(undefined), 'brightness')).toBe(true);
  });

  it('returns false for every control excluded from the DVD-like set', () => {
    const controls = meta(['speed', 'size', 'opacity', 'brightness', 'color']);
    expect(isRelevant(controls, 'count')).toBe(false);
    expect(isRelevant(controls, 'opacity')).toBe(true);
  });
});
