import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CloseIcon } from './icons';
import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('has a square target and accessible name', () => {
    const onClick = vi.fn();
    render(<IconButton label="Close" icon={<CloseIcon />} onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Close' });
    expect(button).toHaveAttribute('title', 'Close');
    expect(button).toHaveClass('h-10', 'w-10');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
