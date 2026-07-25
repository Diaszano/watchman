import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '@/stores/settingsStore';
import type { AnimationFrame, Settings } from '@/types';
import { createClock } from './clock';
import { createMatrix } from './matrix';
import { createNeon } from './neon';
import { createParticles } from './particles';
import { createShapes } from './shapes';
import { createStarfield } from './starfield';

type RecordedContext = CanvasRenderingContext2D & {
  arcs: unknown[][];
  fills: number;
  fillTexts: unknown[][];
  moveTos: unknown[][];
  shadowBlurs: number[];
  strokes: number;
};

const context = (): RecordedContext => {
  const ctx = {
    arcs: [] as unknown[][],
    fills: 0,
    fillTexts: [] as unknown[][],
    moveTos: [] as unknown[][],
    shadowBlurs: [] as number[],
    strokes: 0,
    beginPath: vi.fn(),
    arc(...args: unknown[]) {
      this.arcs.push(args);
    },
    fill() {
      this.fills += 1;
    },
    fillText(...args: unknown[]) {
      this.fillTexts.push(args);
    },
    moveTo(...args: unknown[]) {
      this.moveTos.push(args);
    },
    lineTo: vi.fn(),
    rect: vi.fn(),
    closePath: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    stroke() {
      this.strokes += 1;
    },
    measureText: vi.fn(() => ({ width: 120 })),
    set shadowBlur(value: number) {
      this.shadowBlurs.push(value);
    },
    get shadowBlur() {
      return this.shadowBlurs.at(-1) ?? 0;
    },
  };
  return ctx as unknown as RecordedContext;
};

const frame = (
  ctx: CanvasRenderingContext2D,
  renderDensity: number,
  settings: Partial<Settings> = {},
): AnimationFrame => ({
  ctx,
  width: 800,
  height: 600,
  dt: 1,
  time: 1,
  settings: { ...defaultSettings, ...settings },
  renderDensity,
  customImageUrl: null,
});

describe('animation rendering cost', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  it('batches density-adjusted particles into one fill', () => {
    const ctx = context();

    createParticles().draw(frame(ctx, 0.5, { count: 100 }));

    expect(ctx.arcs).toHaveLength(50);
    expect(ctx.moveTos).toHaveLength(50);
    expect(ctx.fills).toBe(1);
  });

  it('batches density-adjusted visible stars into one fill', () => {
    const ctx = context();

    createStarfield().draw(frame(ctx, 0.5, { count: 100, speed: 0 }));

    expect(ctx.arcs).toHaveLength(100);
    expect(ctx.moveTos).toHaveLength(100);
    expect(ctx.fills).toBe(1);
  });

  it('disables neon glow at economy density', () => {
    const ctx = context();

    createNeon().draw(frame(ctx, 0.5, { count: 100 }));

    expect(ctx.shadowBlurs.filter((blur) => blur > 0)).toEqual([]);
  });

  it('reduces matrix text work without leaving the right side uncovered', () => {
    const economyCtx = context();
    const fullCtx = context();
    const economy = createMatrix();
    const full = createMatrix();
    const settings = { size: 40, speed: 1 };

    economy.draw(frame(economyCtx, 0.5, settings));
    economy.draw(frame(economyCtx, 0.5, settings));
    economy.draw(frame(economyCtx, 0.5, settings));
    full.draw(frame(fullCtx, 1, settings));
    full.draw(frame(fullCtx, 1, settings));
    full.draw(frame(fullCtx, 1, settings));

    expect(economyCtx.fillTexts.length).toBeLessThan(fullCtx.fillTexts.length);
    const economyXs = economyCtx.fillTexts.map((call) => call[1] as number);
    expect(Math.max(...economyXs)).toBeGreaterThanOrEqual(760);
  });

  it('applies density to shapes while preserving the six-shape minimum', () => {
    const denseCtx = context();
    const minimumCtx = context();

    createShapes().draw(frame(denseCtx, 0.5, { count: 200 }));
    createShapes().draw(frame(minimumCtx, 0.1, { count: 8 }));

    expect(denseCtx.strokes).toBe(13);
    expect(minimumCtx.strokes).toBe(6);
  });

  it('creates the clock time formatter once per animation', () => {
    const formatter = { format: vi.fn(() => '12:34:56') };
    const constructor = vi
      .spyOn(Intl, 'DateTimeFormat')
      .mockImplementation(() => formatter as unknown as Intl.DateTimeFormat);

    const clock = createClock();
    const ctx = context();
    clock.draw(frame(ctx, 1));
    clock.draw(frame(ctx, 1));

    expect(constructor).toHaveBeenCalledTimes(1);
    expect(constructor).toHaveBeenCalledWith('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    expect(formatter.format).toHaveBeenCalledTimes(2);
    constructor.mockRestore();
  });
});
