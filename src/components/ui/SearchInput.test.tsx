import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchInput } from './SearchInput';

describe('SearchInput', () => {
  it('names the search and clear actions in the active language', () => {
    const onChange = vi.fn();
    render(
      <SearchInput
        value="dvd"
        onChange={onChange}
        label="Buscar animações"
        clearLabel="Limpar busca"
      />,
    );

    expect(screen.getByRole('searchbox', { name: 'Buscar animações' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Limpar busca' }));
    expect(onChange).toHaveBeenCalledWith('');
    expect(screen.getByRole('searchbox')).toHaveFocus();
  });
});
