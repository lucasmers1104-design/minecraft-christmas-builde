'use client';

import { useId, useMemo, useState } from 'react';
import { countMaterials, formatStacks, STACK_SIZE } from '@/core/analysis/materialCounts';
import { BlockSwatch } from '@/components/preview/textures/BlockSwatch';
import type { VoxelModel } from '@/core/schema/voxelModel';
import { inputClass } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Panel } from '@/components/ui/Panel';
import { Segmented, type SegmentOption } from '@/components/ui/Segmented';

type MaterialView = 'items' | 'blocks' | 'states';

const VIEWS: readonly SegmentOption<MaterialView>[] = [
  { value: 'items', label: 'Gegenstände', hint: 'Was du im Überlebensmodus zum Bauen brauchst' },
  { value: 'blocks', label: 'Blocktypen', hint: 'Blöcke im Modell, nach Blocktyp zusammengefasst' },
  { value: 'states', label: 'Blockzustände', hint: 'Jeder Blockzustand, wie er in der Datei steht' },
];

const VIEW_NOTES: Record<MaterialView, string> = {
  items:
    'Gezählt wie im Spiel: Eine Tür zählt einmal für beide Hälften, eine doppelte Stufe als zwei Stufen, Kerzen, Schneeschichten und Blüten einzeln, ein bepflanzter Topf als Topf plus Pflanze.',
  blocks: 'Blöcke im Modell (ohne Luft), nach Blocktyp zusammengefasst, egal wie sie ausgerichtet sind.',
  states: 'Jeder Blockzustand (Block mit Eigenschaften wie Ausrichtung) mit seiner Anzahl, so wie er in der .schem-Datei steht.',
};

/** Slots of a shulker box (= a single chest). */
const SHULKER_SLOTS = 27;

/** Show the filter field from this many rows on. */
const FILTER_FROM = 10;

interface Row {
  key: string;
  label: string;
  detail: string;
  count: number;
  stackSize: number;
  swatch: string;
  haystack: string;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/_/g, ' ');
}

function row(key: string, label: string, detail: string, count: number, stackSize: number): Row {
  return { key, label, detail, count, stackSize, swatch: detail, haystack: `${normalize(label)} ${normalize(detail)} ${detail}` };
}

function de(n: number): string {
  return n.toLocaleString('de-DE');
}

/**
 * Material list straight from the canonical model (the same data the export writes): totals,
 * inventory space and a table per item, block type or block state.
 */
