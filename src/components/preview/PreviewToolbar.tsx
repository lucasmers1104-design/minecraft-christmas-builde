'use client';

import type { KeyboardEvent, ReactNode } from 'react';
import { EDIT_MODES, type EditMode } from '@/components/editor/EditorPanel';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Switch } from '@/components/ui/Switch';

const MODE_ICONS: Partial<Record<EditMode, IconName>> = {
  view: 'eye',
  place: 'plus',
  remove: 'trash',
  paint: 'brush',
  pick: 'pipette',
};

/** What a click in the scene does in each edit mode (falls back to the hint of EDIT_MODES). */
const MODE_HELP: Partial<Record<EditMode, string>> = {
  place: 'Klick auf eine Fläche setzt den gewählten Block daneben – ausgerichtet wie im Spiel.',
  remove: 'Klick auf einen Block entfernt ihn.',
  paint: 'Klick auf einen Block ersetzt ihn durch den gewählten Block.',
  pick: 'Klick auf einen Block übernimmt ihn als gewählten Block.',
};

/** One line under the edit toolbar: the active mode and what a click in the scene does now. */
export function ModeHint({ mode }: { mode: EditMode }) {
  const entry = EDIT_MODES.find((m) => m.id === mode);
  const editing = mode !== 'view';
  return (
    <p className="flex items-start gap-1.5 text-[13px] leading-snug text-fg-muted" aria-live="polite" data-testid="mode-hint">
      <Icon name="info" className={`mt-0.5 size-3.5 ${editing ? 'text-accent-text' : 'text-fg-subtle'}`} />
      <span>
        <span className="font-medium text-fg">{entry?.label ?? mode}:</span>{' '}
        {editing ? (
          (MODE_HELP[mode] ?? entry?.hint)
        ) : (
          <>
            <span className="pointer-coarse:hidden">Ziehen dreht, Mausrad zoomt, Rechtsklick verschiebt.</span>
            <span className="hidden pointer-coarse:inline">Ein Finger dreht, zwei Finger zoomen und verschieben.</span> Zum Ändern ein
            Werkzeug wählen.
          </>
        )}
      </span>
    </p>
  );
}

/** Magnifier with plus/minus (the shared icon set has no zoom icons yet). */
function ZoomIcon({ direction }: { direction: 1 | -1 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="size-5 shrink-0"
    >
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-4.6-4.6M7.75 10.5h5.5" />
      {direction > 0 ? <path d="M10.5 7.75v5.5" /> : null}
    </svg>
  );
}

const iconButton =
  'inline-flex size-8 shrink-0 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-hover hover:text-fg disabled:cursor-not-allowed disabled:text-fg-subtle/60 disabled:hover:bg-transparent';

function ToolButton({
  label,
  icon,
  onClick,
  disabled,
  pressed,
  testId,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={`${iconButton} ${pressed ? 'bg-accent/15 text-accent-text hover:bg-accent/20 hover:text-accent-text' : ''}`}
    >
      {icon}
    </button>
  );
}

function Divider({ vertical = false }: { vertical?: boolean }) {
  return <span aria-hidden="true" className={vertical ? 'mx-1 h-5 w-px shrink-0 bg-line' : 'mx-1 my-0.5 h-px bg-line'} />;
}

/**
 * Camera controls ("Ansicht"): a small floating column over the 3D view, like map controls.
 * Mouse and touch users rarely need it; keyboard users can do everything from here.
 * No backdrop blur on overlays above the canvas: it would be recomputed on every WebGL frame.
 */
export function PreviewToolbar({
  onReset,
  showGrid,
  onToggleGrid,
  onRotate,
  onZoom,
  disabled,
  className = '',
}: {
  onReset: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  onRotate: (direction: 1 | -1) => void;
  onZoom: (direction: 1 | -1) => void;
  disabled: boolean;
  className?: string;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Ansicht"
      aria-orientation="vertical"
      className={`flex flex-col rounded-xl border border-line bg-surface/95 p-1 shadow-(--shadow-panel) ${className}`}
    >
      <ToolButton label="Ansicht zurücksetzen" icon={<Icon name="target" className="size-5" />} onClick={onReset} disabled={disabled} testId="reset-view" />
      <Divider />
      <ToolButton
        label="Nach links drehen"
        icon={<Icon name="rotate-left" className="size-5" />}
        onClick={() => onRotate(-1)}
        disabled={disabled}
        testId="rotate-left"
      />
      <ToolButton
        label="Nach rechts drehen"
        icon={<Icon name="rotate-right" className="size-5" />}
        onClick={() => onRotate(1)}
        disabled={disabled}
        testId="rotate-right"
      />
      <Divider />
      <ToolButton label="Hineinzoomen" icon={<ZoomIcon direction={1} />} onClick={() => onZoom(1)} disabled={disabled} testId="zoom-in" />
      <ToolButton label="Herauszoomen" icon={<ZoomIcon direction={-1} />} onClick={() => onZoom(-1)} disabled={disabled} testId="zoom-out" />
      <Divider />
      <ToolButton
        label={showGrid ? 'Bodenraster ausblenden' : 'Bodenraster einblenden'}
        icon={<Icon name="grid" className="size-5" />}
        onClick={onToggleGrid}
        pressed={showGrid}
        disabled={disabled}
        testId="grid-toggle"
      />
    </div>
  );
}

