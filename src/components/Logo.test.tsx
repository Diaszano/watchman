import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Logo } from './Logo';

describe('Logo', () => {
  it('renders the Watchman brand image at the requested width', () => {
    const { container } = render(<Logo size={240} />);
    const logo = container.querySelector('img');

    expect(logo).toHaveAttribute('src', '/logo.png');
    expect(logo).toHaveAttribute('width', '240');
  });

  it('renders with an accessible alt attribute', () => {
    render(<Logo />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', 'Watchman screensaver logo');
  });
});
