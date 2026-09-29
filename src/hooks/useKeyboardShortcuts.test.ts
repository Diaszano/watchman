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

  it('ignores shortcuts when modifier keys (Ctrl, Meta, Alt) are pressed', () => {
    const handlers = {
      toggleFullscreen: vi.fn(),
      togglePause: vi.fn(),
      nextAnimation: vi.fn(),
      prevAnimation: vi.fn(),
      toggleSettings: vi.fn(),
      toggleShortcuts: vi.fn(),
    };
    renderHook(() => useKeyboardShortcuts(handlers));

    fireEvent(window, new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }));
    fireEvent(window, new KeyboardEvent('keydown', { key: 'f', metaKey: true, bubbles: true }));
    fireEvent(window, new KeyboardEvent('keydown', { key: 'n', altKey: true, bubbles: true }));

    expect(handlers.toggleSettings).not.toHaveBeenCalled();
    expect(handlers.toggleFullscreen).not.toHaveBeenCalled();
    expect(handlers.nextAnimation).not.toHaveBeenCalled();
  });

  it('allows Shift modifier for shortcuts like ? but continues pausing with Space in body', () => {
    const handlers = {
      toggleFullscreen: vi.fn(),
      togglePause: vi.fn(),
      nextAnimation: vi.fn(),
      prevAnimation: vi.fn(),
      toggleSettings: vi.fn(),
      toggleShortcuts: vi.fn(),
    };
    renderHook(() => useKeyboardShortcuts(handlers));

    fireEvent(window, new KeyboardEvent('keydown', { key: '?', shiftKey: true, bubbles: true }));
    expect(handlers.toggleShortcuts).toHaveBeenCalledTimes(1);

    fireEvent(window, new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    expect(handlers.togglePause).toHaveBeenCalledTimes(1);
  });

  it('ignores events with defaultPrevented, repeat, or isComposing', () => {
    const handlers = {
      toggleFullscreen: vi.fn(),
      togglePause: vi.fn(),
      nextAnimation: vi.fn(),
      prevAnimation: vi.fn(),
      toggleSettings: vi.fn(),
    };
    renderHook(() => useKeyboardShortcuts(handlers));

    const preventedEvent = new KeyboardEvent('keydown', { key: 'n', bubbles: true, cancelable: true });
    preventedEvent.preventDefault();
    fireEvent(window, preventedEvent);

    fireEvent(window, new KeyboardEvent('keydown', { key: 'n', repeat: true, bubbles: true }));
    fireEvent(window, new KeyboardEvent('keydown', { key: 'n', isComposing: true, bubbles: true }));

    expect(handlers.nextAnimation).not.toHaveBeenCalled();
  });

  it('ignores keys inside select, button, input, textarea, link, and contenteditable descendants without preventing default', () => {
    const handlers = {
      toggleFullscreen: vi.fn(),
      togglePause: vi.fn(),
      nextAnimation: vi.fn(),
      prevAnimation: vi.fn(),
      toggleSettings: vi.fn(),
      toggleShortcuts: vi.fn(),
    };
    renderHook(() => useKeyboardShortcuts(handlers));

    const container = document.createElement('div');
    document.body.appendChild(container);

    const elements = [
      document.createElement('select'),
      document.createElement('button'),
      document.createElement('input'),
      document.createElement('textarea'),
      document.createElement('a'),
    ];

    const editableParent = document.createElement('div');
    editableParent.setAttribute('contenteditable', 'true');
    const editableChild = document.createElement('span');
    editableParent.appendChild(editableChild);
    container.appendChild(editableParent);
    elements.push(editableChild as unknown as HTMLElement);

    for (const el of elements) {
      if (el !== editableChild) {
        container.appendChild(el);
      }
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
      el.dispatchEvent(spaceEvent);
      expect(spaceEvent.defaultPrevented).toBe(false);

      const nEvent = new KeyboardEvent('keydown', { key: 'n', bubbles: true, cancelable: true });
      el.dispatchEvent(nEvent);
      expect(nEvent.defaultPrevented).toBe(false);

      const sEvent = new KeyboardEvent('keydown', { key: 's', bubbles: true, cancelable: true });
      el.dispatchEvent(sEvent);
      expect(sEvent.defaultPrevented).toBe(false);
    }

    expect(handlers.togglePause).not.toHaveBeenCalled();
    expect(handlers.nextAnimation).not.toHaveBeenCalled();
    expect(handlers.toggleSettings).not.toHaveBeenCalled();

    container.remove();
  });

  it('suspends shortcuts when enabled is false', () => {
    const handlers = {
      toggleFullscreen: vi.fn(),
      togglePause: vi.fn(),
      nextAnimation: vi.fn(),
      prevAnimation: vi.fn(),
      toggleSettings: vi.fn(),
    };
    renderHook(() => useKeyboardShortcuts(handlers, false));

    press(' ');
    press('n');
    press('s');
    press('f');

    expect(handlers.togglePause).not.toHaveBeenCalled();
    expect(handlers.nextAnimation).not.toHaveBeenCalled();
    expect(handlers.toggleSettings).not.toHaveBeenCalled();
    expect(handlers.toggleFullscreen).not.toHaveBeenCalled();
  });
});
