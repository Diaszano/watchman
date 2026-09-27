import { render } from '@testing-library/react';
import { Logo } from './Logo';

test('renders the Watchman brand image at the requested width', () => {
  const { container } = render(<Logo size={240} />);
  const logo = container.querySelector('img');

  expect(logo).toHaveAttribute('src', '/logo.png');
  expect(logo).toHaveAttribute('width', '240');
});
