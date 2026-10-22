import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-holly-500 to-holly-600 text-white shadow-[0_8px_24px_-12px_rgb(200_68_61/0.9)] hover:from-holly-500 hover:to-holly-500 disabled:from-night-700 disabled:to-night-700 disabled:text-mist-400 disabled:shadow-none',
  secondary:
    'bg-fir-600 text-white hover:bg-fir-500 disabled:bg-night-700 disabled:text-mist-400',
  ghost:
    'border border-white/10 bg-white/4 text-mist-300 hover:bg-white/8 hover:text-snow-50 disabled:text-mist-400/60 disabled:hover:bg-white/4',
};

export function Button({
  variant = 'secondary',
  icon,
  children,
  className = '',
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: ReactNode }) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
