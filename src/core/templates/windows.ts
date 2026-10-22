import { roundArch, type Arch } from '@/core/geometry';
import type { Form } from '@/core/style/materials';
import type { StyleId } from '@/core/style/styles';
import type { FacadeTemplate, TemplateCell, TemplateRole } from '@/core/templates/types';

/**
 * Window templates W01–W18 (research notes fenster_tueren_details.md, section 2) as data.
 *
 * Conventions (types.ts): canonical facade faces south, x = right seen from outside,
 * y = 0 bottom row of the opening, d = 0 wall plane, +1/+2 outside, −1 inside. Glass always
 * sits in the wall plane d = 0; depth comes from frames, sills, hoods, shutters and arches in
 * d = +1 (glass is recessed behind them), because the house walls are one block thick and
 * glass at d = −1 would stand loose in the room.
 *
 * Variants of a canonical template (other sizes) share its id prefix ("W03b") and its styles.
 */

type Props = Readonly<Record<string, string>>;
/** Nested cell lists (flattened by `flat`). */
export type Cells = TemplateCell | readonly Cells[];

// ---------------------------------------------------------------------------------------------
// Cell helpers (shared with doors.ts)

export function cell(x: number, y: number, d: number, role: TemplateRole, form?: Form, props?: Props): TemplateCell {
  return { x, y, d, role, ...(form ? { form } : {}), ...(props ? { props } : {}) };
}

/** Fixed decorative block (pots, flowers, lanterns, chains, candles, leaves, snow). */
export function fixed(x: number, y: number, d: number, block: string, props?: Props, role: TemplateRole = 'accent'): TemplateCell {
  return { x, y, d, role, block, ...(props ? { props } : {}) };
}

/** Forced air (door clearance, bay interior). */
export function air(x: number, y: number, d: number): TemplateCell {
  return { x, y, d, role: 'air' };
}

/** Inclusive integer range. */
export function span(from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = from; i <= to; i++) out.push(i);
  return out;
}

export function flat(...parts: Cells[]): TemplateCell[] {
  const out: TemplateCell[] = [];
  const walk = (c: Cells) => {
    if (Array.isArray(c)) for (const inner of c as readonly Cells[]) walk(inner);
    else out.push(c as TemplateCell);
  };
  for (const p of parts) walk(p);
  return out;
}

/** Vertical frame member (log axis y; concrete frames fall back to the plain block). */
export const post = (x: number, y: number, d = 0, role: TemplateRole = 'frame') => cell(x, y, d, role, 'pillar', { axis: 'y' });
/** Horizontal frame member along the facade (log axis x, rotated with the facade). */
export const beam = (x: number, y: number, d = 0, role: TemplateRole = 'frame') => cell(x, y, d, role, 'pillar', { axis: 'x' });
export const pane = (x: number, y: number, d = 0) => cell(x, y, d, 'glass', 'pane');
export const glassBlock = (x: number, y: number, d = 0) => cell(x, y, d, 'glass', 'block');
/** Full block of a role. */
export const solid = (x: number, y: number, d: number, role: TemplateRole) => cell(x, y, d, role, 'block');
/** Upside-down stairs with the full side against the wall (sill, console, bracket). */
export const sill = (x: number, y = -1, d = 1, role: TemplateRole = 'roofTrim') => cell(x, y, d, role, 'stairs', { facing: 'north', half: 'top' });
/** Upright stairs rising towards the wall (door step, small roof sloping outwards). */
export const step = (x: number, y = -1, d = 1, role: TemplateRole = 'plinth') => cell(x, y, d, role, 'stairs', { facing: 'north', half: 'bottom' });
export const slab = (x: number, y: number, d: number, role: TemplateRole, type: 'top' | 'bottom') => cell(x, y, d, role, 'slab', { type });
/** Arch / round-window corner: full side towards `side`, the open quarter points to the centre. */
export const corner = (x: number, y: number, d: number, role: TemplateRole, side: 'west' | 'east', half: 'top' | 'bottom') =>
  cell(x, y, d, role, 'stairs', { facing: side, half });
