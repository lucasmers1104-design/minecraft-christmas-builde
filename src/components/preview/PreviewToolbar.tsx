'use client';

import { EDIT_MODES, type EditMode } from '@/components/editor/EditorPanel';

const base =
  'inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-night-900/80 px-2.5 text-xs font-medium text-mist-300 backdrop-blur transition-colors hover:text-snow-50 disabled:cursor-not-allowed disabled:opacity-50';

export function PreviewToolbar({
  onReset,
  showGrid,
  onToggleGrid,
  onRotate,
  onZoom,
  disabled,
}: {
  onReset: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  onRotate: (direction: 1 | -1) => void;
  onZoom: (direction: 1 | -1) => void;
  disabled: boolean;
}) {
  return (
    <div role="toolbar" aria-label="Kamera" className="flex flex-wrap gap-1.5">
      <button type="button" className={base} onClick={onReset} disabled={disabled} data-testid="reset-view">
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9" />
          <path d="M2.5 2.5v2.8h2.8" />
        </svg>
        Ansicht zurücksetzen
      </button>
      <button type="button" className={base} onClick={() => onRotate(-1)} disabled={disabled} aria-label="Nach links drehen" data-testid="rotate-left">
        ⟲
      </button>
      <button type="button" className={base} onClick={() => onRotate(1)} disabled={disabled} aria-label="Nach rechts drehen" data-testid="rotate-right">
        ⟳
      </button>
      <button type="button" className={base} onClick={() => onZoom(1)} disabled={disabled} aria-label="Hineinzoomen" data-testid="zoom-in">
        +
      </button>
      <button type="button" className={base} onClick={() => onZoom(-1)} disabled={disabled} aria-label="Herauszoomen" data-testid="zoom-out">
        −
      </button>
      <button type="button" className={base} onClick={onToggleGrid} aria-pressed={showGrid} disabled={disabled}>
        Raster {showGrid ? 'aus' : 'an'}
      </button>
    </div>
  );
}

export function EditToolbar({
  mode,
  onModeChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  layerY,
  maxLayer,
  onLayerChange,
  disabled,
}: {
  mode: EditMode;
  onModeChange: (mode: EditMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  layerY: number | null;
  maxLayer: number;
  onLayerChange: (layer: number | null) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Bearbeiten">
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Werkzeug">
        {EDIT_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={mode === m.id}
            title={m.hint}
            disabled={disabled}
            onClick={() => onModeChange(m.id)}
            data-testid={`mode-${m.id}`}
            className={`${base} ${mode === m.id ? 'border-gold-400/70 bg-gold-400/15 text-gold-300' : ''}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <button type="button" className={base} onClick={onUndo} disabled={disabled || !canUndo} data-testid="undo" title="Rückgängig (Strg+Z)">
        ↶ Rückgängig
      </button>
      <button type="button" className={base} onClick={onRedo} disabled={disabled || !canRedo} data-testid="redo" title="Wiederholen (Strg+Y)">
        ↷ Wiederholen
      </button>
      <label className={`${base} gap-2`}>
        <input
          type="checkbox"
          checked={layerY !== null}
          disabled={disabled}
          onChange={(e) => onLayerChange(e.target.checked ? maxLayer : null)}
          data-testid="layer-toggle"
          className="accent-gold-400"
        />
        Ebenen
        <input
          type="range"
          min={0}
          max={maxLayer}
          value={layerY ?? maxLayer}
          disabled={disabled || layerY === null}
          onChange={(e) => onLayerChange(Number(e.target.value))}
          aria-label="Sichtbare Ebenen bis Y"
          data-testid="layer-slider"
          className="w-24 accent-gold-400"
        />
        <span className="tabular-nums" data-testid="layer-value">
          {layerY === null ? 'alle' : `bis Y=${layerY}`}
        </span>
      </label>
    </div>
  );
}
