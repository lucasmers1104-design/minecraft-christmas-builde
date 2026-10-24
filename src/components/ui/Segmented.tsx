'use client';

import { useId, type ReactNode } from 'react';

export interface SegmentOption<T extends string | number> {
  value: T;
  label: string;
  disabled?: boolean;
  hint?: string;
}

/** Accessible radio group rendered as segmented buttons (arrow keys via native radios). */
export function Segmented<T extends string | number>({
  legend,
  name,
  options,
  value,
  onChange,
  disabled = false,
  testId,
  badge,
  description,
}: {
  legend: string;
  name: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  testId?: string;
  badge?: ReactNode;
  /** Short help text under the legend. */
  description?: ReactNode;
}) {
  const id = useId();
  return (
    <fieldset className="min-w-0" disabled={disabled} data-testid={testId}>
      <legend className="mb-2 flex items-center gap-2 text-[13px] font-medium text-fg-muted">
        {legend}
        {badge}
      </legend>
      {description ? <p className="-mt-1 mb-2 text-xs text-fg-subtle">{description}</p> : null}
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const optionId = `${id}-${String(option.value)}`;
          const checked = option.value === value;
          return (
            <label
              key={String(option.value)}
              htmlFor={optionId}
              title={option.hint}
              className={`relative flex min-h-9 cursor-pointer items-center rounded-lg border px-3 text-[13px] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-text ${
                option.disabled
                  ? 'cursor-not-allowed border-line/60 bg-transparent text-fg-subtle/70'
                  : checked
                    ? 'border-accent/70 bg-accent/15 font-medium text-accent-text'
                    : 'border-line bg-raised text-fg-muted hover:border-line-strong hover:text-fg'
              }`}
            >
              <input
                id={optionId}
                type="radio"
                name={name}
                value={String(option.value)}
                checked={checked}
                disabled={option.disabled}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
              {option.hint && option.disabled ? <span className="ml-1.5 text-xs text-fg-subtle">({option.hint})</span> : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
