import { describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '@/stores/settingsStore';
import type { AnimationFrame, Settings } from '@/types';
import { createClock } from './clock';
import { createCustomLogo } from './customLogo';
import { createCustomText } from './customText';
import { createDvd } from './dvd';

interface TrackedContext {
  ctx: CanvasRenderingContext2D;
  fillTexts: Array<{ text: string; x: number; y: number }>;
  drawImages: Array<{ img: unknown; x: number; y: number; w: number; h: number }>;
  roundRects: Array<{ x: number; y: number; w: number; h: number; r: number }>;
  fonts: string[];
}

const createTrackedContext = (): TrackedContext => {
  const fillTexts: Array<{ text: string; x: number; y: number }> = [];
  const drawImages: Array<{ img: unknown; x: number; y: number; w: number; h: number }> = [];
  const roundRects: Array<{ x: number; y: number; w: number; h: number; r: number }> = [];
  const fonts: string[] = [];

  let currentFont = '';

  const ctx = {
    beginPath: vi.fn(),
    fill: vi.fn(),
    set font(f: string) {
      currentFont = f;
      fonts.push(f);
    },
    get font() {
      return currentFont;
    },
    textAlign: 'center',
    textBaseline: 'middle',
    fillStyle: '#ffffff',
    measureText: vi.fn((text: string) => {
      // Parse font size from font string, e.g. "600 120px ui-monospace" -> 120
      const match = currentFont.match(/(\d+(?:\.\d+)?)px/);
      const fontSize = match ? parseFloat(match[1]!) : 16;
      // In monospace / system fonts, character width is roughly 0.6 * fontSize
      return { width: text.length * fontSize * 0.6 };
    }),
    fillText: vi.fn((text: string, x: number, y: number) => {
      fillTexts.push({ text, x, y });
    }),
    drawImage: vi.fn((img: unknown, x: number, y: number, w: number, h: number) => {
      drawImages.push({ img, x, y, w, h });
    }),
    roundRect: vi.fn((x: number, y: number, w: number, h: number, r: number) => {
      roundRects.push({ x, y, w, h, r });
    }),
  } as unknown as CanvasRenderingContext2D;

  return { ctx, fillTexts, drawImages, roundRects, fonts };
};

const makeFrame = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: Partial<Settings> = {},
  customImageUrl: string | null = null,
  dt = 0.016,
): AnimationFrame => ({
  ctx,
  width,
  height,
  dt,
  time: 1,
  settings: { ...defaultSettings, ...settings },
  customImageUrl,
});

