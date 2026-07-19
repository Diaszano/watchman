import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const styles: Record<Variant, string> = {
  primary: 'bg-sky-500 text-white hover:bg-sky-400 active:bg-sky-600 shadow-lg shadow-sky-500/30',
  ghost: 'bg-white/10 text-white hover:bg-white/20 backdrop-blur border border-white/10',
};

export const Button = ({ variant = 'ghost', className = '', children, ...rest }: Props) => (
  <button
    className={`rounded-xl px-5 py-2.5 font-medium transition-colors disabled:opacity-50 ${styles[variant]} ${className}`}
    {...rest}
  >
    {children}
  </button>
);
