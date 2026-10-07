import { animations } from '@/animations';
import { useSettings } from '@/stores/settingsStore';
import { useI18n } from '@/hooks/useI18n';
import { AnimationPreviewCard } from './AnimationPreviewCard';
import { EmptyState } from './ui/EmptyState';
import { Button } from './Button';

export const previews: Record<string, [string, 'classic' | 'effects' | 'custom']> = {
  dvd: ['DVD', 'classic'],
  solid: ['●', 'classic'],
  colorCycle: ['◉', 'effects'],
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

interface Props {
  searchQuery?: string;
  category?: 'all' | 'classic' | 'effects' | 'custom';
  onClearSearch?: () => void;
}

export const AnimationSelector = ({ searchQuery = '', category = 'all', onClearSearch }: Props) => {
  const { t } = useI18n();
  const animationId = useSettings((s) => s.animationId);
  const set = useSettings((s) => s.set);

  const query = searchQuery.trim().toLowerCase();

  const filtered = animations.filter((a) => {
    const itemCategory = previews[a.id]?.[1] ?? 'effects';
    const matchesCategory = category === 'all' || itemCategory === category;
    if (!matchesCategory) return false;

    if (!query) return true;
    const title = t(`anim.${a.id}`).toLowerCase();
    const catLabel = t(`home.category.${itemCategory}`).toLowerCase();
    return title.includes(query) || catLabel.includes(query) || a.id.toLowerCase().includes(query);
  });

  if (filtered.length === 0) {
    return (
      <EmptyState
        title={t('home.noResults')}
        description={t('home.noResultsDesc')}
        action={
          onClearSearch ? (
            <Button size="sm" variant="secondary" onClick={onClearSearch}>
              {t('home.clearSearch')}
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <fieldset aria-label={t('home.animation')} className="animation-grid border-0 p-0 m-0">
      {filtered.map((a) => (
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
