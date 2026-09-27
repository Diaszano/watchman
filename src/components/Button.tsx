import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const styles: Record<Variant, string> = {
  primary:
    'bg-sky-700 text-white hover:bg-sky-600 active:bg-sky-800 shadow-lg shadow-sky-900/15 dark:bg-sky-300 dark:text-slate-950 dark:hover:bg-sky-200',
  ghost:
    'bg-black/5 text-neutral-900 hover:bg-black/10 backdrop-blur border border-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 dark:border-white/10',
};

export const Button = ({ variant = 'ghost', className = '', children, ...rest }: Props) => (
  <button
    className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 disabled:opacity-50 ${styles[variant]} ${className}`}
    {...rest}
  >
    {children}
  </button>
);
