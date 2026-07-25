import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnimationFrame } from '@/types';

const { draw, getAnimation } = vi.hoisted(() => ({
  draw: vi.fn<(frame: AnimationFrame) => void>(),
  getAnimation: vi.fn(() => ({ create: () => ({ draw }) })),
}));

vi.mock('@/animations/playlist', () => ({
  getAnimation,
  getNextInPlaylist: vi.fn(),
}));

const mockStorage = vi.hoisted(() => {
  const values: Record<string, string> = {};
  const storage = {
    getItem: (key: string) => values[key] ?? null,
    setItem: (key: string, value: string) => {
      values[key] = String(value);
    },
    removeItem: (key: string) => {
      delete values[key];
    },
    clear: () => {
      for (const key in values) delete values[key];
    },
    length: 0,
    key: () => null,
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true,
  });
  return storage;
});

import { defaultSettings, useSettings } from '@/stores/settingsStore';
import { useAnimationLoop } from './useAnimationLoop';

const createCanvas = (width = 800, height = 600) => {
  const canvas = document.createElement('canvas');
  Object.defineProperties(canvas, {
    clientWidth: { value: width, configurable: true },
    clientHeight: { value: height, configurable: true },
  });
  const context = {
    clearRect: vi.fn(),
    setTransform: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  } as unknown as CanvasRenderingContext2D;
  vi.spyOn(canvas, 'getContext').mockReturnValue(context);
  return { canvas, context };
};

const installAnimationFrames = () => {
  let callback: FrameRequestCallback | undefined;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((next) => {
    callback = next;
    return 1;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  return (now: number) => {
    if (!callback) throw new Error('animation frame callback was not scheduled');
    act(() => callback?.(now));
  };
};

describe('useAnimationLoop', () => {
  beforeEach(() => {
    mockStorage.clear();
    draw.mockReset();
    getAnimation.mockClear();
    useSettings.setState({ ...defaultSettings });
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    vi.spyOn(performance, 'now').mockReturnValue(0);
  });

  it('preserves elapsed logical time while limiting rendering to 30 FPS', () => {
    const { canvas } = createCanvas();
    const runFrame = installAnimationFrames();
    useSettings.getState().set('fpsLimit', 30);

    const { unmount } = renderHook(() =>
      useAnimationLoop({ canvasRef: { current: canvas }, paused: false, customImageUrl: null }),
    );

    for (let now = 0; now <= 1_000; now += 16) runFrame(now);
    runFrame(1_000);

    const elapsed = draw.mock.calls.reduce((sum, [frame]) => sum + frame.dt, 0);
    expect(elapsed).toBeCloseTo(1, 2);
    expect(draw.mock.calls.at(-1)?.[0].time).toBeCloseTo(1, 2);
    expect(Math.max(...draw.mock.calls.map(([frame]) => frame.dt))).toBeLessThanOrEqual(0.1);
    unmount();
  });

  it('keeps default Auto canvas allocation within twelve million pixels', () => {
    const { canvas } = createCanvas(3_840, 2_160);
    const runFrame = installAnimationFrames();
    Object.defineProperty(window, 'devicePixelRatio', { value: 3, configurable: true });

    const { unmount } = renderHook(() =>
      useAnimationLoop({ canvasRef: { current: canvas }, paused: false, customImageUrl: null }),
    );
    runFrame(17);

    expect(canvas.width * canvas.height).toBeLessThanOrEqual(12_000_000);
    expect(draw.mock.calls[0]?.[0].renderDensity).toBe(0.75);
    unmount();
  });

  it('resizes the canvas when the selected quality profile changes', () => {
    const { canvas } = createCanvas(3_840, 2_160);
    const runFrame = installAnimationFrames();
    Object.defineProperty(window, 'devicePixelRatio', { value: 3, configurable: true });
    useSettings.getState().set('renderQuality', 'high');

    const { unmount } = renderHook(() =>
      useAnimationLoop({ canvasRef: { current: canvas }, paused: false, customImageUrl: null }),
    );
    expect(canvas.width * canvas.height).toBeGreaterThan(12_000_000);

    useSettings.getState().set('renderQuality', 'economy');
    runFrame(17);

    expect(canvas.width * canvas.height).toBeLessThanOrEqual(6_000_000);
    expect(draw.mock.calls[0]?.[0].renderDensity).toBe(0.5);
    unmount();
  });

  it('runs Matrix in Economy with half-density animation work', () => {
    const { canvas } = createCanvas();
    const runFrame = installAnimationFrames();
    useSettings.getState().patch({ animationId: 'matrix', renderQuality: 'economy' });

    const { unmount } = renderHook(() =>
      useAnimationLoop({ canvasRef: { current: canvas }, paused: false, customImageUrl: null }),
    );
    runFrame(17);

    expect(getAnimation).toHaveBeenCalledWith('matrix');
    expect(draw.mock.calls[0]?.[0].renderDensity).toBe(0.5);
    unmount();
  });

  it('updates brightness and opacity styles only when their settings change', () => {
    const { canvas } = createCanvas();
    const runFrame = installAnimationFrames();
    let filterWrites = 0;
    let opacityWrites = 0;
    Object.defineProperty(canvas.style, 'filter', {
      get: () => '',
      set: () => {
        filterWrites += 1;
      },
      configurable: true,
    });
    Object.defineProperty(canvas.style, 'opacity', {
      get: () => '',
      set: () => {
        opacityWrites += 1;
      },
      configurable: true,
    });

    const { unmount } = renderHook(() =>
      useAnimationLoop({ canvasRef: { current: canvas }, paused: false, customImageUrl: null }),
    );
    runFrame(17);
    runFrame(34);
    runFrame(51);
    expect(filterWrites).toBe(1);
    expect(opacityWrites).toBe(1);

    useSettings.getState().set('brightness', 0.8);
    runFrame(68);
    expect(filterWrites).toBe(2);
    expect(opacityWrites).toBe(1);
    unmount();
  });

  it('clears transparently and forwards the resolved custom image URL', () => {
    const { canvas, context } = createCanvas();
    const runFrame = installAnimationFrames();

    const { unmount } = renderHook(() =>
      useAnimationLoop({
        canvasRef: { current: canvas },
        paused: false,
        customImageUrl: 'blob:custom-logo',
      }),
    );
    runFrame(17);

    expect(context.clearRect).toHaveBeenCalledTimes(1);
    expect(context.fillRect).not.toHaveBeenCalled();
    expect(context.drawImage).not.toHaveBeenCalled();
    expect(draw.mock.calls[0]?.[0].customImageUrl).toBe('blob:custom-logo');
    unmount();
  });
});
