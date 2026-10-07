import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  icon: ReactNode;
  label: string;
};

export const IconButton = ({ icon, label, className = '', ...rest }: Props) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/70 text-[var(--text-primary)] backdrop-blur-md transition-all duration-150 hover:bg-[var(--surface-hover)] hover:border-[var(--border-hover)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-app)] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    {...rest}
  >
    {icon}
  </button>
);
