import { clockwise, counterClockwise, oppositeHorizontal, type HorizontalDirection } from '@/core/blocks/directions';

/**
 * Shape classes: every registry block belongs to exactly one. A shape class knows its block
 * state properties and defaults, its geometry in 1/16 block units (modelled on the vanilla
 * voxel shapes, so face coverage, connections and support rules can be derived from it), its
 * support rule and its counting rule for the material list.
 *
 * The geometry is used three ways: the colour preview draws it, the state resolver derives
 * "sturdy" faces from it (fence/pane/wall connections), and the validator derives support
 * (lanterns, candles, doors, snow). Keeping one description avoids the three drifting apart.
 */

export type ShapeClass =
  | 'cube'
  | 'pillar'
  | 'facing_cube'
  | 'barrel'
  | 'stairs'
  | 'slab'
  | 'fence'
  | 'fence_gate'
  | 'wall'
  | 'pane'
  | 'trapdoor'
  | 'door'
  | 'lantern'
  | 'chain'
  | 'candle'
  | 'leaves'
  | 'potted'
  | 'plant'
  | 'sapling'
  /** Two-block plant (tall grass, large fern): lower half on the ground, upper half above. */
  | 'tall_plant'
  | 'carpet'
  | 'button'
  | 'campfire'
  | 'end_rod'
  | 'lightning_rod'
  | 'snow_layer'
  | 'rail'
  | 'petals'
  | 'grass_block'
  | 'path'
  | 'bulb'
  | 'grate'
  | 'vine'
  | 'ladder';

/** Axis-aligned box [x0, y0, z0, x1, y1, z1] in 1/16 block units. */
export type Box = readonly [number, number, number, number, number, number];

/** Colour hint for the colour preview (e.g. the glowing core of a lantern). */
export type Tone = 'main' | 'glow' | 'plant' | 'dark' | 'fire' | 'metal';

export interface ShapeBox {
  box: Box;
  tone?: Tone;
}

export type Props = Readonly<Record<string, string>>;

export interface ShapeSpec {
  properties: Readonly<Record<string, readonly string[]>>;
  defaults: Readonly<Record<string, string>>;
  /** Visual geometry (also used as collision/support geometry unless overridden). */
  boxes(props: Props): readonly ShapeBox[];
  /** Geometry that can support other blocks; leaves have an empty support shape. */
  supportBoxes?(props: Props): readonly Box[];
  /** Full block for meshing/culling purposes (all faces solid and opaque-capable). */
  fullCube?: boolean;
}

const BOOL = ['true', 'false'] as const;
const FACING4 = ['north', 'south', 'west', 'east'] as const;
const FACING6 = ['north', 'east', 'south', 'west', 'up', 'down'] as const;
const AXIS = ['x', 'y', 'z'] as const;
const WALL_SIDE = ['none', 'low', 'tall'] as const;

const FULL: Box = [0, 0, 0, 16, 16, 16];

/** Rotates a box clockwise (seen from above) around the block centre. North → east. */
export function rotateBox(box: Box, quarterTurns: number): Box {
  const [, y0, , , y1] = box;
  let [x0, , z0, x1, , z1] = box;
  const turns = ((quarterTurns % 4) + 4) % 4;
  for (let i = 0; i < turns; i++) {
    [x0, z0, x1, z1] = [16 - z1, x0, 16 - z0, x1];
  }
  return [x0, y0, z0, x1, y1, z1];
}

const TURNS_FROM_NORTH: Record<HorizontalDirection, number> = { north: 0, east: 1, south: 2, west: 3 };

/** Box designed for "north" rotated to the given horizontal direction. */
function toward(dir: HorizontalDirection, box: Box): Box {
  return rotateBox(box, TURNS_FROM_NORTH[dir]);
}

function horizontal(value: string | undefined): HorizontalDirection {
  return value === 'east' || value === 'south' || value === 'west' ? value : 'north';
}

/** Half of the block (in plan) on side `dir`, between y0 and y1. */
function half(dir: HorizontalDirection, y0: number, y1: number): Box {
  return toward(dir, [0, y0, 0, 16, y1, 8]);
}

