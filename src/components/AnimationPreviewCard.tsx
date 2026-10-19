import type { ReactNode } from 'react';

interface Props {
  previewId?: string;
  title: string;
  category: string;
  icon: ReactNode;
  selected: boolean;
  onSelect: () => void;
}

export const AnimationPreviewCard = ({
  previewId,
  title,
  category,
  icon,
  selected,
  onSelect,
}: Props) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onSelect}
    className={`animation-card group relative flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-app)] ${selected ? 'is-selected' : ''}`}
  >
    <span
      aria-hidden="true"
      className={`animation-art preview-${previewId ?? 'dvd'} w-full transition-transform duration-300 group-hover:scale-[1.02]`}
    >
      <span className="preview-symbol select-none">{icon}</span>
      <span
        className={`selection-indicator transition-all ${selected ? 'shadow-sm' : 'opacity-60 group-hover:opacity-100'}`}
      >
        {selected ? '✓' : '+'}
      </span>
    </span>
    <span className="card-caption">
      <span className="card-title">{title}</span>
      <span className="card-category">{category}</span>
    </span>
  </button>
);
