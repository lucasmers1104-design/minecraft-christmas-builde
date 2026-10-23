import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from '@/components/ui/Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

/** primary = the one main action of an area; secondary = normal actions; ghost = quiet; danger = destructive. */
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white shadow-[0_1px_0_rgb(255_255_255/0.12)_inset,0_6px_18px_-10px_rgb(46_145_102/0.9)] hover:bg-accent-hover disabled:bg-raised disabled:text-fg-subtle disabled:shadow-none',
  secondary: 'border border-line-strong bg-raised text-fg hover:border-fg-subtle/60 hover:bg-hover disabled:text-fg-subtle disabled:hover:border-line-strong disabled:hover:bg-raised',
  ghost: 'text-fg-muted hover:bg-hover hover:text-fg disabled:text-fg-subtle/70 disabled:hover:bg-transparent',
  danger: 'border border-danger/50 bg-danger/12 text-danger-text hover:bg-danger/20 disabled:opacity-50',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 rounded-md px-2.5 text-[13px]',
  md: 'h-10 gap-2 rounded-lg px-4 text-sm',
  lg: 'h-12 gap-2 rounded-lg px-5 text-[15px]',
  icon: 'size-10 rounded-lg',
  'icon-sm': 'size-8 rounded-md',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  loading = false,
  children,
  className = '',
  type = 'button',
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  /** Shows a spinner instead of the icon and disables the button. */
  loading?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}
