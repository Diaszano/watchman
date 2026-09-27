import { animations } from '@/animations';
import { useSettings } from '@/stores/settingsStore';
import { useI18n } from '@/hooks/useI18n';
import { AnimationPreviewCard } from './AnimationPreviewCard';

const previews: Record<string, [string, 'classic' | 'effects' | 'custom']> = {
  dvd: ['DVD', 'classic'],
  clock: ['12:48', 'classic'],
  particles: ['✦', 'effects'],
  bubbles: ['○', 'effects'],
  starfield: ['✧', 'effects'],
  matrix: ['▦', 'effects'],
  neon: ['⚡', 'effects'],
  shapes: ['◇', 'effects'],
  logo: ['▣', 'custom'],
  text: ['Aa', 'custom'],
};

export const AnimationSelector = () => {
  const { t } = useI18n();
  const animationId = useSettings((s) => s.animationId);
  const set = useSettings((s) => s.set);

  return (
    <fieldset aria-label={t('home.animation')} className="animation-grid">
      {animations.map((a) => (
        <AnimationPreviewCard
          key={a.id}
          previewId={a.id}
          title={t(`anim.${a.id}`)}
          category={t(`home.category.${previews[a.id]?.[1] ?? 'effects'}`)}
          icon={previews[a.id]?.[0] ?? '✦'}
          selected={animationId === a.id}
          onSelect={() => set('animationId', a.id)}
        />
      ))}
    </fieldset>
  );
};
