'use client';

import { useId, useState, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';

/**
 * A titled card. `collapsible` turns the title into a disclosure button (state kept in the
 * component; `defaultOpen` sets the start). The header keeps `data-testid="<headingId>-header"`.
 */
export function Panel({
  title,
  description,
  actions,
  children,
  className = '',
  bodyClassName = 'p-4',
  headingId,
  icon,
  badge,
  collapsible = false,
  defaultOpen = true,
  footer,
  testId,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  headingId?: string;
  icon?: ReactNode;
  /** Small label right after the title, e.g. <Badge>optional</Badge>. */
  badge?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** Bottom area below a divider (e.g. the main action of the panel). */
  footer?: ReactNode;
  testId?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  const expanded = !collapsible || open;
  return (
    <section
      aria-labelledby={headingId}
      data-testid={testId}
      className={`shrink-0 rounded-xl border border-line bg-surface shadow-(--shadow-panel) ${className}`}
    >
      <header
        className={`flex items-start justify-between gap-3 px-4 py-3 ${expanded ? 'border-b border-line' : ''}`}
        data-testid={headingId ? `${headingId}-header` : undefined}
      >
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          {icon ? <span className="mt-0.5 text-fg-subtle">{icon}</span> : null}
          <div className="min-w-0">
            <h2 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] leading-6 font-semibold text-fg">
              {collapsible ? (
                <button
                  type="button"
                  onClick={() => setOpen((o) => !o)}
                  aria-expanded={open}
                  aria-controls={bodyId}
                  className="-mx-1 inline-flex items-center gap-1.5 rounded-md px-1 text-left hover:text-white"
                >
                  <span id={headingId}>{title}</span>
                  <Icon name="chevron-down" className={`size-4 text-fg-subtle transition-transform ${open ? '' : '-rotate-90'}`} />
                </button>
              ) : (
                <span id={headingId}>{title}</span>
              )}
              {badge}
            </h2>
            {description ? <div className="mt-0.5 text-[13px] leading-snug text-fg-muted">{description}</div> : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
      </header>
      <div id={bodyId} hidden={!expanded} className={bodyClassName}>
        {children}
      </div>
      {footer && expanded ? <div className="border-t border-line px-4 py-3">{footer}</div> : null}
    </section>
  );
}
