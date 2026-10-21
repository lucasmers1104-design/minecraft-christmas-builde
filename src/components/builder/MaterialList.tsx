'use client';

import { useMemo, useState } from 'react';
import { countMaterials, formatStacks } from '@/core/analysis/materialCounts';
import { renderInfoFor } from '@/core/blocks/registry';
import type { VoxelModel } from '@/core/schema/voxelModel';
import { Panel } from '@/components/ui/Panel';

export function MaterialList({ model }: { model: VoxelModel | null }) {
  const summary = useMemo(() => (model ? countMaterials(model) : null), [model]);
  const [grouped, setGrouped] = useState(false);

  return (
    <Panel
      title="Materialliste"
      headingId="materials-heading"
      description="Direkt aus den exportierten Blockdaten gezählt (ohne Luft)."
      actions={
        summary ? (
          <label className="flex items-center gap-1.5 text-[11px] text-mist-400">
            <input
              type="checkbox"
              checked={grouped}
              onChange={(e) => setGrouped(e.target.checked)}
              className="accent-gold-400"
            />
            nach Blocktyp
          </label>
        ) : null
      }
    >
      {!summary || !model ? (
        <p className="text-sm text-mist-400">Noch kein Bauwerk vorhanden.</p>
      ) : (
        <>
          <dl className="mb-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-white/4 px-3 py-2">
              <dt className="text-mist-400">Gesamt ohne Luft</dt>
              <dd className="text-lg font-semibold text-snow-50" data-testid="material-total">
                {summary.totalBlocks.toLocaleString('de-DE')}
              </dd>
            </div>
            <div className="rounded-lg bg-white/4 px-3 py-2">
              <dt className="text-mist-400">Abmessungen (B×H×T)</dt>
              <dd className="text-lg font-semibold text-snow-50" data-testid="material-dimensions">
                {model.dimensions.width}×{model.dimensions.height}×{model.dimensions.length}
              </dd>
            </div>
          </dl>
          <div className="max-h-80 overflow-auto rounded-lg border border-white/6">
            <table className="w-full table-fixed text-left text-xs" data-testid="material-table">
              <caption className="sr-only">Benötigte Blöcke</caption>
              <thead className="sticky top-0 bg-night-800 text-mist-400">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Block
                  </th>
                  <th scope="col" className="w-16 px-2 py-2 text-right font-medium">
                    Anzahl
                  </th>
                  <th scope="col" className="w-24 px-3 py-2 text-right font-medium">
                    Stacks
                  </th>
                </tr>
              </thead>
              <tbody>
                {(grouped
                  ? summary.byBlock.map((b) => ({ key: b.blockId, label: b.label, detail: b.blockId, count: b.count, swatch: b.blockId }))
                  : summary.entries.map((e) => ({ key: e.state, label: e.label, detail: e.state, count: e.count, swatch: e.state }))
                ).map((row) => (
                  <tr key={row.key} className="border-t border-white/5" data-testid="material-row" data-count={row.count}>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="size-3 shrink-0 rounded-sm border border-white/20"
                          style={{ background: swatchColor(row.swatch) }}
                        />
                        <div className="min-w-0">
                          <div className="text-snow-50">{row.label}</div>
                          <div className="truncate font-mono text-[10px] text-mist-400" title={row.detail}>
                            {row.detail}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-snow-50">{row.count}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-mist-300">{formatStacks(row.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Panel>
  );
}

function swatchColor(stateOrId: string): string {
  try {
    return renderInfoFor(stateOrId).color;
  } catch {
    return 'transparent';
  }
}
