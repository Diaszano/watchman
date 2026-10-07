import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--accent)] text-[var(--accent-text)] hover:brightness-105 active:brightness-95 shadow-sm font-semibold border border-transparent',
  secondary:
    'bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-hover)] shadow-sm font-medium',
  ghost:
    'bg-[var(--surface-hover)]/70 text-[var(--text-primary)] border border-[var(--border)]/70 hover:bg-[var(--surface-hover)] active:bg-[var(--surface-active)] font-medium backdrop-blur-sm',
  destructive:
    'bg-[var(--danger)] text-white hover:brightness-105 active:brightness-95 shadow-sm font-semibold border border-transparent',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5 min-h-[32px]',
  md: 'px-4 py-2 text-xs sm:text-[13px] rounded-xl gap-2 min-h-[40px]',
  lg: 'px-5 py-2.5 text-sm rounded-xl gap-2.5 min-h-[46px]',
};

export const Button = ({
  variant = 'ghost',
  size = 'md',
  className = '',
  children,
  ...rest
}: Props) => (
  <button
    type={rest.type ?? 'button'}
    className={`inline-flex items-center justify-center select-none transition-all duration-150 cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-app)] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    {...rest}
  >
    {children}
  </button>
);
