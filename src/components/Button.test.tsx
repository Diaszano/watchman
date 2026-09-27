import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from './Button';

describe('Button accessibility', () => {
  it('includes visible focus styles', () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole('button', { name: /click me/i });
    expect(btn.className).toContain('focus-visible:ring-2');
  });
});
