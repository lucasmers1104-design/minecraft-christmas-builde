import type { SettingSource } from '@/core/schema/resolveSpec';
import { Badge } from '@/components/ui/Badge';

/** Shows where a setting comes from; manual settings can be reset to text/default. */
export function SourceBadge({ source, onReset, label }: { source: SettingSource; onReset?: () => void; label: string }) {
  if (source === 'standard') return null;
  if (source === 'ki') return <Badge tone="accent">von KI</Badge>;
  if (source === 'text') return <Badge tone="info">aus Text</Badge>;
  return (
    <Badge tone="gold">
      manuell
      {onReset ? (
        <button
          type="button"
          onClick={onReset}
          className="-mr-0.5 ml-0.5 rounded-sm px-0.5 leading-none hover:bg-gold/20 hover:text-fg"
          aria-label={`${label}: manuelle Einstellung zurücksetzen`}
          title="Zurücksetzen (Text bzw. Standard gilt wieder)"
        >
          ×
        </button>
      ) : null}
    </Badge>
  );
}
