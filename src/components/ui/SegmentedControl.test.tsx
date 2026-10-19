import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { SegmentedControl } from './SegmentedControl';

describe('SegmentedControl', () => {
  it('moves selection and focus together with arrow keys', () => {
    const Filter = () => {
      const [value, setValue] = useState('all');
      return (
        <SegmentedControl
          aria-label="Categoria da animação"
          value={value}
          options={[
            { value: 'all', label: 'Todas' },
            { value: 'classic', label: 'Clássico' },
          ]}
          onChange={setValue}
        />
      );
    };

    render(<Filter />);
    expect(screen.getByRole('group', { name: 'Categoria da animação' })).toBeInTheDocument();
    const all = screen.getByRole('button', { name: 'Todas' });
    const classic = screen.getByRole('button', { name: 'Clássico' });
    all.focus();
    fireEvent.keyDown(all, { key: 'ArrowRight' });
    expect(classic).toHaveAttribute('aria-pressed', 'true');
    expect(classic).toHaveFocus();
    expect(all).toHaveAttribute('tabindex', '-1');
  });
});
