import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';

/** Link to an outside page (new tab, no referrer) with a small "external" icon. */
export function ExternalLink({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-1 rounded-sm font-medium text-accent-text underline-offset-2 hover:underline ${className}`}
    >
      {children}
      <Icon name="external" className="size-3.5" />
      <span className="sr-only"> (öffnet in neuem Tab)</span>
    </a>
  );
}
