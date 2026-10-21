import { AIR, blockIdOf, labelFor } from '@/core/blocks/registry';
import type { VoxelModel } from '@/core/schema/voxelModel';

export interface MaterialEntry {
  /** Full block state as stored in the palette. */
  state: string;
  blockId: string;
  label: string;
  count: number;
  stacks: number;
  remainder: number;
}

export interface MaterialSummary {
  /** Per block state, sorted by count (desc), then state. Air is excluded. */
  entries: MaterialEntry[];
  /** Same counts grouped by block id (ignoring properties such as axis). */
  byBlock: { blockId: string; label: string; count: number }[];
  totalBlocks: number;
  airBlocks: number;
  volume: number;
}

export const STACK_SIZE = 64;

/** Counts directly from VoxelModel.indices – the same data the exporter writes. */
export function countMaterials(model: Pick<VoxelModel, 'palette' | 'indices'>): MaterialSummary {
  const counts = new Uint32Array(model.palette.length);
  for (const index of model.indices) counts[index]!++;

  const entries: MaterialEntry[] = [];
  let airBlocks = 0;
  model.palette.forEach((state, i) => {
    const count = counts[i]!;
    if (state === AIR) {
      airBlocks += count;
      return;
    }
    if (count === 0) return;
    entries.push({
      state,
      blockId: blockIdOf(state),
      label: labelFor(state),
      count,
      stacks: Math.floor(count / STACK_SIZE),
      remainder: count % STACK_SIZE,
    });
  });
  entries.sort((a, b) => b.count - a.count || a.state.localeCompare(b.state));

  const grouped = new Map<string, { blockId: string; label: string; count: number }>();
  for (const e of entries) {
    const g = grouped.get(e.blockId) ?? { blockId: e.blockId, label: e.label, count: 0 };
    g.count += e.count;
    grouped.set(e.blockId, g);
  }
  const byBlock = [...grouped.values()].sort((a, b) => b.count - a.count || a.blockId.localeCompare(b.blockId));

  const totalBlocks = entries.reduce((sum, e) => sum + e.count, 0);
  return { entries, byBlock, totalBlocks, airBlocks, volume: model.indices.length };
}

export function formatStacks(count: number): string {
  const stacks = Math.floor(count / STACK_SIZE);
  const rest = count % STACK_SIZE;
  if (stacks === 0) return `${rest}`;
  return rest === 0 ? `${stacks} × 64` : `${stacks} × 64 + ${rest}`;
}
