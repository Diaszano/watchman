import type { ReactNode } from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface Props<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  'aria-label'?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
  'aria-label': ariaLabel,
  className = '',
  size = 'md',
}: Props<T>) => {
  const sizeClasses = size === 'sm' ? 'p-0.5 text-xs' : 'p-1 text-xs sm:text-[13px]';
  const itemPadding = size === 'sm' ? 'px-2.5 py-1' : 'px-3 py-1.5';

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex items-center rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] p-1 ${sizeClasses} ${className}`}
    >
      {options.map((option, idx) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                e.preventDefault();
                const next = options[(idx + 1) % options.length]!;
                onChange(next.value);
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const prev = options[(idx - 1 + options.length) % options.length]!;
                onChange(prev.value);
              }
            }}
            className={`relative flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150 ${itemPadding} ${
              isSelected
                ? 'bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-sm font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]/50'
            }`}
          >
            {option.icon && <span className="shrink-0">{option.icon}</span>}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};
