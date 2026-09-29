import type { CSSProperties, Ref } from 'react';
import { useStoredImage } from '@/hooks/useStoredImage';
import { useSettings } from '@/stores/settingsStore';

interface Props {
  ref?: Ref<HTMLDivElement>;
}

export const ScreensaverBackground = ({ ref }: Props) => {
  const background = useSettings((state) => state.background);
  const color = useSettings((state) => state.color);
  const gradientBackground = useSettings((state) => state.gradientBackground);
  const backgroundImageId = useSettings((state) => state.backgroundImageId);
  const antiBurnIn = useSettings((state) => state.antiBurnIn);
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

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`absolute ${antiBurnIn ? '-inset-6' : 'inset-0'}`}
      style={style}
    />
  );
};
