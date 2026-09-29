import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '@/stores/settingsStore';
import type { AnimationFrame, Settings } from '@/types';
import { densityCount } from '@/utils/math';
import { createBubbles } from './bubbles';
import { createClock } from './clock';
import { createCustomText } from './customText';
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
  lineTos: unknown[][];
  translates: unknown[][];
  shadowBlurs: number[];
  strokes: number;
  fillStyle: string | CanvasGradient | CanvasPattern;
  globalAlpha: number;
};

const context = (): RecordedContext => {
  const ctx = {
    arcs: [] as unknown[][],
    fills: 0,
    fillTexts: [] as unknown[][],
    moveTos: [] as unknown[][],
    lineTos: [] as unknown[][],
    translates: [] as unknown[][],
    shadowBlurs: [] as number[],
    strokes: 0,
    fillStyle: '',
    globalAlpha: 1,
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
    lineTo(...args: unknown[]) {
      this.lineTos.push(args);
    },
    rect: vi.fn(),
    closePath: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate(...args: unknown[]) {
      this.translates.push(args);
    },
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
  dt = 1,
): AnimationFrame => ({
  ctx,
  width: 800,
  height: 600,
  dt,
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
    const dateTimeFormatSpy = vi
      .spyOn(Intl, 'DateTimeFormat')
      .mockImplementation(function MockDateTimeFormat() {
        return formatter as unknown as Intl.DateTimeFormat;
      });

    const clock = createClock();
    const ctx = context();
    clock.draw(frame(ctx, 1));
    clock.draw(frame(ctx, 1));

    expect(dateTimeFormatSpy).toHaveBeenCalledTimes(1);
    expect(dateTimeFormatSpy).toHaveBeenCalledWith('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    expect(formatter.format).toHaveBeenCalledTimes(2);
    dateTimeFormatSpy.mockRestore();
  });

  it('calculates density count respecting minimum threshold', () => {
    expect(densityCount(100, 10, 0.5)).toBe(50);
    expect(densityCount(10, 10, 0.5)).toBe(10);
  });

  it('scales bubble sizes proportionally with settings.size without replacing objects or multiplying opacity', () => {
    const ctx = context();
    const bubbles = createBubbles();

    bubbles.draw(frame(ctx, 1, { size: 10, opacity: 0.5, color: '#ff0000' }, 0));
    const firstArcs = [...ctx.arcs];
    expect(firstArcs.length).toBeGreaterThan(0);
    const firstPositions = firstArcs.map((a) => [a[0], a[1]]);
    const firstRadii = firstArcs.map((a) => a[2] as number);
    const firstFillStyle = ctx.fillStyle;

    ctx.arcs.length = 0;
    // Draw with size 100, dt: 0
    bubbles.draw(frame(ctx, 1, { size: 100, opacity: 0.5, color: '#ff0000' }, 0));
    const secondArcs = [...ctx.arcs];
    const secondPositions = secondArcs.map((a) => [a[0], a[1]]);
    const secondRadii = secondArcs.map((a) => a[2] as number);

    expect(secondPositions).toEqual(firstPositions);
    for (let i = 0; i < firstRadii.length; i++) {
      expect(secondRadii[i]).toBeCloseTo(firstRadii[i]! * 10, 4);
    }

    // Changing opacity should not multiply onto fillStyle (alpha is intrinsic)
    bubbles.draw(frame(ctx, 1, { size: 100, opacity: 0.1, color: '#ff0000' }, 0));
    expect(ctx.fillStyle).toBe(firstFillStyle);
  });

  it('scales shape sizes proportionally with settings.size without replacing objects', () => {
    const ctx = context();
    const shapes = createShapes();

    shapes.draw(frame(ctx, 1, { size: 10 }, 0));
    const firstTranslates = [...ctx.translates];
    const firstLineTos = [...ctx.lineTos];
    expect(firstLineTos.length).toBeGreaterThan(0);

    ctx.translates.length = 0;
    ctx.lineTos.length = 0;

    shapes.draw(frame(ctx, 1, { size: 100 }, 0));
    const secondTranslates = [...ctx.translates];
    const secondLineTos = [...ctx.lineTos];

    expect(secondTranslates).toEqual(firstTranslates);
    expect(secondLineTos.length).toBe(firstLineTos.length);
    for (let i = 0; i < firstLineTos.length; i++) {
      const [x1, y1] = firstLineTos[i] as [number, number];
      const [x2, y2] = secondLineTos[i] as [number, number];
      expect(x2).toBeCloseTo(x1 * 10, 4);
      expect(y2).toBeCloseTo(y1 * 10, 4);
    }
  });

  it('does not multiply settings.opacity onto globalAlpha in customText', () => {
    const ctx = context();
    const text = createCustomText();
    text.draw(frame(ctx, 1, { opacity: 0.5 }));
    expect(ctx.globalAlpha).toBe(1);
  });
});