/**
 * Arch head from the geometry library (research notes "Bögen"): upside-down stairs where the
 * curve steps, solid cells above it, the 1-wide crown closed with a top slab (round) or left
 * open (pointed). `x0` shifts the arch's x = 0 to the template column.
 */
export function archHead(arch: Arch, x0: number, d: number, role: TemplateRole, crown: 'slab' | 'open'): TemplateCell[] {
  const cells = arch.cells.map((c) => (c.kind === 'stair' ? corner(x0 + c.x, c.y, d, role, c.side === 'left' ? 'west' : 'east', 'top') : solid(x0 + c.x, c.y, d, role)));
  if (arch.keystone && crown === 'slab') cells.push(slab(x0 + arch.keystone.x, arch.keystone.y, d, role, 'top'));
  return cells;
}

/** Open trapdoor lying flat on the wall in d (the leaf lies opposite to `facing`, i.e. north). */
export const shutter = (x: number, y: number, d: number, half: 'top' | 'bottom', role: TemplateRole = 'shutter') =>
  cell(x, y, d, role, 'trapdoor', { facing: 'south', half, open: 'true' });
/** Open trapdoor standing across the facade; the leaf lies on the side opposite to `facing`. */
export const sideBoard = (x: number, y: number, d: number, facing: 'west' | 'east', role: TemplateRole = 'shutter') =>
  cell(x, y, d, role, 'trapdoor', { facing, half: 'bottom', open: 'true' });
export const lantern = (x: number, y: number, d: number, hanging: boolean) => fixed(x, y, d, 'lantern', { hanging: String(hanging) });

/** Shutter halves: lower rows bottom, upper rows top, so the texture is mirrored in the middle. */
function shutterHalf(y: number, h: number): 'top' | 'bottom' {
  return y < h / 2 ? 'bottom' : 'top';
}

const panes = (w: number, h: number, d = 0) => span(0, w - 1).map((x) => span(0, h - 1).map((y) => pane(x, y, d)));
const glassBlocks = (w: number, h: number) => span(0, w - 1).map((x) => span(0, h - 1).map((y) => glassBlock(x, y)));
const sillRow = (x0: number, x1: number, y = -1, d = 1, role: TemplateRole = 'roofTrim') => span(x0, x1).map((x) => sill(x, y, d, role));
const shutters = (w: number, h: number) => span(0, h - 1).map((y) => [shutter(-1, y, 1, shutterHalf(y, h)), shutter(w, y, 1, shutterHalf(y, h))]);

// ---------------------------------------------------------------------------------------------
// Styles per canonical template (must match the windows lists in src/core/style/styles.ts).

const STYLES_OF: Readonly<Record<string, readonly StyleId[]>> = {
  W01: ['modern'],
  W02: ['medieval', 'rustic', 'nordic'],
  W03: ['rustic', 'nordic', 'cherry', 'medieval'],
  W04: ['medieval', 'rustic', 'mediterranean', 'nordic'],
  W05: ['fantasy', 'rustic', 'mediterranean', 'cherry'],
  W06: ['medieval', 'nordic'],
  W07: ['fantasy'],
  W08: ['fantasy'],
  W09: [],
  W10: [],
  W11: [],
  W12: [],
  W13: ['fantasy'],
  W14: [],
  W15: ['japanese', 'cherry'],
  W16: ['modern'],
  W17: ['mediterranean'],
  W18: [],
};

function stylesOf(id: string): readonly StyleId[] {
  return STYLES_OF[id.slice(0, 3)] ?? [];
}

function windowTemplate(id: string, label: string, width: number, height: number, cells: Cells[], note: string, spacing = 1): FacadeTemplate {
  return { id, kind: 'window', label, width, height, cells: flat(...cells), styles: stylesOf(id), spacing, note };
}

// ---------------------------------------------------------------------------------------------
// Template families (parameterised by opening size)

