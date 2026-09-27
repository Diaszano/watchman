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
    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-black/5 text-neutral-900 backdrop-blur transition-all hover:bg-black/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 dark:focus-visible:ring-offset-neutral-900 ${className}`}
    {...rest}
  >
    {icon}
  </button>
);
