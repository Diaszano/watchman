import type { ReactNode } from 'react';

interface Props {
  title: string;
  category: string;
  icon: ReactNode;
  selected: boolean;
  onSelect: () => void;
}

export const AnimationPreviewCard = ({ title, category, icon, selected, onSelect }: Props) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onSelect}
    className={`flex min-h-24 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${selected ? 'border-sky-500 bg-sky-500/10 text-sky-700 ring-2 ring-sky-500 dark:text-sky-300' : 'border-black/10 bg-black/5 text-neutral-700 hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10'}`}
  >
    <span aria-hidden="true" className="text-2xl">
      {icon}
    </span>
    <span className="text-xs font-medium">{title}</span>
    <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] dark:bg-white/10">
      {category}
    </span>
  </button>
);
