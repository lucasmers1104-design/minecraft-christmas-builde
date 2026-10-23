import { blockState, profileBlockId } from '@/core/blocks/registry';
import { rotateState } from '@/core/blocks/transform';
import { formOf, type Form } from '@/core/style/materials';
import type { Role } from '@/core/style/palettes';
import type { RoleMaterials } from '@/core/templates/place';

/**
 * Lamp posts as data (research note 18_beleuchtung.md, T3 "Katalog der Lampenpfähle"). Each
 * design is drawn canonically with the post at x = z = 0 and its arm reaching towards +x
 * (east, the path side); y = 1 is the walking level. Placement rotates positions and block
 * states clockwise in quarter turns. Materials come from palette roles (fence wood from
 * `frame`, stone foot from `plinth`) with fixed fallbacks; `lantern` is replaced by the style's
 * lantern and `iron_chain` by the profile's chain id.
 *
 * Rules every design follows (tested in all four rotations): every lantern or light sits at
 * y ≥ 3 (the 3rd cell above the path, vanilla snowy_lamp_post_01) with ≥ 2 free cells below,
 * every hanging lantern has a holding face above (fence, chain, closed bottom trapdoor), every
 * standing lantern a supporting centre below.
 */

export type LampDesignId =
  | 'snowy_gallows'
  | 'high_gallows'
  | 'stone_foot'
  | 'stone_arm'
  | 'hat_post'
  | 'lantern_house'
  | 'kasuga'
  | 'yukimi'
  | 'modern_mast'
  | 'candelabra'
  | 'sand_column'
  | 'shroom_post'
  | 'leaf_lamp'
  | 'blossom_lamp';

export interface LampCell {
  x: number;
  y: number;
  z: number;
  /** Palette role whose material gives the block in `form`. */
  role?: Role;
  form?: Form;
  /** Fixed block (short id); used when no role is set or the role lacks the form. */
  block?: string;
  props?: Readonly<Record<string, string>>;
}

export interface LampDesign {
  id: LampDesignId;
  /** Catalogue number in the research note. */
  source: string;
  label: string;
  cells: readonly LampCell[];
  /** Extra cells the design needs beside its post at walking height (legs): keep this far from the path. */
  footprint: number;
  /** The post is wood (fence) – not used for modern, japanese and mediterranean. */
  wooden: boolean;
}

const post = (y0: number, y1: number, cell: Omit<LampCell, 'x' | 'y' | 'z'>): LampCell[] => {
  const out: LampCell[] = [];
  for (let y = y0; y <= y1; y++) out.push({ x: 0, y, z: 0, ...cell });
  return out;
};

const FENCE: Omit<LampCell, 'x' | 'y' | 'z'> = { role: 'frame', form: 'fence', block: 'spruce_fence' };
const HANGING = { hanging: 'true' } as const;
const STANDING = { hanging: 'false' } as const;

/** Roof of four bottom stairs around a centre block (Kasuga, Yukimi, lantern house). */
function hipCap(y: number, stairs: Omit<LampCell, 'x' | 'y' | 'z' | 'props'>, centre: Omit<LampCell, 'x' | 'y' | 'z'>): LampCell[] {
  return [
    { x: 0, y, z: 0, ...centre },
    // facing = towards the centre: the high side of each stair leans on the middle block.
    { x: 1, y, z: 0, ...stairs, props: { facing: 'west', half: 'bottom' } },
    { x: -1, y, z: 0, ...stairs, props: { facing: 'east', half: 'bottom' } },
    { x: 0, y, z: 1, ...stairs, props: { facing: 'north', half: 'bottom' } },
    { x: 0, y, z: -1, ...stairs, props: { facing: 'south', half: 'bottom' } },
  ];
}

