import { useEffect, useState } from 'react';
import { imageStorage } from '@/services/imageStorage';

interface StoredImageState {
  url: string | null;
  error: Error | null;
}

interface LoadedImageState extends StoredImageState {
  id: string | null;
}

const emptyState: StoredImageState = { url: null, error: null };

export const useStoredImage = (id: string | null): StoredImageState => {
  const [state, setState] = useState<LoadedImageState>({ id: null, ...emptyState });

  useEffect(() => {
    let active = true;
    let url: string | null = null;

    if (!id) return;

    void imageStorage
      .get(id)
      .then((blob) => {
        if (!active) return;
        url = blob ? URL.createObjectURL(blob) : null;
        setState({ id, url, error: null });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            id,
            url: null,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      });

    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);

  return state.id === id ? state : emptyState;
};
