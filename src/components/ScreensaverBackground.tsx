import type { CSSProperties } from 'react';
import { useStoredImage } from '@/hooks/useStoredImage';
import { useSettings } from '@/stores/settingsStore';

export const ScreensaverBackground = () => {
  const background = useSettings((state) => state.background);
  const color = useSettings((state) => state.color);
  const gradientBackground = useSettings((state) => state.gradientBackground);
  const backgroundImageId = useSettings((state) => state.backgroundImageId);
  const { url: backgroundUrl } = useStoredImage(backgroundImageId);

  const style: CSSProperties = backgroundUrl
    ? {
        backgroundImage: `url("${backgroundUrl}")`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }
    : gradientBackground
      ? { backgroundImage: `linear-gradient(135deg, ${background}, ${color})` }
      : { backgroundColor: background };

  return <div aria-hidden="true" className="absolute inset-0" style={style} />;
};