/** W01: punched window, frame posts beside the glass, thin slab ledges above and below in d=+1. */
function w01(id: string, w: number, h: number): FacadeTemplate {
  return windowTemplate(
    id,
    `Lochfenster mit Rahmen und Gesimsplatten (${w}×${h})`,
    w,
    h,
    [
      panes(w, h),
      span(0, h - 1).map((y) => [post(-1, y), post(w, y)]),
      span(-1, w).map((x) => [slab(x, -1, 1, 'frame', 'top'), slab(x, h, 1, 'frame', 'bottom')]),
    ],
    'Basis aus W01; Tiefe über Platten-Gesims oben und unten in d=+1 (Notizen: bündig = flach).',
  );
}

/** W02: tall window with stair sill, log lintel and slab hood. */
function w02(id: string, w: number, h: number): FacadeTemplate {
  return windowTemplate(
    id,
    `Hochfenster mit Sims und Sturz (${w}×${h})`,
    w,
    h,
    [panes(w, h), span(-1, w).map((x) => [beam(x, h), slab(x, h, 1, 'roofTrim', 'top')]), sillRow(-1, w)],
    'Nach W02; Sims und Sturz 1 Block breiter als die Öffnung, Sturzbalken zusätzlich in d=0.',
  );
}

/** W03: log frame in the wall plane, stair sill in front. */
function w03(id: string, w: number, h: number): FacadeTemplate {
  return windowTemplate(
    id,
    `Fenster mit Stammrahmen und Fensterbank (${w}×${h})`,
    w,
    h,
    [panes(w, h), span(-1, h).map((y) => [post(-1, y), post(w, y)]), span(0, w - 1).map((x) => [beam(x, -1), beam(x, h)]), sillRow(-1, w)],
    'Nach W03; Ecken als stehende Stämme (axis=y), Riegel liegend (axis=x).',
  );
}

/** W04: window with trapdoor shutters, sill and hood. */
function w04(id: string, w: number, h: number): FacadeTemplate {
  return windowTemplate(
    id,
    `Fenster mit Klappläden (${w}×${h})`,
    w,
    h,
    [panes(w, h), shutters(w, h), sillRow(-1, w), span(-1, w).map((x) => slab(x, h, 1, 'roofTrim', 'top'))],
    'Nach W04 Variante A: offene Falltür facing=south liegt an der Wand (Platte an der Nordkante); Läden stehen auf dem Sims.',
  );
}

/** Flower box below the window: moss soil, flowers, trapdoor cladding (front d=+2, sides d=+1). */
function flowerBox(w: number, flowers: readonly string[]): Cells[] {
  return [
    span(0, w - 1).map((x) => [
      fixed(x, -1, 1, 'moss_block'),
      fixed(x, 0, 1, flowers[x % flowers.length]!),
      shutter(x, -1, 2, 'bottom'),
    ]),
    sideBoard(-1, -1, 1, 'west'),
    sideBoard(w, -1, 1, 'east'),
  ];
}

function w05(id: string, w: number, h: number, withShutters: boolean, flowers: readonly string[]): FacadeTemplate {
  return windowTemplate(
    id,
    withShutters ? `Fenster mit Läden und Blumenkasten (${w}×${h})` : `Fenster mit Blumenkasten (${w}×${h})`,
    w,
    h,
    [panes(w, h), flowerBox(w, flowers), withShutters ? shutters(w, h) : [], span(-1, w).map((x) => slab(x, h, 1, 'roofTrim', 'top'))],
    'Nach W05 Variante B: Moosblock als Erde (Blumen brauchen #dirt), Falltür-Verkleidung vorn in d=+2 und seitlich; Blumen stehen vor der unteren Glasreihe.',
  );
}

/** W05b: pots on a stair sill beside the glass. */
function w05Pots(id: string): FacadeTemplate {
  return windowTemplate(
    id,
    'Fenster mit Blumentöpfen auf dem Sims (1×2)',
    1,
    2,
    [panes(1, 2), sillRow(-1, 1), fixed(-1, 0, 1, 'potted_red_tulip'), fixed(1, 0, 1, 'potted_azalea_bush'), span(-1, 1).map((x) => slab(x, 2, 1, 'roofTrim', 'top'))],
    'Nach W05 Variante A; Töpfe stehen neben der Scheibe auf der vollen Oberseite der Sims-Treppe.',
  );
}

