import { useEffect, useState } from 'react';
import { imageStorage } from '@/services/imageStorage';

interface StoredImageState {
  url: string | null;
  error: Error | null;
}

export const useStoredImage = (id: string | null): StoredImageState => {
  const [state, setState] = useState<StoredImageState>({ url: null, error: null });

  useEffect(() => {
    let active = true;
    let url: string | null = null;

    if (!id) {
      setState({ url: null, error: null });
      return;
    }

    void imageStorage
      .get(id)
      .then((blob) => {
        if (!active) return;
        url = blob ? URL.createObjectURL(blob) : null;
        setState({ url, error: null });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
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

  return state;
};
