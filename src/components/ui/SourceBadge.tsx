import type { SettingSource } from '@/core/schema/resolveSpec';

/** Shows where a setting comes from; manual settings can be reset to text/default. */
export function SourceBadge({ source, onReset, label }: { source: SettingSource; onReset?: () => void; label: string }) {
  if (source === 'standard') return null;
  if (source === 'ki') {
    return (
      <span className="rounded-full border border-fir-500/50 bg-fir-700/30 px-1.5 py-px text-[10px] font-medium normal-case tracking-normal text-fir-300">
        von KI
      </span>
    );
  }
  if (source === 'text') {
    return (
      <span className="rounded-full border border-ice-300/40 bg-ice-300/10 px-1.5 py-px text-[10px] font-medium normal-case tracking-normal text-ice-200">
        aus Text
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-gold-400/40 bg-gold-400/10 px-1.5 py-px text-[10px] font-medium normal-case tracking-normal text-gold-300">
      manuell
      {onReset ? (
        <button
          type="button"
          onClick={onReset}
          className="rounded-full px-0.5 leading-none text-gold-300 hover:text-snow-50"
          aria-label={`${label}: manuelle Einstellung zurücksetzen`}
          title="Zurücksetzen (Text bzw. Standard gilt wieder)"
        >
          ×
        </button>
      ) : null}
    </span>
  );
}
