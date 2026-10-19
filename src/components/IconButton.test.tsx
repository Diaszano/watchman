import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CloseIcon } from './icons';
import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('has an accessible name and activates on click', () => {
    const onClick = vi.fn();
    render(<IconButton label="Close" icon={<CloseIcon />} onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Close' });
    expect(button).toHaveAttribute('title', 'Close');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('provides at least 44px touch targets', () => {
    render(<IconButton label="Close" icon={<CloseIcon />} />);
    const button = screen.getByRole('button', { name: 'Close' });
    expect(button.className).toContain('h-11');
    expect(button.className).toContain('w-11');
  });
});