export const LAMP_DESIGNS: Readonly<Record<LampDesignId, LampDesign>> = {
  // LP01/02 vanilla snowy lamp post: four fences, one arm, lantern in the 3rd cell.
  snowy_gallows: {
    id: 'snowy_gallows',
    source: 'LP02',
    label: 'Schneedorf-Galgen',
    cells: [...post(1, 4, FENCE), { x: 1, y: 4, z: 0, ...FENCE }, { x: 1, y: 3, z: 0, block: 'lantern', props: HANGING }],
    footprint: 0,
    wooden: true,
  },
  // LP04 tall gallows with a chain.
  high_gallows: {
    id: 'high_gallows',
    source: 'LP04',
    label: 'Hoher Galgen mit Kette',
    cells: [
      ...post(1, 5, FENCE),
      { x: 1, y: 5, z: 0, ...FENCE },
      { x: 2, y: 5, z: 0, ...FENCE },
      { x: 2, y: 4, z: 0, block: 'iron_chain', props: { axis: 'y' } },
      { x: 2, y: 3, z: 0, block: 'lantern', props: HANGING },
    ],
    footprint: 0,
    wooden: true,
  },
  // LP05 stone foot, wall shaft, wooden top with chain: thick to thin.
  stone_foot: {
    id: 'stone_foot',
    source: 'LP05',
    label: 'Steinfuß-Pfahl',
    cells: [
      { x: 0, y: 1, z: 0, role: 'plinth', form: 'block', block: 'stone_bricks' },
      ...post(2, 3, { role: 'plinth', form: 'wall', block: 'stone_brick_wall' }),
      ...post(4, 6, FENCE),
      { x: 1, y: 6, z: 0, ...FENCE },
      { x: 1, y: 5, z: 0, block: 'iron_chain', props: { axis: 'y' } },
      { x: 1, y: 4, z: 0, block: 'lantern', props: HANGING },
    ],
    footprint: 0,
    wooden: true,
  },
  // LP05 in stone only (mediterranean "aus Sandstein"): wall shaft and wall arm.
  stone_arm: {
    id: 'stone_arm',
    source: 'LP05',
    label: 'Steinpfahl mit Mauerarm',
    cells: [
      { x: 0, y: 1, z: 0, role: 'plinth', form: 'block', block: 'stone_bricks' },
      ...post(2, 6, { role: 'plinth', form: 'wall', block: 'stone_brick_wall' }),
      { x: 1, y: 6, z: 0, role: 'plinth', form: 'wall', block: 'stone_brick_wall' },
      { x: 1, y: 5, z: 0, block: 'iron_chain', props: { axis: 'y' } },
      { x: 1, y: 4, z: 0, block: 'lantern', props: HANGING },
    ],
    footprint: 0,
    wooden: false,
  },
  // LP07 fence lantern under a trapdoor hat.
  hat_post: {
    id: 'hat_post',
    source: 'LP07',
    label: 'Zaunlaterne mit Falltürhut',
    cells: [
      ...post(1, 2, FENCE),
      { x: 0, y: 3, z: 0, block: 'lantern', props: HANGING },
      { x: 0, y: 4, z: 0, role: 'shutter', form: 'trapdoor', block: 'spruce_trapdoor', props: { half: 'bottom', open: 'false' } },
    ],
    footprint: 0,
    wooden: true,
  },
  // LP08 lantern house: open trapdoors around the lantern, a little hip roof on top.
  lantern_house: {
    id: 'lantern_house',
    source: 'LP08',
    label: 'Laternenhaus',
    cells: [
      ...post(1, 3, FENCE),
      { x: 0, y: 4, z: 0, block: 'lantern', props: STANDING },
      // Open trapdoor panels lie on the side opposite to `facing`, i.e. against the lantern.
      { x: 1, y: 4, z: 0, role: 'shutter', form: 'trapdoor', block: 'spruce_trapdoor', props: { facing: 'east', half: 'bottom', open: 'true' } },
      { x: -1, y: 4, z: 0, role: 'shutter', form: 'trapdoor', block: 'spruce_trapdoor', props: { facing: 'west', half: 'bottom', open: 'true' } },
      { x: 0, y: 4, z: 1, role: 'shutter', form: 'trapdoor', block: 'spruce_trapdoor', props: { facing: 'south', half: 'bottom', open: 'true' } },
      { x: 0, y: 4, z: -1, role: 'shutter', form: 'trapdoor', block: 'spruce_trapdoor', props: { facing: 'north', half: 'bottom', open: 'true' } },
      ...hipCap(5, { role: 'shutter', form: 'stairs', block: 'spruce_stairs' }, { role: 'shutter', form: 'block', block: 'spruce_planks' }),
    ],
    footprint: 0,
    wooden: true,
  },
  // LP09 Kasuga-dōrō: foot, shaft, platform, fire chamber, roof, knob.
  kasuga: {
    id: 'kasuga',
    source: 'LP09',
    label: 'Kasuga-dōrō (Steinlaterne)',
    cells: [
      { x: 0, y: 1, z: 0, block: 'polished_andesite' },
      { x: 0, y: 2, z: 0, block: 'andesite_wall' },
      { x: 0, y: 3, z: 0, block: 'smooth_stone_slab', props: { type: 'top' } },
      { x: 0, y: 4, z: 0, block: 'lantern', props: STANDING },
      ...hipCap(5, { block: 'stone_brick_stairs' }, { block: 'stone_bricks' }),
      { x: 0, y: 6, z: 0, block: 'stone_brick_wall' },
    ],
    footprint: 1,
    wooden: false,
  },
  // LP10 Yukimi-dōrō: low and wide on two legs (snow-viewing lantern).
  yukimi: {
    id: 'yukimi',
    source: 'LP10',
    label: 'Yukimi-dōrō (Schneeschau-Laterne)',
    cells: [
      { x: -1, y: 1, z: 0, block: 'stone_brick_wall' },
      { x: 1, y: 1, z: 0, block: 'stone_brick_wall' },
      { x: -1, y: 2, z: 0, block: 'stone_brick_slab', props: { type: 'top' } },
      { x: 0, y: 2, z: 0, block: 'stone_brick_slab', props: { type: 'top' } },
      { x: 1, y: 2, z: 0, block: 'stone_brick_slab', props: { type: 'top' } },
      { x: 0, y: 3, z: 0, block: 'lantern', props: STANDING },
      ...hipCap(4, { block: 'stone_brick_stairs' }, { block: 'stone_bricks' }),
    ],
    footprint: 1,
    wooden: false,
  },
  // LP11 modern mast with a boom and a warm copper bulb.
  modern_mast: {
    id: 'modern_mast',
    source: 'LP11',
    label: 'Moderner Mast mit Ausleger',
    cells: [
      ...post(1, 6, { block: 'polished_blackstone_wall' }),
      { x: 1, y: 6, z: 0, block: 'polished_blackstone_slab', props: { type: 'top' } },
      { x: 1, y: 5, z: 0, block: 'waxed_copper_bulb', props: { lit: 'true', powered: 'false' } },
    ],
    footprint: 0,
    wooden: false,
  },
  // LP18 iron candelabra: thin iron-bar mast with a standing lantern.
  candelabra: {
    id: 'candelabra',
    source: 'LP18',
    label: 'Eisenmast-Kandelaber',
    cells: [{ x: 0, y: 1, z: 0, block: 'polished_blackstone_wall' }, ...post(2, 4, { block: 'iron_bars' }), { x: 0, y: 5, z: 0, block: 'lantern', props: STANDING }],
    footprint: 0,
    wooden: false,
  },
  // LP13 sandstone column (vanilla desert_lamp_1 with a lantern instead of the torch).
  sand_column: {
    id: 'sand_column',
    source: 'LP13',
    label: 'Sandsteinsäule',
    cells: [...post(1, 2, { block: 'cut_sandstone' }), { x: 0, y: 3, z: 0, block: 'chiseled_sandstone' }, { x: 0, y: 4, z: 0, block: 'lantern', props: STANDING }],
    footprint: 0,
    wooden: false,
  },
  // LP16 shroomlight under a trapdoor hat.
  shroom_post: {
    id: 'shroom_post',
    source: 'LP16',
    label: 'Pilzlicht-Zaunleuchte',
    cells: [
      ...post(1, 2, FENCE),
      { x: 0, y: 3, z: 0, block: 'shroomlight' },
      { x: 0, y: 4, z: 0, role: 'shutter', form: 'trapdoor', block: 'dark_oak_trapdoor', props: { half: 'bottom', open: 'false' } },
    ],
    footprint: 0,
    wooden: true,
  },
  // LP17 leaf lamp: froglight wrapped in azalea leaves (light passes through leaves).
  leaf_lamp: {
    id: 'leaf_lamp',
    source: 'LP17',
    label: 'Laubleuchte',
    cells: [
      ...post(1, 2, FENCE),
      { x: 0, y: 3, z: 0, block: 'ochre_froglight' },
      ...[
        [1, 3, 0],
        [-1, 3, 0],
        [0, 3, 1],
        [0, 3, -1],
        [0, 4, 0],
      ].map(([x, y, z]) => ({ x: x!, y: y!, z: z!, block: 'azalea_leaves' })),
    ],
    footprint: 0,
    wooden: true,
  },
  // LP17 cherry variant: pearlescent froglight in cherry leaves.
  blossom_lamp: {
    id: 'blossom_lamp',
    source: 'LP17',
    label: 'Kirschblüten-Leuchte',
    cells: [
      ...post(1, 2, FENCE),
      { x: 0, y: 3, z: 0, block: 'pearlescent_froglight' },
      ...[
        [1, 3, 0],
        [-1, 3, 0],
        [0, 3, 1],
        [0, 3, -1],
        [0, 4, 0],
      ].map(([x, y, z]) => ({ x: x!, y: y!, z: z!, block: 'cherry_leaves' })),
    ],
    footprint: 0,
    wooden: true,
  },
};

