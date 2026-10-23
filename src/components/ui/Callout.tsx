import type { HTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';

export type CalloutTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

const TONES: Record<CalloutTone, { box: string; icon: IconName; iconClass: string }> = {
  info: { box: 'border-info/35 bg-info/8 text-fg', icon: 'info', iconClass: 'text-info-text' },
  success: { box: 'border-accent/40 bg-accent/10 text-fg', icon: 'check', iconClass: 'text-accent-text' },
  warning: { box: 'border-warning/40 bg-warning/8 text-fg', icon: 'alert', iconClass: 'text-warning-text' },
  danger: { box: 'border-danger/45 bg-danger/10 text-fg', icon: 'alert', iconClass: 'text-danger-text' },
  neutral: { box: 'border-line bg-raised text-fg', icon: 'info', iconClass: 'text-fg-subtle' },
};

/**
 * A boxed message: hints, warnings, errors, results. Pass `role="alert"` for errors that
 * appear after an action, `role="status"` for results.
 */
export function Callout({
  tone = 'info',
  title,
  icon,
  children,
  actions,
  className = '',
  ...rest
}: Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  tone?: CalloutTone;
  title?: ReactNode;
  icon?: IconName | null;
  actions?: ReactNode;
}) {
  const t = TONES[tone];
  const iconName = icon === undefined ? t.icon : icon;
  return (
    <div className={`flex gap-2.5 rounded-lg border px-3 py-2.5 text-[13px] leading-snug ${t.box} ${className}`} {...rest}>
      {iconName ? <Icon name={iconName} className={`mt-px size-4 ${t.iconClass}`} /> : null}
      <div className="min-w-0 flex-1">
        {title ? <p className="font-medium text-fg">{title}</p> : null}
        {children ? <div className={title ? 'mt-0.5 text-fg-muted' : 'text-fg-muted'}>{children}</div> : null}
        {actions ? <div className="mt-2 flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
