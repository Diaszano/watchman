import type { ReactNode } from 'react';

type Variant = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

interface Props {
  children: ReactNode;
  variant?: Variant;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

const variantStyles: Record<Variant, { bg: string; text: string; dot: string }> = {
  default: {
    bg: 'bg-[var(--border)]/50',
    text: 'text-[var(--text-secondary)]',
    dot: 'bg-[var(--text-muted)]',
  },
  accent: {
    bg: 'bg-[var(--accent-subtle)]',
    text: 'text-[var(--accent)]',
    dot: 'bg-[var(--accent)]',
  },
  success: {
    bg: 'bg-[var(--success-subtle)]',
    text: 'text-[var(--success)]',
    dot: 'bg-[var(--success)]',
  },
  warning: {
    bg: 'bg-[var(--warning-subtle)]',
    text: 'text-[var(--warning)]',
    dot: 'bg-[var(--warning)]',
  },
  danger: {
    bg: 'bg-[var(--danger-subtle)]',
    text: 'text-[var(--danger)]',
    dot: 'bg-[var(--danger)]',
  },
  info: {
    bg: 'bg-[var(--info-subtle)]',
    text: 'text-[var(--info)]',
    dot: 'bg-[var(--info)]',
  },
};

export const Badge = ({
  children,
  variant = 'default',
  dot = false,
  pulse = false,
  className = '',
  size = 'md',
}: Props) => {
  const styles = variantStyles[variant];
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border border-transparent transition-colors ${styles.bg} ${styles.text} ${sizeClasses} ${className}`}
    >
      {dot && (
        <span className="relative flex h-2 w-2">
          {pulse && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${styles.dot}`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${styles.dot}`} />
        </span>
      )}
      {children}
    </span>
  );
};
