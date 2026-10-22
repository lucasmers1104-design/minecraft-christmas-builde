'use client';

import { useMemo } from 'react';
import { AIR } from '@/core/blocks/registry';
import type { VoxelModel } from '@/core/schema/voxelModel';
import { Panel } from '@/components/ui/Panel';

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
  return (
    <Panel title="Varianten" headingId="variants-heading" description="Jede Variante ist ein eigenes, echtes Blockvolumen.">
      {variants.length === 0 ? (
        <p className="text-sm text-mist-400">Noch keine Varianten – zuerst ein Bauwerk generieren.</p>
      ) : (
        <div role="radiogroup" aria-labelledby="variants-heading" className="grid grid-cols-3 gap-2">
          {variants.map((model, index) => {
            const active = index === selected;
            const total = totals[index] ?? 0;
            return (
              <button
                key={model.hash}
                type="button"
                role="radio"
                aria-checked={active}
                data-testid={`variant-${index}`}
                data-hash={model.hash}
                onClick={() => onSelect(index)}
                className={`rounded-xl border px-2 py-2.5 text-left transition-colors ${
                  active
                    ? 'border-gold-400/70 bg-gold-400/10'
                    : 'border-white/8 bg-white/3 hover:border-white/20'
                }`}
              >
                <span className={`block text-sm font-semibold ${active ? 'text-gold-300' : 'text-snow-50'}`}>
                  Variante {index + 1}
                </span>
                <span className="block text-[11px] text-mist-400">Seed {model.spec.seed}</span>
                <span className="block text-[11px] text-mist-400">{total.toLocaleString('de-DE')} Blöcke</span>
                <span className="mt-1 block font-mono text-[10px] text-mist-400/80">{model.hash.slice(0, 8)}</span>
                {(edits[index] ?? 0) > 0 ? (
                  <span className="mt-0.5 block text-[10px] text-gold-300" data-testid={`variant-${index}-edited`}>
                    bearbeitet ({edits[index]})
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
