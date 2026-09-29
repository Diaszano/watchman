import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnimationFrame } from '@/types';

const { draw, getAnimation } = vi.hoisted(() => ({
  draw: vi.fn<(frame: AnimationFrame) => void>(),
  getAnimation: vi.fn(() => ({ create: () => ({ draw }) })),
}));

vi.mock('@/animations', () => ({
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
  let nextId = 1;
  const activeCallbacks = new Map<number, FrameRequestCallback>();

  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((next) => {
    const id = nextId++;
    callback = next;
    activeCallbacks.set(id, next);
    return id;
  });

  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    activeCallbacks.delete(id);
    if (activeCallbacks.size === 0) {
      callback = undefined;
    }
  });

  const runner = (now: number) => {
    if (!callback) throw new Error('animation frame callback was not scheduled');
    const cb = callback;
    callback = undefined;
    for (const [id, fn] of activeCallbacks.entries()) {
      if (fn === cb) {
        activeCallbacks.delete(id);
        break;
      }
    }
    act(() => cb(now));
  };

  runner.runFrame = runner;
  runner.hasPendingFrame = () => activeCallbacks.size > 0;
  return runner;
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

  it('caps canvas allocation to DPR 2 and passes density 1', () => {
    const { canvas } = createCanvas(800, 600);
    const runFrame = installAnimationFrames();
    Object.defineProperty(window, 'devicePixelRatio', { value: 3, configurable: true });

    const { unmount } = renderHook(() =>
      useAnimationLoop({ canvasRef: { current: canvas }, paused: false, customImageUrl: null }),
    );
    runFrame(17);

    expect(canvas.width).toBe(1600);
    expect(canvas.height).toBe(1200);
    expect(draw.mock.calls[0]?.[0].renderDensity).toBe(1);
    unmount();
  });

  it('updates opacity style only when opacity changes and does not write filter to canvas', () => {
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
    expect(filterWrites).toBe(0);
    expect(opacityWrites).toBe(1);

    useSettings.getState().set('brightness', 0.8);
    runFrame(68);
    expect(filterWrites).toBe(0);
    expect(opacityWrites).toBe(1);

    useSettings.getState().set('opacity', 0.5);
    runFrame(85);
    expect(filterWrites).toBe(0);
    expect(opacityWrites).toBe(2);
    unmount();
  });

  it('applies antiBurnIn drift transform to backgroundRef and clears it when disabled', () => {
    const { canvas, context } = createCanvas();
    const background = document.createElement('div');
    const runFrame = installAnimationFrames();
    useSettings.getState().set('antiBurnIn', true);

    const { unmount } = renderHook(() =>
      useAnimationLoop({
        canvasRef: { current: canvas },
        backgroundRef: { current: background },
        paused: false,
        customImageUrl: null,
      }),
    );

    // Initial frame
    runFrame(17);

    // Advance time past 5s to trigger drift target change
    vi.spyOn(Math, 'random').mockReturnValue(0.8);
    runFrame(5100);
    runFrame(5200);

    expect(background.style.transform).toMatch(/^translate\(-?\d+(\.\d+)?px, -?\d+(\.\d+)?px\)$/);
    expect(context.setTransform).toHaveBeenCalled();

    // Disable antiBurnIn
    useSettings.getState().set('antiBurnIn', false);
    runFrame(5300);

    expect(background.style.transform).toBe('');

    unmount();
  });

  it('resets background transform when antiBurnIn is disabled while paused', () => {
    const { canvas } = createCanvas();
    const background = document.createElement('div');
    background.style.transform = 'translate(10px, 10px)';
    installAnimationFrames();
    useSettings.getState().set('antiBurnIn', true);

    const { unmount } = renderHook(() =>
      useAnimationLoop({
        canvasRef: { current: canvas },
        backgroundRef: { current: background },
        paused: true,
        customImageUrl: null,
      }),
    );

    act(() => {
      useSettings.getState().set('antiBurnIn', false);
    });

    expect(background.style.transform).toBe('');

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

  it('draws, pauses, and resumes preserving animation instance, canvas size, and excluding pause time from dt', () => {
    const { canvas } = createCanvas(800, 600);
    const frames = installAnimationFrames();
    let widthSetCount = 0;
    let currentW = 800;
    Object.defineProperty(canvas, 'width', {
      get: () => currentW,
      set: (v: number) => {
        widthSetCount++;
        currentW = v;
      },
      configurable: true,
    });

    const { rerender, unmount } = renderHook(
      ({ paused }) =>
        useAnimationLoop({
          canvasRef: { current: canvas },
          paused,
          customImageUrl: null,
        }),
      { initialProps: { paused: false } },
    );

    expect(getAnimation).toHaveBeenCalledTimes(1);
    const initialWidthSets = widthSetCount;

    frames.runFrame(17);
    expect(draw).toHaveBeenCalledTimes(1);

    // Pause
    rerender({ paused: true });

    // Instance not recreated, canvas width not re-set, no active rAF callback
    expect(getAnimation).toHaveBeenCalledTimes(1);
    expect(widthSetCount).toBe(initialWidthSets);
    expect(frames.hasPendingFrame()).toBe(false);

    // Resume after 500ms
    vi.spyOn(performance, 'now').mockReturnValue(517);
    rerender({ paused: false });
    expect(frames.hasPendingFrame()).toBe(true);

    frames.runFrame(534);
    expect(getAnimation).toHaveBeenCalledTimes(1);
    const lastDrawCall = draw.mock.calls.at(-1)![0];
    expect(lastDrawCall.dt).toBeCloseTo(0.017, 2);

    unmount();
  });

  it('redraws with dt = 0 upon visual setting change while paused without advancing time or playlist', () => {
    const { canvas } = createCanvas();
    installAnimationFrames();
    useSettings.getState().set('autoSwitch', 10);
    useSettings.getState().set('playlist', ['dvd', 'clock']);

    const { unmount } = renderHook(() =>
      useAnimationLoop({
        canvasRef: { current: canvas },
        paused: true,
        customImageUrl: null,
      }),
    );

    draw.mockClear();

    // Visual setting change while paused
    act(() => {
      useSettings.getState().set('size', 80);
    });

    expect(draw).toHaveBeenCalledTimes(1);
    const call = draw.mock.calls[0]![0];
    expect(call.dt).toBe(0);
    expect(call.time).toBe(0);
    expect(useSettings.getState().animationId).toBe('dvd');

    unmount();
  });

  it('does not recreate animation instance when toggling onFps or customImageUrl', () => {
    const { canvas } = createCanvas();
    installAnimationFrames();
    const fpsCallback1 = vi.fn();
    const fpsCallback2 = vi.fn();

    const { rerender, unmount } = renderHook<
      void,
      { onFps?: (fps: number) => void; customImageUrl: string | null }
    >(
      ({ onFps, customImageUrl }) =>
        useAnimationLoop({
          canvasRef: { current: canvas },
          paused: false,
          onFps,
          customImageUrl,
        }),
      { initialProps: { onFps: fpsCallback1, customImageUrl: 'url1' } },
    );

    expect(getAnimation).toHaveBeenCalledTimes(1);

    rerender({ onFps: fpsCallback2, customImageUrl: 'url2' });
    expect(getAnimation).toHaveBeenCalledTimes(1);

    rerender({ onFps: undefined, customImageUrl: 'url2' });
    expect(getAnimation).toHaveBeenCalledTimes(1);

    unmount();
  });
});