/** Quarter of the block (in plan) in the corner between two perpendicular directions. */
function quarter(a: HorizontalDirection, b: HorizontalDirection, y0: number, y1: number): Box {
  const ha = half(a, y0, y1);
  const hb = half(b, y0, y1);
  return [
    Math.max(ha[0], hb[0]),
    y0,
    Math.max(ha[2], hb[2]),
    Math.min(ha[3], hb[3]),
    y1,
    Math.min(ha[5], hb[5]),
  ];
}

const one = (box: Box, tone?: Tone): ShapeBox[] => [{ box, tone }];

function stairsBoxes(p: Props): ShapeBox[] {
  const facing = horizontal(p.facing);
  const top = p.half === 'top';
  const [slab0, slab1, step0, step1] = top ? [8, 16, 0, 8] : [0, 8, 8, 16];
  const out: Box[] = [[0, slab0, 0, 16, slab1, 16]];
  const back = oppositeHorizontal(facing);
  switch (p.shape) {
    case 'inner_left':
      out.push(half(facing, step0, step1), quarter(back, counterClockwise(facing), step0, step1));
      break;
    case 'inner_right':
      out.push(half(facing, step0, step1), quarter(back, clockwise(facing), step0, step1));
      break;
    case 'outer_left':
      out.push(quarter(facing, counterClockwise(facing), step0, step1));
      break;
    case 'outer_right':
      out.push(quarter(facing, clockwise(facing), step0, step1));
      break;
    default:
      out.push(half(facing, step0, step1));
  }
  return out.map((box) => ({ box }));
}

function connected(p: Props, dir: HorizontalDirection): boolean {
  return p[dir] === 'true';
}

function fenceBoxes(p: Props): ShapeBox[] {
  const out: ShapeBox[] = [{ box: [6, 0, 6, 10, 16, 10] }];
  for (const dir of ['north', 'east', 'south', 'west'] as const) {
    if (!connected(p, dir)) continue;
    out.push({ box: toward(dir, [7, 12, 0, 9, 15, 6]) }, { box: toward(dir, [7, 6, 0, 9, 9, 6]) });
  }
  return out;
}

function paneBoxes(p: Props): ShapeBox[] {
  const out: ShapeBox[] = [{ box: [7, 0, 7, 9, 16, 9] }];
  for (const dir of ['north', 'east', 'south', 'west'] as const) {
    if (connected(p, dir)) out.push({ box: toward(dir, [7, 0, 0, 9, 16, 7]) });
  }
  return out;
}

function wallBoxes(p: Props): ShapeBox[] {
  const out: ShapeBox[] = p.up === 'true' ? [{ box: [4, 0, 4, 12, 16, 12] }] : [];
  for (const dir of ['north', 'east', 'south', 'west'] as const) {
    const side = p[dir];
    if (side === 'low') out.push({ box: toward(dir, [5, 0, 0, 11, 14, 8]) });
    else if (side === 'tall') out.push({ box: toward(dir, [5, 0, 0, 11, 16, 8]) });
  }
  // Without post and arms vanilla draws nothing; the resolver never produces that state.
  return out;
}

function gateBoxes(p: Props): ShapeBox[] {
  const facing = horizontal(p.facing);
  const dy = p.in_wall === 'true' ? -3 : 0;
  const lift = (b: Box): Box => [b[0], b[1] + dy, b[2], b[3], b[4] + dy, b[5]];
  // Designed for facing north: the gate spans x and sits in the middle of z.
  const posts: Box[] = [
    [0, 5, 7, 2, 16, 9],
    [14, 5, 7, 16, 16, 9],
  ];
  const bars: Box[] =
    p.open === 'true'
      ? [
          [0, 6, 9, 2, 15, 16],
          [14, 6, 9, 16, 15, 16],
        ]
      : [
          [6, 6, 7, 10, 15, 9],
          [2, 6, 7, 6, 9, 9],
          [2, 12, 7, 6, 15, 9],
          [10, 6, 7, 14, 9, 9],
          [10, 12, 7, 14, 15, 9],
        ];
  return [...posts, ...bars].map((b) => ({ box: toward(facing, lift(b)) }));
}

function trapdoorBoxes(p: Props): ShapeBox[] {
  const facing = horizontal(p.facing);
  if (p.open === 'true') return one(toward(oppositeHorizontal(facing), [0, 0, 0, 16, 16, 3]));
  return one(p.half === 'top' ? [0, 13, 0, 16, 16, 16] : [0, 0, 0, 16, 3, 16]);
}

