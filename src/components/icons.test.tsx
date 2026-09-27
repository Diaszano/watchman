import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlayIcon, PauseIcon, SettingsIcon, FullscreenIcon, CloseIcon, HelpIcon, ResetIcon } from './icons';

describe('HUD icons', () => {
  it('renders every icon as a decorative SVG', () => {
    for (const Icon of [PlayIcon, PauseIcon, SettingsIcon, FullscreenIcon, CloseIcon, HelpIcon, ResetIcon]) {
      const { container, unmount } = render(<Icon />);
      expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
      expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 24 24');
      unmount();
    }
  });
});
