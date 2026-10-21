'use client';

import { useMemo, useState } from 'react';
import { countMaterials } from '@/core/analysis/materialCounts';
import { labelFor } from '@/core/blocks/registry';
import type { VoxelModel } from '@/core/schema/voxelModel';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { BlockPicker } from '@/components/editor/BlockPicker';

export type EditMode = 'view' | 'place' | 'remove' | 'paint' | 'pick';

export const EDIT_MODES: { id: EditMode; label: string; hint: string }[] = [
  { id: 'view', label: 'Ansehen', hint: 'Nur drehen und zoomen' },
  { id: 'place', label: 'Setzen', hint: 'Klick auf eine Blockfläche setzt den gewählten Block daneben' },
  { id: 'remove', label: 'Entfernen', hint: 'Klick entfernt den Block' },
  { id: 'paint', label: 'Ersetzen', hint: 'Klick ersetzt den Block durch den gewählten' },
  { id: 'pick', label: 'Pipette', hint: 'Klick übernimmt den Block als Auswahl' },
];

export function EditorPanel({
  model,
  brush,
  onBrushChange,
  onSetAt,
  onReplaceAll,
  editCount,
  message,
}: {
  model: VoxelModel | null;
  brush: string;
  onBrushChange: (state: string) => void;
  onSetAt: (cell: { x: number; y: number; z: number }, remove: boolean) => void;
  onReplaceAll: (from: string, to: string) => void;
  editCount: number;
  message: string | null;
}) {
  const [coords, setCoords] = useState({ x: 0, y: 0, z: 0 });
  const [replaceFrom, setReplaceFrom] = useState('');
  const materials = useMemo(() => (model ? countMaterials(model).entries : []), [model]);
  const fromState = materials.some((m) => m.state === replaceFrom) ? replaceFrom : (materials[0]?.state ?? '');
  const fromCount = materials.find((m) => m.state === fromState)?.count ?? 0;
  const d = model?.dimensions;

  return (
    <Panel
      title="Bearbeiten"
      headingId="editor-heading"
      description={
        model
          ? editCount > 0
            ? `${editCount} manuelle Änderung${editCount === 1 ? '' : 'en'} an dieser Variante`
            : 'Unverändert wie generiert'
          : 'Zuerst ein Bauwerk generieren.'
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-1 text-[11px] font-medium text-mist-300">
            Gewählter Block: <span className="text-snow-50" data-testid="brush-label">{labelFor(brush)}</span>
          </p>
          <p className="mb-2 truncate font-mono text-[10px] text-mist-400" data-testid="brush-state" title={brush}>
            {brush}
          </p>
          <BlockPicker value={brush} onChange={onBrushChange} />
        </div>

        <fieldset disabled={!model} className="flex min-w-0 flex-col gap-2">
          <legend className="mb-1 text-xs font-medium uppercase tracking-wider text-mist-400">Per Koordinate</legend>
          <div className="grid grid-cols-3 gap-2">
            {(['x', 'y', 'z'] as const).map((axis) => (
              <label key={axis} className="flex flex-col gap-1 text-[11px] text-mist-300">
                {axis.toUpperCase()} (0–{d ? (axis === 'x' ? d.width : axis === 'y' ? d.height : d.length) - 1 : 0})
                <input
                  type="number"
                  min={0}
                  data-testid={`coord-${axis}`}
                  value={coords[axis]}
                  onChange={(e) => setCoords((c) => ({ ...c, [axis]: Number.parseInt(e.target.value || '0', 10) }))}
                  className="w-full min-w-0 rounded-md border border-white/10 bg-night-950/70 px-2 py-1 text-sm text-snow-50"
                />
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" className="min-h-9 text-xs" onClick={() => onSetAt(coords, false)} data-testid="coord-set">
              Block setzen
            </Button>
            <Button variant="ghost" className="min-h-9 text-xs" onClick={() => onSetAt(coords, true)} data-testid="coord-remove">
              Block entfernen
            </Button>
          </div>
        </fieldset>

        <fieldset disabled={!model || materials.length === 0} className="flex min-w-0 flex-col gap-2">
          <legend className="mb-1 text-xs font-medium uppercase tracking-wider text-mist-400">Material austauschen</legend>
          <label className="flex flex-col gap-1 text-[11px] text-mist-300">
            Alle Blöcke vom Typ
            <select
              value={fromState}
              onChange={(e) => setReplaceFrom(e.target.value)}
              data-testid="replace-from"
              className="w-full min-w-0 rounded-md border border-white/10 bg-night-950/70 px-2 py-1 text-xs text-snow-50"
            >
              {materials.map((m) => (
                <option key={m.state} value={m.state}>
                  {m.label} ({m.count}) – {m.state.replace('minecraft:', '')}
                </option>
              ))}
            </select>
          </label>
          <Button
            variant="secondary"
            className="min-h-9 text-xs"
            disabled={!fromState || fromState === brush}
            onClick={() => onReplaceAll(fromState, brush)}
            data-testid="replace-all"
          >
            {fromCount} × durch „{labelFor(brush)}“ ersetzen
          </Button>
        </fieldset>

        {message ? (
          <p role="status" className="rounded-md border border-white/10 bg-white/4 px-2 py-1.5 text-[11px] text-mist-300" data-testid="editor-message">
            {message}
          </p>
        ) : null}
      </div>
    </Panel>
  );
}
