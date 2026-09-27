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
    className={`animation-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${selected ? 'is-selected' : ''}`}
  >
    <span aria-hidden="true" className={`animation-art preview-${previewId ?? 'dvd'}`}>
      <span className="preview-symbol">{icon}</span>
      <span className="selection-indicator">{selected ? '✓' : '+'}</span>
    </span>
    <span className="card-caption">
      <span className="card-title">{title}</span>
      <span className="card-category">{category}</span>
    </span>
  </button>
);
