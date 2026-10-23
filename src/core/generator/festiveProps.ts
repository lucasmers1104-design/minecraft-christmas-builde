import { isFaceFull } from '@/core/blocks/faces';
import { AIR, blockState, definitionOf } from '@/core/blocks/registry';
import { Priority, type VoxelBuilder } from '@/core/generator/geometry';

/**
 * Small festive props as block recipes (research 2026-10: 11 T20, 10 T12/T15, 14 F5, 12 i).
 * Every recipe holds in the game without support rules: hay, bamboo, logs and leaves need no
 * support, fences stand on the ground, candles only on a full top face. Callers check that
 * the cells are free and keep the door clearance; the recipes only write.
 */

export type Cell = { x: number; y: number; z: number };

const set = (b: VoxelBuilder, x: number, y: number, z: number, state: string) => {
  if (b.inside(x, y, z)) b.setBlock(x, y, z, state, Priority.DECOR);
};

/** True if (x, y, z) is air and stands on a block with a full top face. */
export function standsOnFull(b: VoxelBuilder, x: number, y: number, z: number): boolean {
  if (!b.inside(x, y, z) || y < 1 || !b.isAir(x, y, z)) return false;
  const below = b.getBlock(x, y - 1, z);
  return below !== AIR && isFaceFull(below, 'up');
}

/** Lowest standing row at or below `yMax` (air on a full top face), or null. */
export function standingY(b: VoxelBuilder, x: number, z: number, yMax: number): number | null {
  for (let y = Math.min(yMax, b.dimensions.height - 1); y >= 1; y--) {
    if (!b.inside(x, y, z)) return null;
    if (!b.isAir(x, y, z)) return null;
    if (standsOnFull(b, x, y, z)) return y;
  }
  return null;
}

/** A plain, window-free wall block: opaque full cube or pillar that does not glow. */
export function isPlainWall(state: string): boolean {
  if (state === AIR) return false;
  const def = definitionOf(state);
  if (def.shape !== 'cube' && def.shape !== 'pillar') return false;
  return def.light === 0 && !def.id.includes('glass') && !def.id.includes('leaves');
}

/**
 * Kadomatsu (11 T20): straw-bound base, a pine sprig and bamboo stalks of two heights.
 * `outer` is the column away from the door (the taller one), `inner` the one next to it
 * (null where there is room for one column only).
 */
export function buildKadomatsu(b: VoxelBuilder, inner: Cell | null, outer: Cell): void {
  const hay = blockState('hay_block', { axis: 'y' });
  const bamboo = blockState('bamboo_block', { axis: 'y' });
  const pine = blockState('spruce_leaves', { persistent: 'true' });
  set(b, outer.x, outer.y, outer.z, hay);
  for (let dy = 1; dy <= 3; dy++) set(b, outer.x, outer.y + dy, outer.z, bamboo);
  if (!inner) return;
  set(b, inner.x, inner.y, inner.z, hay);
  set(b, inner.x, inner.y + 1, inner.z, pine);
  set(b, inner.x, inner.y + 2, inner.z, bamboo);
}

/** Shimekazari (11 T20): straw rope above the entrance, hay with its axis along the wall. */
export function buildShimekazari(b: VoxelBuilder, cells: readonly Cell[], axis: 'x' | 'z'): void {
  const hay = blockState('hay_block', { axis });
  for (const c of cells) set(b, c.x, c.y, c.z, hay);
}

/** Julenek (10 T15): an oat sheaf (hay) on a two-block spruce pole. */
export function buildJulenek(b: VoxelBuilder, foot: Cell): void {
  const pole = blockState('spruce_fence');
  set(b, foot.x, foot.y, foot.z, pole);
  set(b, foot.x, foot.y + 1, foot.z, pole);
  set(b, foot.x, foot.y + 2, foot.z, blockState('hay_block', { axis: 'y' }));
}

/** Cells a julbock occupies: body 3 long on two birch legs, neck and head forward, horn on top. */
export function julbockCells(foot: Cell, along: 'x' | 'z', forward: 1 | -1): { cell: Cell; part: 'leg' | 'body' | 'neck' | 'head' | 'horn' | 'band' }[] {
  const at = (u: number, dy: number): Cell => (along === 'x' ? { x: foot.x + u * forward, y: foot.y + dy, z: foot.z } : { x: foot.x, y: foot.y + dy, z: foot.z + u * forward });
  return [
    { cell: at(0, 0), part: 'leg' },
    { cell: at(2, 0), part: 'leg' },
    { cell: at(0, 1), part: 'body' },
    { cell: at(1, 1), part: 'body' },
    { cell: at(2, 1), part: 'body' },
    { cell: at(0, 2), part: 'band' },
    { cell: at(2, 2), part: 'neck' },
    { cell: at(3, 2), part: 'head' },
    { cell: at(2, 3), part: 'horn' },
  ];
}

/** Julbock (10 T15): a straw goat with red ribbons, legs and horn of birch fence. */
export function buildJulbock(b: VoxelBuilder, foot: Cell, along: 'x' | 'z', forward: 1 | -1): void {
  const axis = along;
  for (const { cell, part } of julbockCells(foot, along, forward)) {
    const state =
      part === 'leg' || part === 'horn'
        ? blockState('birch_fence')
        : part === 'band'
          ? blockState('red_carpet')
          : blockState('hay_block', { axis: part === 'body' ? axis : 'y' });
    set(b, cell.x, cell.y, cell.z, state);
  }
}

/**
 * Woodpile (14 F5, 10 T12): logs with the end grain facing out (axis across the wall),
 * `cells` is the bottom row along the wall; the top row is two shorter (stepped ends).
 */
export function buildWoodpile(b: VoxelBuilder, cells: readonly Cell[], axis: 'x' | 'z', birchEvery: number): void {
  const spruce = blockState('spruce_log', { axis });
  const birch = blockState('birch_log', { axis });
  cells.forEach((c, i) => {
    set(b, c.x, c.y, c.z, birchEvery > 0 && i % birchEvery === 2 ? birch : spruce);
    if (i > 0 && i < cells.length - 1) set(b, c.x, c.y + 1, c.z, birchEvery > 0 && i % birchEvery === 0 ? birch : spruce);
  });
}

/**
 * Candy cane (14 F3, 09 E16): a shaft of alternating red and white concrete, four high, and a
 * hook bending towards the path (`hook`: one cell towards the path).
 */
export function buildCandyCane(b: VoxelBuilder, foot: Cell, hook: readonly [number, number]): void {
  const red = blockState('red_concrete');
  const white = blockState('white_concrete');
  for (let dy = 0; dy < 4; dy++) set(b, foot.x, foot.y + dy, foot.z, dy % 2 === 0 ? white : red);
  set(b, foot.x + hook[0], foot.y + 3, foot.z + hook[1], white);
  set(b, foot.x + hook[0], foot.y + 2, foot.z + hook[1], red);
}

/** Farolito (12 i): two lit candles on the ground. */
export function buildFarolito(b: VoxelBuilder, c: Cell, color: string): void {
  set(b, c.x, c.y, c.z, blockState(color, { candles: '2', lit: 'true' }));
}
