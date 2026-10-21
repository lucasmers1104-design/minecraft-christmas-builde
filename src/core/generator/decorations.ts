import type { HouseContext } from '@/core/generator/buildHouse';
import { Priority } from '@/core/generator/geometry';

/**
 * Christmas decoration for the house. Everything uses DECOR priority (or OPENING for
 * glass), so it can never overwrite structure, windows or the reserved door clearance.
 */
export function decorateHouse(ctx: HouseContext): void {
  const p = ctx.params;
  if (p.lights) placeInteriorLights(ctx);
  if (p.floorLights) placeFloorLights(ctx);
  if (p.atticWindows) placeAtticWindows(ctx);
  if (p.garland) placeGarland(ctx, 'front');
  if (p.backGarland) placeGarland(ctx, 'back');
  if (p.christmasTree) placeChristmasTree(ctx);
  if (p.wreath) placeWreath(ctx);
}

/** Warm light hanging directly below the ridge, centred over the room. */
function placeInteriorLights({ builder, layout, colors }: HouseContext): void {
  const { xc, zc, wallTop } = layout;
  const roofUnderside = builder.firstSolidAbove(xc, wallTop + 1, zc);
  if (roofUnderside === null) return;
  builder.setBlock(xc, roofUnderside - 1, zc, colors.light, Priority.DECOR);
}

/** Glowing inlays in the floor near the front corners (flush with the floor, never in the way). */
function placeFloorLights({ builder, layout, colors }: HouseContext): void {
  const { x0, z0, xc } = layout;
  builder.placeSymmetric(x0 + 2, 0, z0 + 2, xc, colors.light, Priority.STRUCTURE);
}

function placeAtticWindows({ builder, layout, colors }: HouseContext): void {
  const { zc, x0, x1 } = layout;
  const cells = layout.roof.gableCells.filter((c) => c.z === zc && (c.x === x0 || c.x === x1));
  const ys = [...new Set(cells.map((c) => c.y))].sort((a, b) => a - b);
  // Use the two rows above the lowest gable row, if the gable is tall enough.
  const rows = ys.slice(1, 3);
  for (const x of [x0, x1]) {
    const glassCells: { x: number; y: number; z: number }[] = [];
    for (const y of rows) {
      builder.setBlock(x, y, zc, colors.windowGlass, Priority.OPENING);
      glassCells.push({ x, y, z: zc });
    }
    if (glassCells.length > 0) layout.windows.push({ wall: x === x0 ? 'left' : 'right', cells: glassCells });
  }
}

/** Spruce garland under the eave with evenly spaced bows (offset varies with the seed). */
function placeGarland({ builder, layout, colors, random, spec }: HouseContext, side: 'front' | 'back'): void {
  const { x0, x1, xc, wallTop } = layout;
  const z = side === 'front' ? layout.z0 - 1 : layout.z1 + 1;
  const bowOffset = random.int(0, 2);
  const bow = spec.style === 'realistic' ? null : colors.garlandBow;
  for (let x = x0; x <= x1; x++) {
    const isBow = bow !== null && Math.abs(x - xc) % 3 === bowOffset;
    builder.setBlock(x, wallTop, z, isBow ? bow : colors.garland, Priority.DECOR);
  }
}

/** Wreath above the door, below the eave; skipped if there is no room between door and eave. */
function placeWreath({ builder, layout, colors }: HouseContext): void {
  const { door, wallTop } = layout;
  const y = door.yTo + 1;
  if (y >= wallTop) return;
  builder.setBlock(door.x, y, door.z - 1, colors.garland, Priority.DECOR);
}

/**
 * Christmas tree against the middle of the back wall, facing the entrance (the back wall has
 * no window there, so no window is blocked): trunk, three leaf tiers with seed-dependent
 * ornaments, a star/light on top, presents underneath.
 */
function placeChristmasTree({ builder, layout, colors, random, params }: HouseContext): void {
  const tx = layout.xc;
  const tz = layout.z1 - 2;

  // Highest free y above the floor for the whole 3x3 footprint.
  let ceiling = Number.POSITIVE_INFINITY;
  for (let dx = -1; dx <= 1; dx++)
    for (let dz = -1; dz <= 1; dz++) {
      const hit = builder.firstSolidAbove(tx + dx, 1, tz + dz);
      if (hit !== null) ceiling = Math.min(ceiling, hit);
    }
  const topFree = Number.isFinite(ceiling) ? ceiling - 1 : layout.dimensions.height - 1;
  if (topFree < 4) return;

  const ring: [number, number][] = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ];
  const plus: [number, number][] = [
    [0, -1],
    [-1, 0],
    [1, 0],
    [0, 1],
  ];

  builder.fillBox({ x: tx, y: 1, z: tz }, { x: tx, y: 3, z: tz }, colors.treeTrunk, Priority.DECOR);
  const ornamentSlots = new Set(random.shuffle(ring.map((_, i) => i)).slice(0, 3));
  ring.forEach(([dx, dz], i) => {
    const state = ornamentSlots.has(i) ? random.pick(colors.ornaments) : colors.treeLeaves;
    builder.setBlock(tx + dx, 2, tz + dz, state, Priority.DECOR);
  });
  for (const [dx, dz] of plus) builder.setBlock(tx + dx, 3, tz + dz, colors.treeLeaves, Priority.DECOR);
  const hasUpperTier = topFree >= 5;
  if (hasUpperTier) builder.setBlock(tx, 4, tz, colors.treeLeaves, Priority.DECOR);
  builder.setBlock(tx, hasUpperTier ? 5 : 4, tz, colors.treeTop, Priority.DECOR);

  if (params.presents) {
    // Presents under the tree canopy (floor level, ring cells only – never the trunk).
    const count = random.int(2, 4);
    const slots = random.shuffle(ring).slice(0, count);
    for (const [dx, dz] of slots) builder.setBlock(tx + dx, 1, tz + dz, random.pick(colors.presents), Priority.DECOR);
  }
}