export function MaterialList({ model }: { model: VoxelModel | null }) {
  const baseId = useId();
  const summary = useMemo(() => (model ? countMaterials(model) : null), [model]);
  const [view, setView] = useState<MaterialView>('items');
  const [filter, setFilter] = useState('');

  const rows = useMemo<Row[]>(() => {
    if (!summary) return [];
    switch (view) {
      case 'items':
        return summary.items.map((i) => row(i.item, i.label, i.item, i.count, i.stackSize));
      case 'blocks':
        return summary.byBlock.map((b) => row(b.blockId, b.label, b.blockId, b.count, STACK_SIZE));
      case 'states':
        return summary.entries.map((e) => row(e.state, e.label, e.state, e.count, STACK_SIZE));
    }
  }, [summary, view]);

  // Inventory space for the items: every item type fills its own stacks.
  const slots = useMemo(() => (summary ? summary.items.reduce((n, i) => n + Math.ceil(i.count / i.stackSize), 0) : 0), [summary]);
  const shulkers = Math.ceil(slots / SHULKER_SLOTS);

  const words = normalize(filter).split(/\s+/).filter(Boolean);
  const shown = words.length > 0 ? rows.filter((r) => words.every((w) => r.haystack.includes(w))) : rows;

  if (!summary || !model) {
    return (
      <Panel title="Materialliste" headingId="materials-heading">
        <div className="flex items-start gap-3 text-[13px] leading-snug text-fg-muted">
          <Icon name="layers" className="mt-0.5 size-5 text-fg-subtle" />
          <p>Noch kein Bauwerk. Nach dem Generieren steht hier, welche Blöcke und wie viele du zum Nachbauen brauchst.</p>
        </div>
      </Panel>
    );
  }

  const { width, height, length } = model.dimensions;

  return (
    <Panel title="Materialliste" headingId="materials-heading" description="Gezählt aus denselben Blockdaten, die auch exportiert werden.">
      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-line bg-raised px-3 py-2">
            <dt className="text-xs text-fg-muted">Blöcke</dt>
            <dd className="text-lg leading-7 font-semibold text-fg tabular-nums" data-testid="material-total" title="Blöcke im Modell (ohne Luft)">
              {de(summary.totalBlocks)}
            </dd>
            <dd className="text-xs text-fg-subtle">ohne Luft</dd>
          </div>
          <div className="rounded-lg border border-line bg-raised px-3 py-2">
            <dt className="text-xs text-fg-muted">Gegenstände</dt>
            <dd className="text-lg leading-7 font-semibold text-fg tabular-nums" data-testid="material-items-total" title="Benötigte Gegenstände (Überlebensmodus)">
              {de(summary.totalItems)}
            </dd>
            <dd className="text-xs text-fg-subtle">zum Bauen</dd>
          </div>
          <div className="rounded-lg border border-line bg-raised px-3 py-2">
            <dt className="text-xs text-fg-muted">Stacks</dt>
            <dd className="text-lg leading-7 font-semibold text-fg tabular-nums" data-testid="material-stacks" title="Inventarplätze: jeder Gegenstand in eigenen Stapeln">
              {de(slots)}
            </dd>
            <dd className="text-xs text-fg-subtle">
              ≈ {de(shulkers)} Shulker-{shulkers === 1 ? 'Kiste' : 'Kisten'}
            </dd>
          </div>
          <div className="rounded-lg border border-line bg-raised px-3 py-2">
            <dt className="text-xs text-fg-muted">Maße</dt>
            <dd className="text-lg leading-7 font-semibold whitespace-nowrap text-fg tabular-nums" data-testid="material-dimensions">
              {width} × {height} × {length}
            </dd>
            <dd className="text-xs text-fg-subtle">Breite × Höhe × Tiefe</dd>
          </div>
        </dl>

        <Segmented
          legend="Ansicht"
          name="material-view"
          options={VIEWS}
          value={view}
          onChange={(v) => {
            setView(v);
            setFilter('');
          }}
          testId="material-view"
        />

        {rows.length >= FILTER_FROM ? (
          <div className="relative">
            <label htmlFor={`${baseId}-filter`} className="sr-only">
              Materialliste filtern
            </label>
            <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
            <input
              id={`${baseId}-filter`}
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={`${de(rows.length)} Einträge filtern, z. B. Fichte`}
              data-testid="material-filter"
              className={`${inputClass} h-9 pr-3 pl-9`}
            />
          </div>
        ) : null}

        <div className="max-h-[26rem] overflow-auto rounded-lg border border-line">
          <table className="w-full table-fixed border-collapse text-left text-[13px]" data-testid="material-table" data-view={view}>
            <caption className="sr-only">{view === 'items' ? 'Benötigte Gegenstände' : 'Blöcke im Modell'}</caption>
            <thead className="sticky top-0 z-10 bg-raised text-xs text-fg-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  {view === 'items' ? 'Gegenstand' : view === 'blocks' ? 'Blocktyp' : 'Blockzustand'}
                </th>
                <th scope="col" className="w-[6.5rem] px-3 py-2 text-right font-medium">
                  Anzahl <span className="font-normal text-fg-subtle">· Stacks</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.key} className="border-t border-line align-top hover:bg-hover/50" data-testid="material-row" data-count={r.count}>
                  <td className="py-2 pr-2 pl-3">
                    <div className="flex items-start gap-2.5">
                      <BlockSwatch block={r.swatch} className="mt-0.5 size-5" />
                      <div className="min-w-0">
                        <div className="leading-snug text-fg">{r.label}</div>
                        <div className="truncate font-mono text-xs leading-5 text-fg-subtle" title={r.detail}>
                          {r.detail}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    <div className="leading-snug font-medium text-fg">{de(r.count)}</div>
                    {r.count >= r.stackSize ? (
                      <div className="text-xs leading-5 whitespace-nowrap text-fg-subtle" title={`Stapel zu je ${r.stackSize}`}>
                        {formatStacks(r.count, r.stackSize)}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-3 py-4 text-center text-[13px] text-fg-muted">
                    Nichts gefunden für „{filter.trim()}“.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <p className="-mt-1 flex gap-1.5 text-xs leading-snug text-fg-subtle">
          <Icon name="info" className="mt-px size-3.5" />
          <span>
            {words.length > 0 ? `${de(shown.length)} von ${de(rows.length)} Einträgen. ` : null}
            {VIEW_NOTES[view]}
            {view === 'items' ? ` Shulker-Kisten: je ${SHULKER_SLOTS} Stacks.` : null}
          </span>
        </p>
      </div>
    </Panel>
  );
}
