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

  it('closes from the backdrop', () => {
    const onClose = vi.fn();
    render(<ShortcutsOverlay open onClose={onClose} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes from the ✕ button in the card', () => {
    const onClose = vi.fn();
    render(<ShortcutsOverlay open onClose={onClose} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Close' }).at(-1)!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