/** W06: glass recessed behind a frame ring in d=+1 (posts, lintel, stair sill). */
function w06(id: string, w: number, h: number): FacadeTemplate {
  return windowTemplate(
    id,
    `Tiefe Laibung mit vorgesetztem Stammrahmen (${w}×${h})`,
    w,
    h,
    [panes(w, h), span(0, h - 1).map((y) => [post(-1, y, 1), post(w, y, 1)]), span(-1, w).map((x) => beam(x, h, 1)), sillRow(-1, w)],
    'Nach W06; untere Rahmenkante als Sims-Treppe statt Stamm, damit das Fenster eine Bank bekommt.',
  );
}

// ---------------------------------------------------------------------------------------------
// Templates

const W01 = w01('W01', 1, 2);
const W01b = w01('W01b', 2, 2);
const W01c = w01('W01c', 1, 1);

const W02 = w02('W02', 1, 2);
const W02b = w02('W02b', 1, 3);

const W03 = w03('W03', 2, 2);
const W03b = w03('W03b', 3, 2);
const W03c = w03('W03c', 1, 2);

const W04 = w04('W04', 1, 2);
const W04b = w04('W04b', 2, 2);

const W05 = w05('W05', 2, 2, false, ['red_tulip', 'oxeye_daisy']);
const W05b = w05Pots('W05b');
const W05c = w05('W05c', 2, 2, true, ['poppy', 'cornflower']);

const W06 = w06('W06', 2, 2);
const W06b = w06('W06b', 1, 2);

/** W07: pointed arch (two upside-down stairs) inside a log ring in d=+1, glass behind. */
const W07 = windowTemplate(
  'W07',
  'Spitzbogenfenster mit vorgesetztem Rahmen (2×3)',
  2,
  3,
  [
    panes(2, 3),
    span(0, 3).map((y) => [post(-1, y, 1), post(2, y, 1)]),
    span(0, 1).map((x) => beam(x, 3, 1)),
    corner(0, 2, 1, 'frame', 'west', 'top'),
    corner(1, 2, 1, 'frame', 'east', 'top'),
    sillRow(-1, 2),
  ],
  'Nach W07a; Bogen in d=+1 vor durchgehendem Glas, dadurch keine offenen Viertelecken in der Wand.',
);

/** W07b: round arch (stairs + top slab, from the arch library) over a 3-wide window. */
const W07b = windowTemplate(
  'W07b',
  'Rundbogenfenster mit vorgesetztem Rahmen (3×4)',
  3,
  4,
  [
    panes(3, 4),
    span(0, 4).map((y) => [post(-1, y, 1), post(3, y, 1)]),
    span(0, 2).map((x) => beam(x, 4, 1)),
    archHead(roundArch(3, { jamb: 2 }), 0, 1, 'frame', 'slab'),
    sillRow(-1, 3),
  ],
  'Nach W07b; Rahmen aus der Rahmenrolle statt fester Steinziegel, Bogen in d=+1.',
);

/** W08: round window: 3×3 glass blocks, ring of corner stairs and cardinal blocks in d=+1. */
const W08 = windowTemplate(
  'W08',
  'Rundfenster mit Rahmenring (3×3)',
  3,
  3,
  [
    glassBlocks(3, 3),
    corner(0, 2, 1, 'frame', 'west', 'top'),
    corner(2, 2, 1, 'frame', 'east', 'top'),
    corner(0, 0, 1, 'frame', 'west', 'bottom'),
    corner(2, 0, 1, 'frame', 'east', 'bottom'),
    beam(1, 3, 1),
    beam(1, -1, 1),
    post(-1, 1, 1),
    post(3, 1, 1),
  ],
  'Nach W08; Rundung als Ring in d=+1 vor einem vollen Glasblock-Quadrat (keine Luftspalte, Ring steht vor).',
);

