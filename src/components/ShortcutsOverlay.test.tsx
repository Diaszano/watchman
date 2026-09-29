import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ShortcutsOverlay } from './ShortcutsOverlay';

describe('ShortcutsOverlay', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<ShortcutsOverlay open={false} onClose={() => undefined} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the title and every shortcut action when open', () => {
    render(<ShortcutsOverlay open onClose={() => undefined} />);

    expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument();
    expect(screen.getByText('Toggle fullscreen')).toBeInTheDocument();
    expect(screen.getByText('Pause / resume')).toBeInTheDocument();
    expect(screen.getByText('Toggle settings')).toBeInTheDocument();
    expect(screen.getByText('Next animation')).toBeInTheDocument();
    expect(screen.getByText('Previous animation')).toBeInTheDocument();
    expect(screen.getByText('Toggle this help')).toBeInTheDocument();
  });

  it('closes from the backdrop click outside the dialog bounding box', () => {
    const onClose = vi.fn();
    render(<ShortcutsOverlay open onClose={onClose} />);
    const dialog = screen.getByRole('dialog');

    fireEvent.click(dialog, { clientX: 10, clientY: 10 });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking inside the dialog card', () => {
    const onClose = vi.fn();
    render(<ShortcutsOverlay open onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 400,
      bottom: 500,
      width: 400,
      height: 500,
      toJSON: () => {},
    });

    fireEvent.click(dialog, { clientX: 200, clientY: 200 });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes from the ✕ button in the card', () => {
    const onClose = vi.fn();
    render(<ShortcutsOverlay open onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape without passing it to window shortcuts', () => {
    const onClose = vi.fn();
    const onWindowKeyDown = vi.fn();
    window.addEventListener('keydown', onWindowKeyDown);
    render(<ShortcutsOverlay open onClose={onClose} />);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
    expect(onWindowKeyDown).not.toHaveBeenCalled();
    window.removeEventListener('keydown', onWindowKeyDown);
  });

  it('closes on cancel event', () => {
    const onClose = vi.fn();
    render(<ShortcutsOverlay open onClose={onClose} />);

    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('restores focus to the opener element when closed', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();
    expect(document.activeElement).toBe(button);

    const { rerender } = render(<ShortcutsOverlay open onClose={() => {}} />);
    rerender(<ShortcutsOverlay open={false} onClose={() => {}} />);

    expect(document.activeElement).toBe(button);
    document.body.removeChild(button);
  });
});
