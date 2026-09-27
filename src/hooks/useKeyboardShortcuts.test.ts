import { fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

const press = (key: string) =>
  fireEvent(window, new KeyboardEvent('keydown', { key, bubbles: true }));

describe('useKeyboardShortcuts', () => {
  it('calls escape when provided', () => {
    const onEscape = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        toggleFullscreen: vi.fn(),
        togglePause: vi.fn(),
        nextAnimation: vi.fn(),
        prevAnimation: vi.fn(),
        toggleSettings: vi.fn(),
        escape: onEscape,
      }),
    );

    press('Escape');
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('does nothing for Escape when the handler is absent', () => {
    const handlers = {
      toggleFullscreen: vi.fn(),
      togglePause: vi.fn(),
      nextAnimation: vi.fn(),
      prevAnimation: vi.fn(),
      toggleSettings: vi.fn(),
    };
    renderHook(() => useKeyboardShortcuts(handlers));

    press('Escape');
    Object.values(handlers).forEach((fn) => {
      expect(fn).not.toHaveBeenCalled();
    });
  });

  it('does not preventDefault on Escape so native fullscreen exit still runs', () => {
    renderHook(() =>
      useKeyboardShortcuts({
        toggleFullscreen: vi.fn(),
        togglePause: vi.fn(),
        nextAnimation: vi.fn(),
        prevAnimation: vi.fn(),
        toggleSettings: vi.fn(),
        escape: vi.fn(),
      }),
    );

    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it.each(['h', '?'])("toggles the shortcuts overlay via '%s'", (key) => {
    const toggleShortcuts = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        toggleFullscreen: vi.fn(),
        togglePause: vi.fn(),
        nextAnimation: vi.fn(),
        prevAnimation: vi.fn(),
        toggleSettings: vi.fn(),
        toggleShortcuts,
      }),
    );

    press(key);
    expect(toggleShortcuts).toHaveBeenCalledTimes(1);
  });

  it('ignores keys typed inside inputs', () => {
    const toggleShortcuts = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        toggleFullscreen: vi.fn(),
        togglePause: vi.fn(),
        nextAnimation: vi.fn(),
        prevAnimation: vi.fn(),
        toggleSettings: vi.fn(),
        toggleShortcuts,
      }),
    );

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', bubbles: true }));
    expect(toggleShortcuts).not.toHaveBeenCalled();
    input.remove();
  });
});
