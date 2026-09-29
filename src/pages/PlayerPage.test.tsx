import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerPage } from './PlayerPage';
import { defaultSettings, useSettings } from '@/stores/settingsStore';
import type { useAnimationLoop as useAnimationLoopType } from '@/hooks/useAnimationLoop';

const loopCalls: Array<Parameters<typeof useAnimationLoopType>[0]> = [];

vi.mock('@/hooks/useAnimationLoop', () => ({
  useAnimationLoop: (opts: Parameters<typeof useAnimationLoopType>[0]) => {
    loopCalls.push(opts);
  },
}));
vi.mock('@/hooks/useWakeLock', () => ({ useWakeLock: () => ({ supported: true }) }));
vi.mock('@/hooks/useStoredImage', () => ({ useStoredImage: () => ({ url: null }) }));

describe('PlayerPage HUD', () => {
  beforeEach(() => {
    loopCalls.length = 0;
    useSettings.setState({ ...defaultSettings });
  });

  afterEach(() => vi.useRealTimers());

  it('wakes and renews the HUD timer on keydown', () => {
    vi.useFakeTimers();
    render(<PlayerPage />);
    const controls = screen.getByRole('button', { name: 'Open settings' }).parentElement!;
    act(() => vi.advanceTimersByTime(3000));
    expect(controls).toHaveClass('opacity-0');
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'n' })));
    expect(controls).toHaveClass('opacity-100');
    act(() => vi.advanceTimersByTime(2999));
    expect(controls).toHaveClass('opacity-100');
    act(() => vi.advanceTimersByTime(1));
    expect(controls).toHaveClass('opacity-0');
  });

  it('opens shortcuts from the HUD', () => {
    render(<PlayerPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Show keyboard shortcuts' }));
    expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument();
  });

  it('supplies onFps callback only when showFps is enabled', () => {
    useSettings.setState({ ...defaultSettings, showFps: false });
    const { rerender } = render(<PlayerPage />);
    const lastCallWithoutFps = loopCalls.at(-1)!;
    expect(lastCallWithoutFps.onFps).toBeUndefined();

    // Turn showFps on
    act(() => {
      useSettings.getState().set('showFps', true);
    });
    rerender(<PlayerPage />);
    const lastCallWithFps = loopCalls.at(-1)!;
    expect(typeof lastCallWithFps.onFps).toBe('function');
  });
});