function doorBoxes(p: Props): ShapeBox[] {
  const facing = horizontal(p.facing);
  // Closed: the door leaf lies on the side opposite to `facing` (vanilla DoorBlock shapes).
  if (p.open !== 'true') return one(toward(oppositeHorizontal(facing), [0, 0, 0, 16, 16, 3]));
  const side = p.hinge === 'right' ? clockwise(facing) : counterClockwise(facing);
  return one(toward(side, [0, 0, 0, 16, 16, 3]));
}

function lanternBoxes(p: Props): ShapeBox[] {
  const y = p.hanging === 'true' ? 1 : 0;
  return [
    { box: [5, y, 5, 11, y + 7, 11], tone: 'glow' },
    { box: [6, y + 7, 6, 10, y + 9, 10], tone: 'metal' },
  ];
}

function chainBoxes(p: Props): ShapeBox[] {
  if (p.axis === 'x') return one([0, 7, 7, 16, 9, 9], 'metal');
  if (p.axis === 'z') return one([7, 7, 0, 9, 9, 16], 'metal');
  return one([7, 0, 7, 9, 16, 9], 'metal');
}

const CANDLE_BOXES: Record<string, Box> = {
  '1': [7, 0, 7, 9, 6, 9],
  '2': [5, 0, 6, 11, 6, 9],
  '3': [5, 0, 6, 10, 6, 11],
  '4': [5, 0, 5, 11, 6, 10],
};

function candleBoxes(p: Props): ShapeBox[] {
  const body = CANDLE_BOXES[p.candles ?? '1'] ?? CANDLE_BOXES['1']!;
  const out: ShapeBox[] = [{ box: body }];
  if (p.lit === 'true') out.push({ box: [7, 6, 7, 9, 8, 9], tone: 'fire' });
  return out;
}

/** Orients a box designed for facing=up (base at y=0, tip at y=16) to another facing. */
function orientUp(box: Box, facing: string | undefined): Box {
  const [x0, y0, z0, x1, y1, z1] = box;
  switch (facing) {
    case 'down':
      return [x0, 16 - y1, z0, x1, 16 - y0, z1];
    case 'north':
    case 'east':
    case 'south':
    case 'west':
      // Pointing north: the base lies on the south face.
      return toward(facing, [x0, z0, 16 - y1, x1, z1, 16 - y0]);
    default:
      return box;
  }
}

/** End rod: wide base plate, thin rod (vanilla model). */
function endRodBoxes(p: Props): ShapeBox[] {
  return [
    { box: orientUp([6, 0, 6, 10, 1, 10], p.facing), tone: 'glow' },
    { box: orientUp([7, 1, 7, 9, 16, 9], p.facing), tone: 'glow' },
  ];
}

/** Lightning rod: thin rod with a thicker tip (vanilla model). */
function lightningRodBoxes(p: Props): ShapeBox[] {
  return [
    { box: orientUp([7, 0, 7, 9, 12, 9], p.facing), tone: 'metal' },
    { box: orientUp([6, 12, 6, 10, 16, 10], p.facing) },
  ];
}

function buttonBoxes(p: Props): ShapeBox[] {
  const facing = horizontal(p.facing);
  const alongX = facing === 'north' || facing === 'south';
  if (p.face === 'floor') return one(alongX ? [5, 0, 6, 11, 2, 10] : [6, 0, 5, 10, 2, 11]);
  if (p.face === 'ceiling') return one(alongX ? [5, 14, 6, 11, 16, 10] : [6, 14, 5, 10, 16, 11]);
  // Wall button: attached to the block behind it (opposite of facing).
  return one(toward(oppositeHorizontal(facing), [5, 6, 0, 11, 10, 2]));
}

function vineBoxes(p: Props): ShapeBox[] {
  const out: ShapeBox[] = [];
  for (const dir of ['north', 'east', 'south', 'west'] as const) {
    if (p[dir] === 'true') out.push({ box: toward(dir, [0, 0, 0, 16, 16, 1]), tone: 'plant' });
  }
  if (p.up === 'true') out.push({ box: [0, 15, 0, 16, 16, 16], tone: 'plant' });
  return out;
}

const cube: ShapeSpec = { properties: {}, defaults: {}, boxes: () => one(FULL), fullCube: true };

