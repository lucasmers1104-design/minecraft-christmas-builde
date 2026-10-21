import type { ReactNode } from 'react';

export function Panel({
  title,
  description,
  actions,
  children,
  className = '',
  headingId,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  headingId?: string;
}) {
  return (
    <section
      aria-labelledby={headingId}
      className={`shrink-0 rounded-2xl border border-white/8 bg-night-850/80 shadow-[0_10px_40px_-20px_rgb(0_0_0/0.8)] backdrop-blur ${className}`}
    >
      <header className="flex items-start justify-between gap-3 border-b border-white/6 px-4 py-3">
        <div>
          <h2 id={headingId} className="text-sm font-semibold tracking-wide text-snow-50">
            {title}
          </h2>
          {description ? <p className="mt-0.5 text-xs text-mist-400">{description}</p> : null}
        </div>
        {actions}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
