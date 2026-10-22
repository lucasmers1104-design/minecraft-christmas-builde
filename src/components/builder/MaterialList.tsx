'use client';

import { useMemo, useState } from 'react';
import { countMaterials, formatStacks, STACK_SIZE } from '@/core/analysis/materialCounts';
import { BlockSwatch } from '@/components/preview/textures/BlockSwatch';
import type { VoxelModel } from '@/core/schema/voxelModel';
import { Panel } from '@/components/ui/Panel';
import { Segmented, type SegmentOption } from '@/components/ui/Segmented';

type MaterialView = 'items' | 'states' | 'blocks';

const VIEWS: readonly SegmentOption<MaterialView>[] = [
  { value: 'items', label: 'Gegenstände', hint: 'Was du im Überlebensmodus zum Bauen brauchst' },
  { value: 'states', label: 'Blockzustände', hint: 'Jeder Blockzustand, wie er in der Datei steht' },
  { value: 'blocks', label: 'Blocktypen', hint: 'Blockzustände nach Block zusammengefasst' },
];

const DESCRIPTIONS: Record<MaterialView, string> = {
  items:
    'Gegenstände zum Bauen, direkt aus den exportierten Blockdaten gezählt: eine Tür zählt einmal für beide Hälften, eine doppelte Stufe als zwei Stufen, Kerzen, Schneeschichten und Blüten einzeln, ein bepflanzter Topf als Topf plus Pflanze.',
  states: 'Jeder Blockzustand mit seiner Anzahl, direkt aus den exportierten Blockdaten gezählt (ohne Luft).',
  blocks: 'Blockzustände nach Blocktyp zusammengefasst (ohne Luft).',
};

interface Row {
  key: string;
  label: string;
  detail: string;
  count: number;
  stackSize: number;
  swatch: string;
}

export function MaterialList({ model }: { model: VoxelModel | null }) {
  const summary = useMemo(() => (model ? countMaterials(model) : null), [model]);
  const [view, setView] = useState<MaterialView>('items');

  const rows = useMemo<Row[]>(() => {
    if (!summary) return [];
    switch (view) {
      case 'items':
        return summary.items.map((i) => ({ key: i.item, label: i.label, detail: i.item, count: i.count, stackSize: i.stackSize, swatch: i.item }));
      case 'blocks':
        return summary.byBlock.map((b) => ({ key: b.blockId, label: b.label, detail: b.blockId, count: b.count, stackSize: STACK_SIZE, swatch: b.blockId }));
      case 'states':
        return summary.entries.map((e) => ({ key: e.state, label: e.label, detail: e.state, count: e.count, stackSize: STACK_SIZE, swatch: e.state }));
    }
  }, [summary, view]);

  return (
    <Panel title="Materialliste" headingId="materials-heading" description={DESCRIPTIONS[view]}>
      {!summary || !model ? (
        <p className="text-sm text-mist-400">Noch kein Bauwerk vorhanden.</p>
      ) : (
        <>
          <dl className="mb-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-white/4 px-3 py-2">
              <dt className="text-mist-400">Gesamt ohne Luft</dt>
              <dd className="text-lg font-semibold text-snow-50" data-testid="material-total" title="Blöcke im Modell (ohne Luft)">
                {summary.totalBlocks.toLocaleString('de-DE')}
              </dd>
            </div>
            <div className="rounded-lg bg-white/4 px-3 py-2">
              <dt className="text-mist-400">Gegenstände</dt>
              <dd className="text-lg font-semibold text-snow-50" data-testid="material-items-total" title="Benötigte Gegenstände (Überlebensmodus)">
                {summary.totalItems.toLocaleString('de-DE')}
              </dd>
            </div>
            <div className="col-span-2 flex items-baseline justify-between rounded-lg bg-white/4 px-3 py-1.5">
              <dt className="text-mist-400">Abmessungen (B×H×T)</dt>
              <dd className="font-semibold text-snow-50" data-testid="material-dimensions">
                {model.dimensions.width}×{model.dimensions.height}×{model.dimensions.length}
              </dd>
            </div>
          </dl>
          <div className="mb-2">
            <Segmented legend="Ansicht" name="material-view" options={VIEWS} value={view} onChange={setView} testId="material-view" />
          </div>
          <div className="max-h-80 overflow-auto rounded-lg border border-white/6">
            <table className="w-full table-fixed text-left text-xs" data-testid="material-table" data-view={view}>
              <caption className="sr-only">{view === 'items' ? 'Benötigte Gegenstände' : 'Blöcke im Modell'}</caption>
              <thead className="sticky top-0 bg-night-800 text-mist-400">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {view === 'items' ? 'Gegenstand' : 'Block'}
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
                {rows.map((row) => (
                  <tr key={row.key} className="border-t border-white/5" data-testid="material-row" data-count={row.count}>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <BlockSwatch block={row.swatch} className="size-4" />
                        <div className="min-w-0">
                          <div className="text-snow-50">{row.label}</div>
                          <div className="truncate font-mono text-[10px] text-mist-400" title={row.detail}>
                            {row.detail}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-snow-50">{row.count.toLocaleString('de-DE')}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-mist-300" title={`Stapelgröße ${row.stackSize}`}>
                      {formatStacks(row.count, row.stackSize)}
                    </td>
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