export const SHAPES: Readonly<Record<ShapeClass, ShapeSpec>> = {
  cube,
  pillar: { properties: { axis: AXIS }, defaults: { axis: 'y' }, boxes: () => one(FULL), fullCube: true },
  facing_cube: { properties: { facing: FACING4 }, defaults: { facing: 'north' }, boxes: () => one(FULL), fullCube: true },
  barrel: {
    properties: { facing: FACING6, open: BOOL },
    defaults: { facing: 'north', open: 'false' },
    boxes: () => one(FULL),
    fullCube: true,
  },
  bulb: {
    properties: { lit: BOOL, powered: BOOL },
    defaults: { lit: 'false', powered: 'false' },
    boxes: () => one(FULL, 'glow'),
    fullCube: true,
  },
  grate: { properties: { waterlogged: BOOL }, defaults: { waterlogged: 'false' }, boxes: () => one(FULL), fullCube: true },
  grass_block: { properties: { snowy: BOOL }, defaults: { snowy: 'false' }, boxes: () => one(FULL), fullCube: true },
  path: { properties: {}, defaults: {}, boxes: () => one([0, 0, 0, 16, 15, 16]) },
  stairs: {
    properties: { facing: FACING4, half: ['top', 'bottom'], shape: ['straight', 'inner_left', 'inner_right', 'outer_left', 'outer_right'], waterlogged: BOOL },
    defaults: { facing: 'north', half: 'bottom', shape: 'straight', waterlogged: 'false' },
    boxes: stairsBoxes,
  },
  slab: {
    properties: { type: ['top', 'bottom', 'double'], waterlogged: BOOL },
    defaults: { type: 'bottom', waterlogged: 'false' },
    boxes: (p) => one(p.type === 'double' ? FULL : p.type === 'top' ? [0, 8, 0, 16, 16, 16] : [0, 0, 0, 16, 8, 16]),
  },
  fence: {
    properties: { east: BOOL, north: BOOL, south: BOOL, waterlogged: BOOL, west: BOOL },
    defaults: { east: 'false', north: 'false', south: 'false', waterlogged: 'false', west: 'false' },
    boxes: fenceBoxes,
  },
  fence_gate: {
    properties: { facing: FACING4, in_wall: BOOL, open: BOOL, powered: BOOL },
    defaults: { facing: 'north', in_wall: 'false', open: 'false', powered: 'false' },
    boxes: gateBoxes,
  },
  wall: {
    properties: { east: WALL_SIDE, north: WALL_SIDE, south: WALL_SIDE, up: BOOL, waterlogged: BOOL, west: WALL_SIDE },
    defaults: { east: 'none', north: 'none', south: 'none', up: 'true', waterlogged: 'false', west: 'none' },
    boxes: wallBoxes,
  },
  pane: {
    properties: { east: BOOL, north: BOOL, south: BOOL, waterlogged: BOOL, west: BOOL },
    defaults: { east: 'false', north: 'false', south: 'false', waterlogged: 'false', west: 'false' },
    boxes: paneBoxes,
  },
  trapdoor: {
    properties: { facing: FACING4, half: ['top', 'bottom'], open: BOOL, powered: BOOL, waterlogged: BOOL },
    defaults: { facing: 'north', half: 'bottom', open: 'false', powered: 'false', waterlogged: 'false' },
    boxes: trapdoorBoxes,
  },
  door: {
    properties: { facing: FACING4, half: ['upper', 'lower'], hinge: ['left', 'right'], open: BOOL, powered: BOOL },
    defaults: { facing: 'north', half: 'lower', hinge: 'left', open: 'false', powered: 'false' },
    boxes: doorBoxes,
  },
  lantern: {
    properties: { hanging: BOOL, waterlogged: BOOL },
    defaults: { hanging: 'false', waterlogged: 'false' },
    boxes: lanternBoxes,
  },
  chain: { properties: { axis: AXIS, waterlogged: BOOL }, defaults: { axis: 'y', waterlogged: 'false' }, boxes: chainBoxes },
  candle: {
    properties: { candles: ['1', '2', '3', '4'], lit: BOOL, waterlogged: BOOL },
    defaults: { candles: '1', lit: 'false', waterlogged: 'false' },
    boxes: candleBoxes,
  },
  leaves: {
    properties: { distance: ['1', '2', '3', '4', '5', '6', '7'], persistent: BOOL, waterlogged: BOOL },
    // persistent=true keeps placed leaves from decaying (vanilla default is false).
    defaults: { distance: '7', persistent: 'true', waterlogged: 'false' },
    boxes: () => one(FULL, 'plant'),
    supportBoxes: () => [],
  },
  potted: {
    properties: {},
    defaults: {},
    boxes: () => [{ box: [5, 0, 5, 11, 6, 11], tone: 'dark' }, { box: [6, 6, 6, 10, 13, 10], tone: 'plant' }],
  },
  plant: { properties: {}, defaults: {}, boxes: () => one([3, 0, 3, 13, 13, 13], 'plant') },
  sapling: { properties: { stage: ['0', '1'] }, defaults: { stage: '0' }, boxes: () => one([3, 0, 3, 13, 13, 13], 'plant') },
  tall_plant: {
    properties: { half: ['upper', 'lower'] },
    defaults: { half: 'lower' },
    boxes: (p) => one(p.half === 'lower' ? [2, 0, 2, 14, 16, 14] : [2, 0, 2, 14, 14, 14], 'plant'),
  },
  carpet: { properties: {}, defaults: {}, boxes: () => one([0, 0, 0, 16, 1, 16]) },
  button: {
    properties: { face: ['floor', 'wall', 'ceiling'], facing: FACING4, powered: BOOL },
    defaults: { face: 'wall', facing: 'north', powered: 'false' },
    boxes: buttonBoxes,
  },
  campfire: {
    properties: { facing: FACING4, lit: BOOL, signal_fire: BOOL, waterlogged: BOOL },
    defaults: { facing: 'north', lit: 'true', signal_fire: 'false', waterlogged: 'false' },
    boxes: (p) =>
      p.lit === 'true'
        ? [{ box: [0, 0, 0, 16, 4, 16], tone: 'dark' }, { box: [3, 4, 3, 13, 7, 13], tone: 'fire' }]
        : one([0, 0, 0, 16, 7, 16], 'dark'),
  },
  end_rod: { properties: { facing: FACING6 }, defaults: { facing: 'up' }, boxes: endRodBoxes },
  lightning_rod: {
    properties: { facing: FACING6, powered: BOOL, waterlogged: BOOL },
    defaults: { facing: 'up', powered: 'false', waterlogged: 'false' },
    boxes: lightningRodBoxes,
  },
  snow_layer: {
    properties: { layers: ['1', '2', '3', '4', '5', '6', '7', '8'] },
    defaults: { layers: '1' },
    boxes: (p) => one([0, 0, 0, 16, 2 * Number(p.layers ?? '1'), 16]),
  },
  rail: {
    properties: {
      shape: ['north_south', 'east_west', 'ascending_east', 'ascending_west', 'ascending_north', 'ascending_south', 'south_east', 'south_west', 'north_west', 'north_east'],
      waterlogged: BOOL,
    },
    defaults: { shape: 'north_south', waterlogged: 'false' },
    boxes: () => one([0, 0, 0, 16, 1, 16], 'metal'),
  },
  petals: {
    properties: { facing: FACING4, flower_amount: ['1', '2', '3', '4'] },
    defaults: { facing: 'north', flower_amount: '1' },
    boxes: () => one([0, 0, 0, 16, 3, 16], 'plant'),
  },
  ladder: {
    properties: { facing: FACING4, waterlogged: BOOL },
    defaults: { facing: 'north', waterlogged: 'false' },
    // Like a closed door: the rungs lie on the side opposite to facing, against the wall.
    boxes: (p) => one(toward(oppositeHorizontal(horizontal(p.facing)), [0, 0, 0, 16, 16, 3])),
    supportBoxes: () => [],
  },
  vine: {
    properties: { east: BOOL, north: BOOL, south: BOOL, up: BOOL, west: BOOL },
    defaults: { east: 'false', north: 'false', south: 'false', up: 'false', west: 'false' },
    boxes: vineBoxes,
    supportBoxes: () => [],
  },
};

export function shapeBoxes(shape: ShapeClass, props: Props): readonly ShapeBox[] {
  return SHAPES[shape].boxes(props);
}

export function supportBoxes(shape: ShapeClass, props: Props): readonly Box[] {
  const spec = SHAPES[shape];
  return spec.supportBoxes ? spec.supportBoxes(props) : spec.boxes(props).map((b) => b.box);
}
