import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettings, defaultSettings } from '@/stores/settingsStore';
import { useStoredImage } from '@/hooks/useStoredImage';
import { ScreensaverBackground } from './ScreensaverBackground';

vi.mock('@/hooks/useStoredImage', () => ({ useStoredImage: vi.fn() }));

describe('ScreensaverBackground', () => {
  beforeEach(() => {
    useSettings.setState(defaultSettings);
    vi.mocked(useStoredImage).mockReturnValue({ url: null, error: null });
  });

  it('renders the configured solid color', () => {
    useSettings.setState({ background: '#123456' });
    const { container } = render(<ScreensaverBackground />);

    expect(container.firstChild).toHaveStyle({ backgroundColor: '#123456' });
  });

  it('renders the exact CSS gradient when enabled', () => {
    useSettings.setState({
      background: '#111111',
      color: '#abcdef',
      gradientBackground: true,
    });
    const { container } = render(<ScreensaverBackground />);

    expect(container.firstChild).toHaveStyle({
      backgroundImage: 'linear-gradient(135deg, #111111, #abcdef)',
    });
  });

  it('renders a resolved stored image above the color or gradient choice', () => {
    useSettings.setState({ backgroundImageId: 'background-1', gradientBackground: true });
    vi.mocked(useStoredImage).mockReturnValue({ url: 'blob:background-1', error: null });
    const { container } = render(<ScreensaverBackground />);

    expect(useStoredImage).toHaveBeenCalledWith('background-1');
    expect(container.firstChild).toHaveStyle({
      backgroundImage: 'url("blob:background-1")',
      backgroundPosition: 'center',
      backgroundSize: 'cover',
    });
  });
});
