import type { HTMLAttributes, ReactNode } from 'react';

export type Tone = 'neutral' | 'accent' | 'gold' | 'info' | 'warning' | 'danger';

const TONES: Record<Tone, string> = {
  neutral: 'border-line-strong bg-raised text-fg-muted',
  accent: 'border-accent/45 bg-accent/12 text-accent-text',
  gold: 'border-gold/45 bg-gold/10 text-gold-text',
  info: 'border-info/45 bg-info/10 text-info-text',
  warning: 'border-warning/45 bg-warning/10 text-warning-text',
  danger: 'border-danger/45 bg-danger/10 text-danger-text',
};

/** Small status label. Text stays at 12 px – never smaller. */
export function Badge({
  tone = 'neutral',
  icon,
  children,
  className = '',
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone; icon?: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-px text-xs leading-5 font-medium whitespace-nowrap normal-case tracking-normal ${TONES[tone]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </span>
  );
}

/** A coloured dot for status lines ("bereit", "prüft", "Fehler"). */
export function StatusDot({ tone, pulse = false }: { tone: Tone; pulse?: boolean }) {
  const colour: Record<Tone, string> = {
    neutral: 'bg-fg-subtle',
    accent: 'bg-accent-text',
    gold: 'bg-gold',
    info: 'bg-info',
    warning: 'bg-warning',
    danger: 'bg-danger',
  };
  return (
    <span aria-hidden="true" className="relative inline-flex size-2 shrink-0">
      {pulse ? <span className={`absolute inset-0 animate-ping rounded-full opacity-60 ${colour[tone]}`} /> : null}
      <span className={`relative size-2 rounded-full ${colour[tone]}`} />
    </span>
  );
}