/** W08b: 5×5 rosette, glass blocks with a yellow centre, ring of 12 corner cells + 4 keystones. */
const W08b = windowTemplate(
  'W08b',
  'Rosette mit Rahmenring (5×5)',
  5,
  5,
  [
    span(0, 4).map((x) => span(0, 4).map((y) => (x === 2 && y === 2 ? fixed(2, 2, 0, 'yellow_stained_glass', undefined, 'glass') : glassBlock(x, y)))),
    // Corners in d=+1: full block in the corner, a stair on each side of it.
    post(0, 4, 1),
    corner(1, 4, 1, 'frame', 'west', 'top'),
    corner(0, 3, 1, 'frame', 'west', 'top'),
    post(4, 4, 1),
    corner(3, 4, 1, 'frame', 'east', 'top'),
    corner(4, 3, 1, 'frame', 'east', 'top'),
    post(0, 0, 1),
    corner(1, 0, 1, 'frame', 'west', 'bottom'),
    corner(0, 1, 1, 'frame', 'west', 'bottom'),
    post(4, 0, 1),
    corner(3, 0, 1, 'frame', 'east', 'bottom'),
    corner(4, 1, 1, 'frame', 'east', 'bottom'),
    beam(2, 5, 1),
    beam(2, -1, 1),
    post(-1, 2, 1),
    post(5, 2, 1),
  ],
  'Nach W08 5×5; Zentrum gelbes Buntglas (fest), Rest Palettenglas; Ring in d=+1.',
);

/** W09: bay window 2 deep: side panes d=+1, front panes d=+2, floor, corbel and stepped roof. */
const W09 = windowTemplate(
  'W09',
  'Erkerfenster (3×2, 2 tief)',
  3,
  2,
  [
    span(0, 2).map((x) => span(0, 1).map((y) => [air(x, y, 0), air(x, y, 1), pane(x, y, 2)])),
    span(0, 1).map((y) => [pane(-1, y, 1), pane(3, y, 1)]),
    span(-1, 1).map((y) => [post(-1, y, 2), post(3, y, 2)]),
    span(-1, 3).map((x) => [solid(x, -1, 1, 'floor'), sill(x, -2, 1), solid(x, 2, 1, 'roof'), step(x, 2, 2, 'roof'), step(x, 3, 1, 'roof')]),
    span(0, 2).map((x) => solid(x, -1, 2, 'floor')),
  ],
  'Nach W09; Erkerboden y=-1, Konsole y=-2 (braucht 2 Zeilen Abstand zum Gelände), Dach aus Dachrolle.',
  2,
);

/** W10: dormer front: log cheeks, gable of roof stairs, overhang in d=+1, one body row in d=−1. */
const W10 = windowTemplate(
  'W10',
  'Gaubenfenster (1×2)',
  1,
  2,
  [
    panes(1, 2),
    span(0, 1).map((y) => [post(-1, y), post(1, y), solid(-1, y, -1, 'upperWall'), solid(1, y, -1, 'upperWall'), air(0, y, -1)]),
    [-1, 0, 1].map((d) => [
      corner(-1, 2, d, 'roof', 'east', 'bottom'),
      d === 0 ? solid(0, 2, 0, 'upperWall') : solid(0, 2, d, 'roof'),
      corner(1, 2, d, 'roof', 'west', 'bottom'),
      slab(0, 3, d, 'roof', 'bottom'),
    ]),
  ],
  'Nach W10; nur Stirn, Überstand d=+1 und eine Körperreihe d=-1. Der Assembler verlängert Wangen und Gaubendach bis zur Dachfläche und entfernt dort die Hauptdach-Treppen.',
  2,
);

/** W11: plus-shaped oculus, frame ring hugging the plus in d=+1. */
const W11 = windowTemplate(
  'W11',
  'Giebel-Okulus in Kreuzform (3×3)',
  3,
  3,
  [
    [pane(1, 0), pane(0, 1), pane(1, 1), pane(2, 1), pane(1, 2)],
    [0, 2].map((x) => [0, 2].map((y) => [post(x, y), post(x, y, 1)])),
    beam(1, 3, 1),
    beam(1, -1, 1),
    post(-1, 1, 1),
    post(3, 1, 1),
  ],
  'Nach W11; Eckblöcke in d=0 aus der Rahmenrolle, damit jede Scheibe seitlich eine volle Fläche hat; Ring in d=+1.',
);