/** Clockwise rotation of a canonical (x, z) offset by quarter turns (east → south → west → north). */
export function rotateOffset(x: number, z: number, turns: number): [number, number] {
  let a = x;
  let b = z;
  for (let i = 0; i < ((turns % 4) + 4) % 4; i++) [a, b] = [-b, a];
  return [a, b];
}

export interface LampContext {
  materials: RoleMaterials;
  minecraftVersion: string;
  lantern: 'lantern' | 'soul_lantern';
}

/** Block state of one design cell for a building, rotated by `turns` quarter turns. */
export function lampCellState(cell: LampCell, ctx: LampContext, turns: number): string {
  let id: string | null = null;
  if (cell.role && cell.form) id = formOf(ctx.materials[cell.role], cell.form);
  // Roles without the form (concrete frames have no fence) use the design's fixed block.
  if (!id || (cell.form === 'fence' && !id.endsWith('_fence')) || (cell.form === 'wall' && !id.endsWith('_wall'))) id = cell.block ?? null;
  if (!id) throw new Error(`Lampenpfahl: keine Form für ${cell.role}/${cell.form}`);
  if (id === 'lantern') id = ctx.lantern;
  const probe = blockState(profileBlockId(id, ctx.minecraftVersion));
  const props: Record<string, string> = {};
  for (const [k, v] of Object.entries(cell.props ?? {})) if (probe.includes(`${k}=`)) props[k] = v;
  return rotateState(blockState(profileBlockId(id, ctx.minecraftVersion), props), turns);
}

/** World cells of a design with its post at (x, z) and the arm rotated by `turns`. */
export function lampCells(design: LampDesign, x: number, z: number, turns: number, ctx: LampContext): { x: number; y: number; z: number; state: string }[] {
  return design.cells.map((c) => {
    const [dx, dz] = rotateOffset(c.x, c.z, turns);
    return { x: x + dx, y: c.y, z: z + dz, state: lampCellState(c, ctx, turns) };
  });
}

/** Height of the light above the walking level (1 = y 1). */
export function lightHeight(design: LampDesign): number {
  const light = design.cells.find((c) => c.block === 'lantern' || c.block?.includes('froglight') || c.block === 'shroomlight' || c.block?.includes('copper_bulb'));
  return light?.y ?? 0;
}