describe('viewport bounds and small screen adaptation', () => {
  it('fits default clock within a 390px mobile viewport without clipping', () => {
    const tracked = createTrackedContext();
    const clock = createClock();

    clock.draw(makeFrame(tracked.ctx, 390, 844));

    expect(tracked.fillTexts).toHaveLength(1);
    const lastText = tracked.fillTexts[0]!;
    const font = tracked.ctx.font;
    const match = font.match(/(\d+(?:\.\d+)?)px/);
    expect(match).not.toBeNull();
    const fontSize = parseFloat(match![1]!);
    const textWidth = tracked.ctx.measureText(lastText.text).width;

    // Total text width must fit inside viewport width minus margin
    expect(textWidth).toBeLessThanOrEqual(390 - 24);
    // Position x must be within viewport bounds
    expect(lastText.x - textWidth / 2).toBeGreaterThanOrEqual(0);
    expect(lastText.x + textWidth / 2).toBeLessThanOrEqual(390);
    expect(lastText.y).toBeGreaterThanOrEqual(fontSize / 2);
    expect(lastText.y).toBeLessThanOrEqual(844 - fontSize / 2);
  });

  it('fits custom text of 500 characters within small viewports', () => {
    const longText = 'A'.repeat(500);
    const viewports = [
      { w: 320, h: 568 },
      { w: 390, h: 844 },
      { w: 844, h: 390 },
    ];

    for (const { w, h } of viewports) {
      const tracked = createTrackedContext();
      const textAnim = createCustomText();
      textAnim.draw(makeFrame(tracked.ctx, w, h, { customText: longText, size: 40 }));

      expect(tracked.fillTexts).toHaveLength(1);
      const call = tracked.fillTexts[0]!;
      const textWidth = tracked.ctx.measureText(longText).width;

      expect(Number.isFinite(textWidth)).toBe(true);
      expect(textWidth).toBeLessThanOrEqual(w);
      expect(call.x - textWidth / 2).toBeGreaterThanOrEqual(0);
      expect(call.x + textWidth / 2).toBeLessThanOrEqual(w);
      expect(call.y).toBeGreaterThanOrEqual(0);
      expect(call.y).toBeLessThanOrEqual(h);
    }
  });

  it('fits panoramic and vertical custom logos within small viewports at max size', () => {
    const viewports = [
      { w: 320, h: 568 },
      { w: 390, h: 844 },
      { w: 844, h: 390 },
    ];

    const aspectImages = [
      { naturalWidth: 2000, naturalHeight: 400 }, // Panoramic 5:1
      { naturalWidth: 400, naturalHeight: 2000 }, // Vertical 1:5
    ];

    for (const imgProps of aspectImages) {
      vi.stubGlobal(
        'Image',
        vi.fn(function Image() {
          return { src: 'blob:logo', complete: true, ...imgProps };
        }),
      );

      for (const { w, h } of viewports) {
        const tracked = createTrackedContext();
        const logo = createCustomLogo();
        logo.draw(makeFrame(tracked.ctx, w, h, { size: 200 }, 'blob:logo'));

        expect(tracked.drawImages).toHaveLength(1);
        const { x, y, w: drawW, h: drawH } = tracked.drawImages[0]!;
        expect(drawW).toBeLessThanOrEqual(w);
        expect(drawH).toBeLessThanOrEqual(h);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x + drawW).toBeLessThanOrEqual(w);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y + drawH).toBeLessThanOrEqual(h);
      }
    }
  });

  it('fits DVD logo at max size 200 in small viewports', () => {
    const viewports = [
      { w: 320, h: 568 },
      { w: 390, h: 844 },
      { w: 844, h: 390 },
    ];

    for (const { w, h } of viewports) {
      const tracked = createTrackedContext();
      const dvd = createDvd();
      dvd.draw(makeFrame(tracked.ctx, w, h, { size: 200 }));

      expect(tracked.roundRects).toHaveLength(1);
      const { x, y, w: drawW, h: drawH } = tracked.roundRects[0]!;
      expect(drawW).toBeLessThanOrEqual(w);
      expect(drawH).toBeLessThanOrEqual(h);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x + drawW).toBeLessThanOrEqual(w);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y + drawH).toBeLessThanOrEqual(h);
    }
  });

  it('preserves position and adapts bounds smoothly during viewport resize without reset', () => {
    const tracked = createTrackedContext();
    const dvd = createDvd();

    // Start in landscape 844x390
    dvd.draw(makeFrame(tracked.ctx, 844, 390, { speed: 1 }, null, 0.016));
    dvd.draw(makeFrame(tracked.ctx, 844, 390, { speed: 1 }, null, 0.016));
    const pos1 = tracked.roundRects.at(-1)!;
    expect(pos1.x).toBeGreaterThanOrEqual(0);
    expect(pos1.x + pos1.w).toBeLessThanOrEqual(844);

    // Rotate to portrait 390x844
    dvd.draw(makeFrame(tracked.ctx, 390, 844, { speed: 1 }, null, 0.016));
    const pos2 = tracked.roundRects.at(-1)!;

    expect(pos2.x).toBeGreaterThanOrEqual(0);
    expect(pos2.x + pos2.w).toBeLessThanOrEqual(390);
    expect(pos2.y).toBeGreaterThanOrEqual(0);
    expect(pos2.y + pos2.h).toBeLessThanOrEqual(844);
    // Should not have reset randomly to 0 or negative
    expect(Number.isFinite(pos2.x)).toBe(true);
    expect(Number.isFinite(pos2.y)).toBe(true);
  });

  it('does not draw when width or height is zero', () => {
    const tracked = createTrackedContext();
    const clock = createClock();
    const dvd = createDvd();
    const textAnim = createCustomText();
    const logo = createCustomLogo();

    clock.draw(makeFrame(tracked.ctx, 0, 600));
    dvd.draw(makeFrame(tracked.ctx, 800, 0));
    textAnim.draw(makeFrame(tracked.ctx, 0, 0));
    logo.draw(makeFrame(tracked.ctx, 0, 600, {}, 'blob:logo'));

    expect(tracked.fillTexts).toHaveLength(0);
    expect(tracked.roundRects).toHaveLength(0);
    expect(tracked.drawImages).toHaveLength(0);
  });
});