/** W12: shop window over a panelled parapet, log posts and lintel, awning with two lanterns. */
const W12 = windowTemplate(
  'W12',
  'Schaufenster mit Brüstung und Markise (4×2)',
  4,
  2,
  [
    panes(4, 2),
    span(0, 3).map((x) => [solid(x, -1, 0, 'wall'), shutter(x, -1, 1, 'bottom')]),
    span(-1, 1).map((y) => [post(-1, y), post(4, y)]),
    span(-1, 4).map((x) => [beam(x, 2), step(x, 3, 1, 'roof')]),
    lantern(-1, 2, 1, true),
    lantern(4, 2, 1, true),
  ],
  'Nach W12 (Höhen nach der Textregel: Glas y=0..1, Brüstung y=-1); Laternen hängen unter der Markisen-Treppe (volle Unterseite).',
);

/** W13: leaded church window: coloured panes, iron-bar mullion, segmental arch in d=+1. */
const LEADED: readonly string[] = ['blue_stained_glass_pane', 'red_stained_glass_pane', 'blue_stained_glass_pane', 'red_stained_glass_pane', 'yellow_stained_glass_pane'];
const W13 = windowTemplate(
  'W13',
  'Bleiglasfenster mit Gittersprosse (3×5)',
  3,
  5,
  [
    span(0, 4).map((y) => [fixed(0, y, 0, LEADED[y]!, undefined, 'glass'), fixed(1, y, 0, 'iron_bars', undefined, 'frame'), fixed(2, y, 0, LEADED[y]!, undefined, 'glass')]),
    span(0, 5).map((y) => [post(-1, y, 1), post(3, y, 1)]),
    span(0, 2).map((x) => beam(x, 5, 1)),
    corner(0, 4, 1, 'frame', 'west', 'top'),
    corner(2, 4, 1, 'frame', 'east', 'top'),
    sillRow(-1, 3),
  ],
  'Nach W13; Farben fest (blau/rot, oben gelb), Eisengitter als Mittelsprosse verbindet sich mit den Scheiben.',
);

/** W14: cross-shaped arrow slit with a stone dressing hugging the cross in d=+1. */
const SLIT_DRESSING: readonly (readonly [number, number])[] = [
  [-1, 0],
  [1, 0],
  [-1, 2],
  [1, 2],
  [0, 3],
  [0, -1],
  [-2, 1],
  [2, 1],
];
const W14 = windowTemplate(
  'W14',
  'Kreuzförmige Schießscharte (1×3)',
  1,
  3,
  [
    [pane(0, 0), pane(0, 1), pane(0, 2), pane(-1, 1), pane(1, 1)],
    SLIT_DRESSING.map(([x, y]) => solid(x, y, 1, 'plinth')),
  ],
  'Abweichend von W14 verglast (Fenster brauchen Glas); Kreuzform mit Steineinfassung aus der Sockelrolle in d=+1.',
);

/** Shoji: dark frame in d=0, white glass, engawa ledge, small roof above; optional fence lattice. */
function w15(id: string, w: number, h: number, lattice: boolean, mullion: number | null): FacadeTemplate {
  return windowTemplate(
    id,
    `Shoji-Fenster${lattice ? ' mit Holzgitter' : ''} (${w}×${h})`,
    w,
    h,
    [
      span(0, w - 1).map((x) => span(0, h - 1).map((y) => (x === mullion ? post(x, y) : pane(x, y)))),
      span(0, h - 1).map((y) => [post(-1, y), post(w, y)]),
      span(-1, w).map((x) => [beam(x, -1), beam(x, h), slab(x, -1, 1, 'frame', 'top'), step(x, h, 1, 'roof')]),
      lattice ? span(0, w - 1).map((x) => span(0, h - 1).map((y) => cell(x, y, 1, 'frame', 'fence'))) : [],
    ],
    'Nach W15; Engawa-Kante (Platte oben) in d=+1, kleines Vordach (Kirayoke) aus der Dachrolle vor dem Sturz. Das Gitter aus Rahmen-Zäunen braucht Holz als Rahmen (Beton hat keinen Zaun).',
  );
}

