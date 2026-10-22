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
}: {
  legend: string;
  name: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  testId?: string;
  badge?: ReactNode;
}) {
  const id = useId();
  return (
    <fieldset className="min-w-0" disabled={disabled} data-testid={testId}>
      <legend className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-mist-400">
        {legend}
        {badge}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const optionId = `${id}-${String(option.value)}`;
          const checked = option.value === value;
          return (
            <label
              key={String(option.value)}
              htmlFor={optionId}
              title={option.hint}
              className={`relative flex min-h-9 cursor-pointer items-center rounded-lg border px-3 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold-300 ${
                option.disabled
                  ? 'cursor-not-allowed border-white/5 bg-transparent text-mist-400/60'
                  : checked
                    ? 'border-gold-400/70 bg-gold-400/12 text-gold-300'
                    : 'border-white/10 bg-white/3 text-mist-300 hover:border-white/20 hover:text-snow-50'
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
              {option.hint && option.disabled ? <span className="ml-1.5 text-[10px] uppercase tracking-wide">{option.hint}</span> : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
