import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { imageStorage } from '@/services/imageStorage';
import { useStoredImage } from './useStoredImage';

describe('useStoredImage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('revokes object URLs when the ID changes and on unmount', async () => {
    vi.spyOn(imageStorage, 'get').mockImplementation(async (id) =>
      id ? new Blob([id], { type: 'image/png' }) : null,
    );
    const createObjectURL = vi
      .fn()
      .mockReturnValueOnce('blob:first')
      .mockReturnValueOnce('blob:second');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const { result, rerender, unmount } = renderHook(
      ({ id }: { id: string | null }) => useStoredImage(id),
      { initialProps: { id: 'first' } },
    );

    await waitFor(() => expect(result.current.url).toBe('blob:first'));

    rerender({ id: 'second' });
    await waitFor(() => expect(result.current.url).toBe('blob:second'));

    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:first');

    act(() => unmount());
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:second');
  });

  it('clears the previous image while a replacement is loading', async () => {
    let resolveSecondImage: ((blob: Blob | null) => void) | undefined;
    vi.spyOn(imageStorage, 'get').mockImplementation((id) => {
      if (id === 'first') return Promise.resolve(new Blob(['first'], { type: 'image/png' }));
      return new Promise((resolve) => {
        resolveSecondImage = resolve;
      });
    });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:first'), revokeObjectURL: vi.fn() });
    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) => useStoredImage(id),
      { initialProps: { id: 'first' } },
    );

    await waitFor(() => expect(result.current.url).toBe('blob:first'));

    rerender({ id: 'second' });

    expect(result.current).toEqual({ url: null, error: null });
    await act(async () => resolveSecondImage?.(null));
  });
});