const W15 = w15('W15', 3, 2, true, null);
const W15b = w15('W15b', 5, 2, true, 2);
const W15c = w15('W15c', 2, 2, false, null);

/** W16: modern band window, frame box in d=+1 around glass in d=0. */
function w16(id: string, w: number, h: number): FacadeTemplate {
  return windowTemplate(
    id,
    `Modernes Bandfenster mit Rahmenbox (${w}×${h})`,
    w,
    h,
    [panes(w, h), span(-1, w).map((x) => [beam(x, -1, 1), beam(x, h, 1)]), span(0, h - 1).map((y) => [post(-1, y, 1), post(w, y, 1)])],
    'Nach W16; Box aus der Rahmenrolle (Beton), Glas 1 Block zurückgesetzt.',
  );
}

const W16 = w16('W16', 5, 2);
const W16b = w16('W16b', 3, 2);
const W16c = w16('W16c', 7, 2);
const W16d = w16('W16d', 3, 3);

/** W17: arch of wall-coloured stairs in d=+1 between the shutters, sill, iron-bar rail with pots. */
const W17 = windowTemplate(
  'W17',
  'Mediterranes Bogenfenster mit Läden und Ziergitter (2×3)',
  2,
  3,
  [
    glassBlocks(2, 3),
    corner(0, 2, 1, 'wall', 'west', 'top'),
    corner(1, 2, 1, 'wall', 'east', 'top'),
    shutters(2, 3),
    sillRow(-1, 2),
    span(0, 1).map((x) => [fixed(x, 0, 1, 'iron_bars', undefined, 'frame'), fixed(x, 1, 1, 'potted_red_tulip')]),
  ],
  'Nach W17; Glasblöcke statt Scheiben, damit das Gitter davor sich nur mit dem Glas verbindet (keine Glasstummel). Bogen aus Wandmaterial in d=+1 vor durchgehendem Glas statt in der Wandebene (dort blieben offene Viertelecken als Löcher).',
);

/** W17b: round arch 3 wide with an open crown (arch library), shutters, pots on the sill. */
const W17b = windowTemplate(
  'W17b',
  'Mediterranes Segmentbogenfenster mit Läden (3×3)',
  3,
  3,
  [
    glassBlocks(3, 3),
    archHead(roundArch(3, { jamb: 1 }), 0, 1, 'wall', 'open'),
    shutters(3, 3),
    sillRow(-1, 3),
    fixed(0, 0, 1, 'potted_red_tulip'),
    fixed(2, 0, 1, 'potted_red_tulip'),
  ],
  'Nach W17/W07b; Bogenecken aus Wandmaterial in d=+1 vor dem Glas, Töpfe auf dem Sims.',
);

/** W18: winter window: shutters, candles on the sill, spruce garland with snow on top. */
const W18 = windowTemplate(
  'W18',
  'Winterfenster mit Girlande und Kerzen (1×2)',
  1,
  2,
  [
    panes(1, 2),
    shutters(1, 2),
    sillRow(-1, 1),
    fixed(0, 0, 1, 'red_candle', { candles: '3', lit: 'true' }),
    span(-2, 2).map((x) => fixed(x, 2, 1, 'spruce_leaves')),
    span(-1, 1).map((x) => fixed(x, 3, 1, 'snow', { layers: '1' })),
  ],
  'Nach W18; Kerzen auf der vollen Oberseite der Sims-Treppe, Schnee auf dem Laub (volle Kollisionsfläche), keine Laterne (Schmelzen).',
);

export const WINDOW_TEMPLATES: readonly FacadeTemplate[] = [
  W01,
  W01b,
  W01c,
  W02,
  W02b,
  W03,
  W03b,
  W03c,
  W04,
  W04b,
  W05,
  W05b,
  W05c,
  W06,
  W06b,
  W07,
  W07b,
  W08,
  W08b,
  W09,
  W10,
  W11,
  W12,
  W13,
  W14,
  W15,
  W15b,
  W15c,
  W16,
  W16b,
  W16c,
  W16d,
  W17,
  W17b,
  W18,
];
