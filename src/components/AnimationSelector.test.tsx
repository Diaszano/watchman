import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { defaultSettings, useSettings } from '@/stores/settingsStore';
import { AnimationSelector } from './AnimationSelector';

describe('AnimationSelector', () => {
  beforeEach(() => useSettings.setState(defaultSettings));

  it('shows ten choices and selects Matrix with a click', () => {
    render(<AnimationSelector />);
    expect(screen.getAllByRole('button')).toHaveLength(10);
    fireEvent.click(screen.getByRole('button', { name: /Matrix Rain/ }));
    expect(useSettings.getState().animationId).toBe('matrix');
    expect(screen.getByRole('button', { name: /Matrix Rain/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
