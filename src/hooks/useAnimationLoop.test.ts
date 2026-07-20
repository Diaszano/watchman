import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStorage = vi.hoisted(() => {
  const dummyStorage: Record<string, string> = {};
  const mock = {
    getItem: (key: string) => dummyStorage[key] ?? null,
    setItem: (key: string, val: string) => { dummyStorage[key] = String(val); },
    removeItem: (key: string) => { delete dummyStorage[key]; },
    clear: () => { for (const k in dummyStorage) delete dummyStorage[k]; },
    length: 0,
    key: () => null,
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: mock,
    configurable: true,
    writable: true,
  });
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {
      value: mock,
      configurable: true,
      writable: true,
    });
  }
  return mock;
});

import { renderHook } from '@testing-library/react';
import { useAnimationLoop } from './useAnimationLoop';
import { useSettings } from '@/stores/settingsStore';

describe('useAnimationLoop', () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
  });

  const createMockContext = () => {
    return new Proxy({}, {
      get: (_target, prop) => {
        if (prop === 'createLinearGradient') {
          return () => ({ addColorStop: vi.fn() });
        }
        return vi.fn();
      }
    }) as unknown as CanvasRenderingContext2D;
  };

  it('initializes animation loop without crashing', () => {
    const canvas = document.createElement('canvas');
    const canvasRef = { current: canvas };
    
    const { unmount } = renderHook(() =>
      useAnimationLoop({ canvasRef, paused: true })
    );
    
    expect(canvas).toBeDefined();
    unmount();
  });

  it('updates canvas style filter and opacity on frame', () => {
    const canvas = document.createElement('canvas');
    const mockCtx = createMockContext();

    vi.spyOn(canvas, 'getContext').mockReturnValue(mockCtx);
    const canvasRef = { current: canvas };

    let animationFrameCallback: FrameRequestCallback | null = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      animationFrameCallback = cb;
      return 1;
    });

    const { unmount } = renderHook(() =>
      useAnimationLoop({ canvasRef, paused: false })
    );

    if (animationFrameCallback) {
      const startTime = performance.now();
      (animationFrameCallback as FrameRequestCallback)(startTime + 100);
    }

    expect(canvas.style.filter).toContain('brightness');
    expect(canvas.style.opacity).toBe('1');

    unmount();
  });

  it('caches style updates when values do not change', () => {
    const canvas = document.createElement('canvas');
    const mockCtx = createMockContext();

    vi.spyOn(canvas, 'getContext').mockReturnValue(mockCtx);
    const canvasRef = { current: canvas };

    useSettings.getState().set('antiBurnIn', false);
    useSettings.getState().set('brightness', 1);
    useSettings.getState().set('opacity', 1);

    let filterSetCount = 0;
    let opacitySetCount = 0;
    let currentFilter = '';
    let currentOpacity = '';

    Object.defineProperty(canvas.style, 'filter', {
      get: () => currentFilter,
      set: (val) => {
        filterSetCount++;
        currentFilter = val;
      },
      configurable: true,
    });

    Object.defineProperty(canvas.style, 'opacity', {
      get: () => currentOpacity,
      set: (val) => {
        opacitySetCount++;
        currentOpacity = val;
      },
      configurable: true,
    });

    let animationFrameCallback: FrameRequestCallback | null = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      animationFrameCallback = cb;
      return 1;
    });

    const { unmount } = renderHook(() =>
      useAnimationLoop({ canvasRef, paused: false })
    );

    const startTime = performance.now();
    // Frame 1
    if (animationFrameCallback) {
      (animationFrameCallback as FrameRequestCallback)(startTime + 100);
    }
    expect(filterSetCount).toBe(1);
    expect(opacitySetCount).toBe(1);

    // Frame 2 with same settings
    if (animationFrameCallback) {
      (animationFrameCallback as FrameRequestCallback)(startTime + 200);
    }
    expect(filterSetCount).toBe(1);
    expect(opacitySetCount).toBe(1);

    unmount();
  });

  it('handles background image loading errors and prevents retries for invalid source', () => {
    const canvas = document.createElement('canvas');
    const mockCtx = createMockContext();

    vi.spyOn(canvas, 'getContext').mockReturnValue(mockCtx);
    const canvasRef = { current: canvas };

    useSettings.getState().set('backgroundImage', 'http://invalid-domain.test/broken.png');

    const imageInstances: Array<{ onerror?: () => void; onload?: () => void; src?: string }> = [];
    const MockImage = vi.fn().mockImplementation(() => {
      const imgObj = { onerror: undefined, onload: undefined, src: '' };
      imageInstances.push(imgObj);
      return imgObj;
    });
    vi.stubGlobal('Image', MockImage);

    let animationFrameCallback: FrameRequestCallback | null = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      animationFrameCallback = cb;
      return 1;
    });

    const { unmount } = renderHook(() =>
      useAnimationLoop({ canvasRef, paused: false })
    );

    const startTime = performance.now();
    // Frame 1: Triggers image load
    if (animationFrameCallback) {
      (animationFrameCallback as FrameRequestCallback)(startTime + 100);
    }
    expect(MockImage).toHaveBeenCalledTimes(1);

    // Simulate image load error
    if (imageInstances[0] && imageInstances[0].onerror) {
      imageInstances[0].onerror();
    }

    // Frame 2: Should NOT trigger another Image creation because bgLoadError is set
    if (animationFrameCallback) {
      (animationFrameCallback as FrameRequestCallback)(startTime + 200);
    }
    expect(MockImage).toHaveBeenCalledTimes(1);

    unmount();
  });
});
