import { AIR, blockIdOf, definitionOf, labelFor, propsOf } from '@/core/blocks/registry';
import type { VoxelModel } from '@/core/schema/voxelModel';

/**
 * Material list straight from VoxelModel.indices – the same data the exporter writes.
 *
 * Two views: block cells per state (what the file contains) and items (what a player needs
 * to build it). Items follow the game's counting: a door is one item for its two halves, a
 * double slab is two slabs, a candle block with n candles is n candles, a snow layer block is
 * `layers` snow items, and a potted plant is a flower pot plus the plant.
 */

export interface MaterialEntry {
  /** Full block state as stored in the palette. */
  state: string;
  blockId: string;
  label: string;
  count: number;
  stacks: number;
  remainder: number;
}

export interface ItemEntry {
  item: string;
  label: string;
  count: number;
  stackSize: number;
}

export interface MaterialSummary {
  /** Per block state, sorted by count (desc), then state. Air is excluded. */
  entries: MaterialEntry[];
  /** Same counts grouped by block id (ignoring properties such as axis). */
  byBlock: { blockId: string; label: string; count: number }[];
  /** Items needed to build it in survival, sorted by count (desc). */
  items: ItemEntry[];
  totalBlocks: number;
  totalItems: number;
  airBlocks: number;
  volume: number;
}

export const STACK_SIZE = 64;

/** Items whose stack size differs from 64 (checked against minecraft-data in tests). */
const STACK_SIZES: Readonly<Record<string, number>> = {};

export function stackSizeOf(item: string): number {
  return STACK_SIZES[item] ?? STACK_SIZE;
}

const POTTED_PLANT_ITEM: Readonly<Record<string, string>> = {
  'minecraft:potted_azalea_bush': 'minecraft:azalea',
  'minecraft:potted_flowering_azalea_bush': 'minecraft:flowering_azalea',
};

/** Items (with counts) represented by one block of this state. */
export function itemsForState(state: string): { item: string; count: number }[] {
  if (state === AIR) return [];
  const id = blockIdOf(state);
  const props = propsOf(state);
  switch (definitionOf(state).shape) {
    case 'door':
      return props.half === 'upper' ? [] : [{ item: id, count: 1 }];
    case 'slab':
      return [{ item: id, count: props.type === 'double' ? 2 : 1 }];
    case 'candle':
      return [{ item: id, count: Number(props.candles ?? '1') }];
    case 'snow_layer':
      return [{ item: id, count: Number(props.layers ?? '1') }];
    case 'petals':
      return [{ item: id, count: Number(props.flower_amount ?? '1') }];
    case 'potted':
      if (id === 'minecraft:flower_pot') return [{ item: id, count: 1 }];
      return [
        { item: 'minecraft:flower_pot', count: 1 },
        { item: POTTED_PLANT_ITEM[id] ?? id.replace('minecraft:potted_', 'minecraft:'), count: 1 },
      ];
    default:
      return [{ item: id, count: 1 }];
  }
}

export function countMaterials(model: Pick<VoxelModel, 'palette' | 'indices'>): MaterialSummary {
  const counts = new Uint32Array(model.palette.length);
  for (const index of model.indices) counts[index]!++;

  const entries: MaterialEntry[] = [];
  const items = new Map<string, number>();
  let airBlocks = 0;
  model.palette.forEach((state, i) => {
    const count = counts[i]!;
    if (state === AIR) {
      airBlocks += count;
      return;
    }
    if (count === 0) return;
    const stackSize = STACK_SIZE;
    entries.push({
      state,
      blockId: blockIdOf(state),
      label: labelFor(state),
      count,
      stacks: Math.floor(count / stackSize),
      remainder: count % stackSize,
    });
    for (const it of itemsForState(state)) items.set(it.item, (items.get(it.item) ?? 0) + it.count * count);
  });
  entries.sort((a, b) => b.count - a.count || a.state.localeCompare(b.state));

  const grouped = new Map<string, { blockId: string; label: string; count: number }>();
  for (const e of entries) {
    const g = grouped.get(e.blockId) ?? { blockId: e.blockId, label: e.label, count: 0 };
    g.count += e.count;
    grouped.set(e.blockId, g);
  }
  const byBlock = [...grouped.values()].sort((a, b) => b.count - a.count || a.blockId.localeCompare(b.blockId));
  const itemList: ItemEntry[] = [...items.entries()]
    .map(([item, count]) => ({ item, label: labelFor(item), count, stackSize: stackSizeOf(item) }))
    .sort((a, b) => b.count - a.count || a.item.localeCompare(b.item));

  const totalBlocks = entries.reduce((sum, e) => sum + e.count, 0);
  const totalItems = itemList.reduce((sum, e) => sum + e.count, 0);
  return { entries, byBlock, items: itemList, totalBlocks, totalItems, airBlocks, volume: model.indices.length };
}

export function formatStacks(count: number, stackSize = STACK_SIZE): string {
  const stacks = Math.floor(count / stackSize);
  const rest = count % stackSize;
  if (stacks === 0) return `${rest}`;
  return rest === 0 ? `${stacks} × ${stackSize}` : `${stacks} × ${stackSize} + ${rest}`;
}
