import { describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '@/stores/settingsStore';
import type { AnimationFrame } from '@/types';
import { createCustomLogo } from './customLogo';

const frame = (customImageUrl: string | null): AnimationFrame =>
  ({
    ctx: {
      fillText: vi.fn(),
      drawImage: vi.fn(),
      measureText: vi.fn(() => ({ width: 100 })),
    },
    width: 800,
    height: 600,
    dt: 0.016,
    time: 1,
    settings: defaultSettings,
    renderDensity: 1,
    customImageUrl,
  }) as unknown as AnimationFrame;

describe('custom logo animation', () => {
  it('creates an Image only when the resolved URL changes', () => {
    const images: Array<{ src: string }> = [];
    vi.stubGlobal(
      'Image',
      vi.fn(function Image() {
        const image = { src: '', complete: false, naturalWidth: 0 };
        images.push(image);
        return image;
      }),
    );
    const animation = createCustomLogo();

    animation.draw(frame('blob:first'));
    animation.draw(frame('blob:first'));
    animation.draw(frame('blob:second'));

    expect(images.map((image) => image.src)).toEqual(['blob:first', 'blob:second']);
  });

  it('retains the textual fallback when there is no resolved image', () => {
    const currentFrame = frame(null);

    createCustomLogo().draw(currentFrame);

    expect(currentFrame.ctx.fillText).toHaveBeenCalledWith('Upload a logo in Settings', 400, 300);
  });

  it('does not modify globalAlpha when drawing the logo with custom opacity', () => {
    const recordedAlphas: number[] = [];
    const ctx = {
      fillText: vi.fn(),
      drawImage: vi.fn(() => {
        recordedAlphas.push(ctx.globalAlpha);
      }),
      globalAlpha: 1,
    };
    const image = { src: 'blob:test', complete: true, naturalWidth: 100, naturalHeight: 100 };
    vi.stubGlobal(
      'Image',
      vi.fn(function Image() {
        return image;
      }),
    );
    const animation = createCustomLogo();
    const currentFrame = {
      ...frame('blob:test'),
      ctx: ctx as unknown as CanvasRenderingContext2D,
      settings: { ...defaultSettings, opacity: 0.5 },
    };

    animation.draw(currentFrame);
    expect(recordedAlphas).toEqual([1]);
  });
});
