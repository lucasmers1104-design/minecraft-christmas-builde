import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Icon } from '@/components/ui/Icon';

/** Shared look of text inputs, selects and text areas. */
export const inputClass =
  'block w-full rounded-lg border border-line bg-raised text-sm text-fg placeholder:text-fg-subtle transition-colors hover:border-line-strong focus:border-accent focus:ring-2 focus:ring-accent/25 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger/70';

/** Label + control + hint/error. The label is linked through `htmlFor`. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  badge,
  children,
  className = '',
}: {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={htmlFor} className="mb-1.5 flex items-center gap-2 text-[13px] font-medium text-fg-muted">
        {label}
        {badge}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-danger-text" role="alert">
          <Icon name="alert" className="mt-px size-3.5" />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs leading-snug text-fg-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputClass} h-10 px-3 ${className}`} {...rest} />;
}

export function TextArea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputClass} px-3 py-2.5 leading-relaxed ${className}`} {...rest} />;
}

export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={`${inputClass} h-10 appearance-none pr-9 pl-3 ${className}`} {...rest}>
        {children}
      </select>
      <Icon name="chevron-down" className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg-subtle" />
    </div>
  );
}
