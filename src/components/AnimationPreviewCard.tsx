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
    className={`animation-card group relative flex flex-col text-left cursor-pointer rounded-2xl overflow-hidden border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-app)] ${
      selected
        ? 'is-selected border-[var(--accent)] shadow-md shadow-[var(--accent)]/10 ring-1 ring-[var(--accent)]/40'
        : 'border-[var(--border)] hover:border-[var(--border-hover)] hover:-translate-y-1 hover:shadow-md'
    }`}
  >
    <span
      aria-hidden="true"
      className={`animation-art preview-${previewId ?? 'dvd'} relative w-full h-28 flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-[1.02]`}
    >
      <span className="preview-symbol select-none">{icon}</span>
      <span
        className={`selection-indicator absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold transition-all ${
          selected
            ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-sm'
            : 'bg-[var(--surface)]/80 text-[var(--text-muted)] border border-[var(--border)] opacity-60 group-hover:opacity-100'
        }`}
      >
        {selected ? '✓' : '+'}
      </span>
    </span>
    <span className="card-caption flex flex-col gap-1 p-3.5 bg-[var(--surface)]">
      <span className="card-title text-xs sm:text-[13px] font-semibold text-[var(--text-primary)] tracking-tight">
        {title}
      </span>
      <span className="card-category text-[11px] font-medium text-[var(--text-muted)]">
        {category}
      </span>
    </span>
  </button>
);
