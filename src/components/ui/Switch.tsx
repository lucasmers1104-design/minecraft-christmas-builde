import type { ReactNode } from 'react';

/**
 * On/off switch. The real checkbox is the visible track (appearance-none), so it stays
 * clickable, focusable and testable like a normal checkbox (`role="switch"`).
 */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  testId,
  id,
  className = '',
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  testId?: string;
  id?: string;
  className?: string;
}) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${className}`}>
      <span className="relative mt-0.5 inline-flex h-5 w-9 shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          data-testid={testId}
          className="peer h-5 w-9 cursor-pointer appearance-none rounded-full border border-line-strong bg-hover transition-colors checked:border-accent checked:bg-accent disabled:cursor-not-allowed disabled:opacity-45"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0.5 left-0.5 size-4 rounded-full bg-fg-muted shadow transition-transform peer-checked:translate-x-4 peer-checked:bg-white peer-disabled:opacity-60"
        />
      </span>
      <span className="min-w-0">
        <span className={`block text-sm ${disabled ? 'text-fg-subtle' : 'text-fg'}`}>{label}</span>
        {description ? <span className="mt-0.5 block text-xs leading-snug text-fg-subtle">{description}</span> : null}
      </span>
    </label>
  );
}
