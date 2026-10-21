'use client';

export function PreviewToolbar({
  onReset,
  showGrid,
  onToggleGrid,
  disabled,
}: {
  onReset: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  disabled: boolean;
}) {
  const base =
    'inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-night-900/80 px-3 text-xs font-medium text-mist-300 backdrop-blur transition-colors hover:text-snow-50 disabled:cursor-not-allowed disabled:opacity-50';
  return (
    <div role="toolbar" aria-label="Kamera" className="flex flex-wrap gap-2">
      <button type="button" className={base} onClick={onReset} disabled={disabled} data-testid="reset-view">
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9" />
          <path d="M2.5 2.5v2.8h2.8" />
        </svg>
        Ansicht zurücksetzen
      </button>
      <button type="button" className={base} onClick={onToggleGrid} aria-pressed={showGrid} disabled={disabled}>
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M2 5.5h12M2 10.5h12M5.5 2v12M10.5 2v12" />
        </svg>
        Raster {showGrid ? 'aus' : 'an'}
      </button>
    </div>
  );
}