/**
 * Edit tools ("Bearbeiten"): the click mode as a segmented radio group plus undo/redo.
 * In a narrow container only the active mode shows its label (the others keep icon, tooltip
 * and screen-reader text); from 36rem on every label is visible. Needs an `@container` parent.
 */
export function EditToolbar({
  mode,
  onModeChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  disabled,
}: {
  mode: EditMode;
  onModeChange: (mode: EditMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  disabled: boolean;
}) {
  // Radio-group keyboard pattern: arrow keys move the selection, only the checked item is tabbable.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (step === 0) return;
    e.preventDefault();
    const current = Math.max(0, EDIT_MODES.findIndex((m) => m.id === mode));
    const next = EDIT_MODES[(current + step + EDIT_MODES.length) % EDIT_MODES.length];
    if (!next) return;
    onModeChange(next.id);
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-testid="mode-${next.id}"]`)?.focus();
  };

  return (
    <div role="toolbar" aria-label="Bearbeiten" className="flex flex-wrap items-center gap-2">
      <div
        role="radiogroup"
        aria-label="Werkzeug für Klicks in der 3D-Ansicht"
        onKeyDown={onKeyDown}
        className="flex items-center gap-0.5 rounded-lg border border-line bg-canvas/70 p-0.5"
      >
        {EDIT_MODES.map((m) => {
          const active = mode === m.id;
          const icon = MODE_ICONS[m.id];
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              title={m.hint}
              disabled={disabled}
              onClick={() => onModeChange(m.id)}
              data-testid={`mode-${m.id}`}
              className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                active ? 'bg-accent/18 text-accent-text ring-1 ring-accent/55 ring-inset' : 'text-fg-muted hover:bg-hover hover:text-fg'
              }`}
            >
              {icon ? <Icon name={icon} className="size-4" /> : null}
              <span className={active || !icon ? '' : 'sr-only @xl:not-sr-only'}>{m.label}</span>
            </button>
          );
        })}
      </div>
      <Divider vertical />
      <div className="flex items-center gap-0.5">
        <ToolButton
          label="Rückgängig (Strg+Z)"
          icon={<Icon name="undo" className="size-5" />}
          onClick={onUndo}
          disabled={disabled || !canUndo}
          testId="undo"
        />
        <ToolButton
          label="Wiederholen (Strg+Y)"
          icon={<Icon name="redo" className="size-5" />}
          onClick={onRedo}
          disabled={disabled || !canRedo}
          testId="redo"
        />
      </div>
    </div>
  );
}

/**
 * Layer view ("Ebenen"): hides everything above a height so the inside becomes visible.
 * Floats at the bottom left of the 3D view.
 */
export function LayerControl({
  layerY,
  maxLayer,
  onLayerChange,
  disabled,
  className = '',
}: {
  layerY: number | null;
  maxLayer: number;
  onLayerChange: (layer: number | null) => void;
  disabled: boolean;
  className?: string;
}) {
  const on = layerY !== null;
  return (
    <div
      role="group"
      aria-label="Ebenen"
      title="Blendet alles oberhalb einer Höhe aus – so siehst du ins Innere."
      className={`flex min-h-10 flex-wrap items-center gap-x-3 rounded-xl border border-line bg-surface/95 px-3 shadow-(--shadow-panel) ${className}`}
    >
      <Switch
        checked={on}
        onChange={(checked) => onLayerChange(checked ? maxLayer : null)}
        label="Ebenen"
        disabled={disabled}
        testId="layer-toggle"
        className="py-1.5"
      />
      {on ? (
        <input
          type="range"
          min={0}
          max={maxLayer}
          value={layerY}
          disabled={disabled}
          onChange={(e) => onLayerChange(Number(e.target.value))}
          aria-label="Sichtbare Ebenen bis Y"
          data-testid="layer-slider"
          className="h-8 w-28 cursor-pointer accent-accent disabled:cursor-not-allowed"
        />
      ) : null}
      <span className={`text-[13px] tabular-nums ${on ? 'text-fg' : 'text-fg-subtle'}`} data-testid="layer-value">
        {on ? `bis Y=${layerY}` : 'alle'}
      </span>
    </div>
  );
}
