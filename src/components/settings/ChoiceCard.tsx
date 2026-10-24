'use client';

import { useId, type ReactNode } from 'react';

/**
 * A selectable card of a radio group (provider, model). The real radio is visible as the
 * round marker, so it stays clickable, focusable and testable like any radio input.
 * Local to the settings dialog; would move to src/components/ui/ if a second area needs it.
 */
export function ChoiceCard({
  name,
  value,
  checked,
  onSelect,
  title,
  meta,
  badge,
  icon,
  highlight = false,
  testId,
  children,
  aside,
  className = '',
}: {
  name: string;
  value: string;
  checked: boolean;
  onSelect: (value: string) => void;
  title: ReactNode;
  /** Small text right after the title (e.g. the vendor). */
  meta?: ReactNode;
  badge?: ReactNode;
  icon?: ReactNode;
  /** Accent border even when not selected (the recommended option). */
  highlight?: boolean;
  testId?: string;
  /** Description below the title. */
  children?: ReactNode;
  /** Right column on wider screens (wraps below on narrow ones), e.g. the price. */
  aside?: ReactNode;
  className?: string;
}) {
  const id = useId();
  const titleId = `${id}-title`;
  const textId = `${id}-text`;
  const asideId = `${id}-aside`;
  const describedBy = [children ? textId : null, aside ? asideId : null].filter(Boolean).join(' ') || undefined;
  const frame = checked
    ? 'border-accent bg-accent/10'
    : highlight
      ? 'border-accent/45 bg-raised hover:border-accent/70 hover:bg-hover'
      : 'border-line bg-raised hover:border-line-strong hover:bg-hover';
  return (
    <label
      htmlFor={id}
      className={`flex min-w-0 cursor-pointer gap-3 rounded-lg border p-3 transition-colors has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-text ${frame} ${className}`}
    >
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        data-testid={testId}
        className="mt-0.5 size-4 shrink-0 cursor-pointer appearance-none rounded-full border border-line-strong bg-canvas transition-[border-color,border-width] checked:border-[5px] checked:border-accent focus-visible:outline-none disabled:cursor-not-allowed"
      />
      <span className="flex min-w-0 flex-1 flex-wrap gap-x-4 gap-y-2">
        <span className="min-w-0 flex-[1_1_15rem]">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {icon ? <span className="text-fg-subtle">{icon}</span> : null}
            <span id={titleId} className="text-sm font-medium text-fg">
              {title}
            </span>
            {meta ? <span className="text-[13px] text-fg-subtle">{meta}</span> : null}
            {badge}
          </span>
          {children ? (
            <span id={textId} className="mt-1 block text-[13px] leading-snug text-fg-muted">
              {children}
            </span>
          ) : null}
        </span>
        {aside ? (
          <span id={asideId} className="shrink-0 sm:text-right">
            {aside}
          </span>
        ) : null}
      </span>
    </label>
  );
}
