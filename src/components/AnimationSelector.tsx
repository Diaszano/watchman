import { animations } from '@/animations';
import { useSettings } from '@/stores/settingsStore';
import { useI18n } from '@/hooks/useI18n';

export const AnimationSelector = () => {
  const { t } = useI18n();
  const animationId = useSettings((s) => s.animationId);
  const set = useSettings((s) => s.set);

  return (
    <select
      aria-label={t('home.animation')}
      value={animationId}
      onChange={(e) => set('animationId', e.target.value)}
      className="rounded-xl border border-black/10 bg-black/5 px-4 py-2.5 text-neutral-900 backdrop-blur outline-none hover:bg-black/10 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
    >
      {animations.map((a) => (
        <option key={a.id} value={a.id} className="bg-white dark:bg-neutral-900">
          {t(`anim.${a.id}`)}
        </option>
      ))}
    </select>
  );
};
