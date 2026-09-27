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

  it('uses WebP with a PNG fallback and intrinsic dimensions', () => {
    const { container } = render(<Logo size={320} />);
    const picture = container.querySelector('picture');
    expect(picture?.querySelector('source')).toHaveAttribute('srcset', '/logo.webp');
    expect(picture?.querySelector('source')).toHaveAttribute('type', 'image/webp');
    expect(picture?.querySelector('img')).toHaveAttribute('src', '/logo.png');
    expect(picture?.querySelector('img')).toHaveAttribute('width', '320');
    expect(picture?.querySelector('img')).toHaveAttribute('height', String(Math.round(320 * 926 / 1698)));
  });
});
