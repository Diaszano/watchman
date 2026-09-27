import { useI18n } from '@/hooks/useI18n';

export const Logo = ({ size = 240 }: { size?: number }) => {
  const { t } = useI18n();
  return (
    <picture>
      <source srcSet="/logo.webp" type="image/webp" />
      <img
        src="/logo.png"
        alt={t('app.logoAlt')}
        width={size}
        height={Math.round(size * 926 / 1698)}
        decoding="async"
        className="h-auto max-w-full drop-shadow-[0_0_20px_rgba(56,189,248,0.5)]"
      />
    </picture>
  );
};
