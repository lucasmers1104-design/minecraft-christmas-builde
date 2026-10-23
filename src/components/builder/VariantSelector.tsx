'use client';

import { useMemo, type KeyboardEvent } from 'react';
import { AIR } from '@/core/blocks/registry';
import type { VoxelModel } from '@/core/schema/voxelModel';
import { Badge } from '@/components/ui/Badge';

const TOTALS = new WeakMap<VoxelModel, number>();

/** Non-air blocks of a model (cached per model; large models have millions of cells). */
function nonAirBlocks(model: VoxelModel): number {
  let total = TOTALS.get(model);
  if (total === undefined) {
    const air = model.palette.indexOf(AIR);
    total = 0;
    for (const index of model.indices) if (index !== air) total++;
    TOTALS.set(model, total);
  }
  return total;
}

/**
 * Horizontal strip of variant cards, meant to sit directly under the 3D preview. Renders nothing
 * until a building was generated (the preview's empty state explains the steps).
 */
export function VariantSelector({
  variants,
  selected,
  onSelect,
  edits = [],
}: {
  variants: VoxelModel[];
  selected: number;
  onSelect: (index: number) => void;
  edits?: number[];
}) {
  const totals = useMemo(() => variants.map(nonAirBlocks), [variants]);
  if (variants.length === 0) return null;

  // Radio-group keyboard pattern: arrow keys move the selection, only the checked card is tabbable.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (step === 0) return;
    e.preventDefault();
    const next = (selected + step + variants.length) % variants.length;
    onSelect(next);
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-testid="variant-${next}"]`)?.focus();
  };

  return (
    <section aria-labelledby="variants-heading" className="shrink-0 rounded-xl border border-line bg-surface px-3 pt-2.5 pb-3 shadow-(--shadow-panel)">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-0.5">
        <h2 id="variants-heading" className="text-sm font-semibold text-fg">
          Varianten
        </h2>
        <p className="text-xs text-fg-subtle">Gleiche Beschreibung, jeweils ein anderer Startwert (Seed)</p>
      </div>
      <div role="radiogroup" aria-labelledby="variants-heading" onKeyDown={onKeyDown} className="grid grid-cols-3 gap-2">
        {variants.map((model, index) => {
          const active = index === selected;
          const total = totals[index] ?? 0;
          const editCount = edits[index] ?? 0;
          return (
            <button
              key={model.hash}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              data-testid={`variant-${index}`}
              data-hash={model.hash}
              onClick={() => onSelect(index)}
              className={`flex min-w-0 flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left transition-colors ${
                active ? 'border-accent/80 bg-accent/10 ring-1 ring-accent/40' : 'border-line bg-raised hover:border-line-strong hover:bg-hover'
              }`}
            >
              <span className={`text-sm font-medium ${active ? 'text-accent-text' : 'text-fg'}`}>Variante {index + 1}</span>
              <span className="flex flex-wrap gap-x-3 text-xs text-fg-muted">
                <span>Seed {model.spec.seed}</span>
                <span className="tabular-nums">{total.toLocaleString('de-DE')} Blöcke</span>
              </span>
              {editCount > 0 ? (
                <Badge tone="gold" data-testid={`variant-${index}-edited`}>
                  bearbeitet ({editCount})
                </Badge>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
