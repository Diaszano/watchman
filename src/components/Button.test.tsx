import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from './Button';

describe('Button accessibility', () => {
  it('includes visible focus styles', () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole('button', { name: /click me/i });
    expect(btn.className).toContain('focus-visible:ring-2');
  });

  it('provides at least 44px touch targets on small buttons', () => {
    render(<Button size="sm">Small action</Button>);
    const btn = screen.getByRole('button', { name: /small action/i });
    expect(btn.className).toContain('min-h-[44px]');
    expect(btn.className).toContain('min-w-[44px]');
  });
});
