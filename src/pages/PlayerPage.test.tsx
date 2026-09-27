import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlayerPage } from './PlayerPage';

vi.mock('@/hooks/useAnimationLoop', () => ({ useAnimationLoop: () => undefined }));
vi.mock('@/hooks/useWakeLock', () => ({ useWakeLock: () => ({ supported: true }) }));
vi.mock('@/hooks/useStoredImage', () => ({ useStoredImage: () => ({ url: null }) }));

describe('PlayerPage HUD', () => {
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
});
