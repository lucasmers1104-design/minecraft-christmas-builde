import type { StyleId } from '@/core/style/styles';
import type { FacadeTemplate, TemplateCell } from '@/core/templates/types';
import { roundArch } from '@/core/geometry';
import { air, archHead, beam, cell, corner, fixed, flat, lantern, pane, post, sill, slab, solid, span, step, type Cells } from '@/core/templates/windows';

/**
 * Door and entrance templates T01–T10 (research notes fenster_tueren_details.md, section 3) as
 * data, same conventions as the windows (canonical south facade, d = 0 wall plane).
 *
 * Every door:
 * - places only the LOWER door half (the resolver adds the upper half into the forced-air cell
 *   above), `facing=south`: the closed leaf lies at the inner edge of the wall, so seen from
 *   outside the door sits 13/16 block deep in its reveal ("Facing-Trick" of the notes);
 * - stands on a full plinth block (d = 0, y = −1) — vanilla breaks a door without a full block
 *   below;
 * - keeps rows 0..1 free in front (d = +1) and behind (d = −1) the leaf;
 * - single doors hinge on the left seen from outside (`hinge=right` for facing south), double
 *   doors hinge on the outer sides (left leaf `right`, right leaf `left`).
 */

const STYLES_OF: Readonly<Record<string, readonly StyleId[]>> = {
  T01: ['medieval', 'rustic', 'nordic', 'cherry', 'modern'],
  T02: ['medieval', 'fantasy', 'rustic'],
  T03: ['medieval'],
  T04: ['fantasy', 'mediterranean'],
  T05: ['rustic', 'mediterranean'],
  T06: ['rustic', 'nordic'],
  T07: [],
  T08: [],
  T09: ['japanese', 'cherry'],
  T10: [],
};

function doorTemplate(id: string, label: string, width: number, cells: Cells[], note: string, spacing = 1): FacadeTemplate {
  return { id, kind: 'door', label, width, height: 2, cells: flat(...cells), styles: STYLES_OF[id.slice(0, 3)] ?? [], spacing, note };
}

const door = (x: number, hinge: 'left' | 'right'): TemplateCell => cell(x, 0, 0, 'door', 'door', { half: 'lower', facing: 'south', hinge, open: 'false' });

/** Door leaves, plinth row below (incl. jambs), free upper-half cell and clearance in front and inside. */
function doorway(w: number): Cells[] {
  const hinge = (x: number) => (w > 1 && x === w - 1 ? 'left' : 'right');
  return [
    span(0, w - 1).map((x) => [door(x, hinge(x)), air(x, 1, 0), air(x, 0, 1), air(x, 1, 1), air(x, 0, -1), air(x, 1, -1)]),
    span(-1, w).map((x) => solid(x, -1, 0, 'plinth')),
  ];
}

/** Log posts beside the door up to `top - 1` and a lintel beam in row `top` (all in d = 0). */
function frame(w: number, top: number): Cells[] {
  return [span(0, top - 1).map((y) => [post(-1, y), post(w, y)]), span(-1, w).map((x) => beam(x, top))];
}

const steps = (x0: number, x1: number, d = 1) => span(x0, x1).map((x) => step(x, -1, d));

/**
 * Fallback entrance when no template fits (tight eaves, posts): only the door leaf, the plinth row
 * below it and the clearance – never a house without a door. Not part of the catalogue.
 */
export const FALLBACK_DOOR: FacadeTemplate = doorTemplate('T00', 'Schlichte Tür (Rückfall)', 1, [doorway(1)], 'Rückfall, wenn keine Türvorlage an die Fassade passt.');

// ---------------------------------------------------------------------------------------------

/** T01: frame, slab hood in d=+1 with two lanterns hanging under its ends, step. */
function t01(id: string, w: number): FacadeTemplate {
  return doorTemplate(
    id,
    w === 1 ? 'Haustür mit Rahmen, Vordachplatte und Laternen' : 'Doppeltür mit Rahmen, Vordachplatte und Laternen',
    w,
    [
      doorway(w),
      frame(w, 2),
      steps(0, w - 1),
      span(-1, w).map((x) => slab(x, 2, 1, 'frame', 'bottom')),
      lantern(-1, 1, 1, true),
      lantern(w, 1, 1, true),
    ],
    'Nach T01; zusätzlich Vordachplatte (untere Platte: volle Unterseite trägt die Hängelaternen) vor dem Sturz. Stufe setzt Gelände 1 Block unter dem Türboden voraus.',
  );
}

const T01 = t01('T01', 1);
const T01b = t01('T01b', 2);

/** T02: transom pane above the door, fence wall arms with hanging lanterns, slab hood. */
const T02 = doorTemplate(
  'T02',
  'Tür mit Oberlicht und Wandlaternen',
  1,
  [
    doorway(1),
    frame(1, 3),
    pane(0, 2),
    steps(0, 0),
    [-1, 1].map((x) => [cell(x, 2, 1, 'frame', 'fence'), lantern(x, 1, 1, true)]),
    span(-1, 1).map((x) => slab(x, 3, 1, 'roofTrim', 'top')),
  ],
  'Nach T02; Wandarm = Zaun der Rahmenrolle (verbindet sich mit dem Pfosten), braucht Holz als Rahmen.',
);

/** T03: double door, pointed arch and stone jambs in d=+1, glazed fanlight behind the arch, chain lanterns. */
const T03 = doorTemplate(
  'T03',
  'Doppeltür im Spitzbogenportal mit Oberlicht',
  2,
  [
    doorway(2),
    span(0, 2).map((y) => [solid(-1, y, 0, 'plinth'), solid(2, y, 0, 'plinth')]),
    [pane(0, 2), pane(1, 2)],
    span(-1, 3).map((y) => [solid(-1, y, 1, 'plinth'), solid(2, y, 1, 'plinth')]),
    [solid(0, 3, 1, 'plinth'), solid(1, 3, 1, 'plinth')],
    corner(0, 2, 1, 'plinth', 'west', 'top'),
    corner(1, 2, 1, 'plinth', 'east', 'top'),
    steps(0, 1),
    [-2, 3].map((x) => [cell(x, 3, 1, 'plinth', 'wall'), fixed(x, 2, 1, 'iron_chain', { axis: 'y' }), lantern(x, 1, 1, true)]),
  ],
  'Nach T03; Bogen in d=+1 statt in der Wandebene (keine Löcher über der Tür), dahinter Oberlicht-Scheiben. Laternen an Ketten unter Mauer-Konsolen (Mauerpfosten trägt die Kette).',
);

/** T04: round-arched niche (ring, arch, threshold in d=+1) with two standing lanterns beside the door. */
const T04 = doorTemplate(
  'T04',
  'Rundbogen-Portalnische mit Laternen',
  1,
  [
    doorway(1),
    span(-1, 3).map((y) => [solid(-2, y, 1, 'roofTrim'), solid(2, y, 1, 'roofTrim')]),
    span(-1, 1).map((x) => [solid(x, 3, 1, 'roofTrim'), solid(x, -1, 1, 'roofTrim')]),
    archHead(roundArch(3, { jamb: 1 }), -1, 1, 'roofTrim', 'slab'),
    [-1, 1].map((x) => [lantern(x, 0, 1, false), air(x, 1, 1)]),
    steps(-1, 1, 2),
    [air(0, 0, 2), air(0, 1, 2)],
  ],
  'Nach T04, aber Einzeltür in 3 breiter Nische, damit ein echter Rundbogen (Treppe–Platte–Treppe) entsteht; Laternen stehen auf der Schwelle.',
);

/** T05: trapdoor awning on stair consoles, lanterns under its ends. */
const T05 = doorTemplate(
  'T05',
  'Tür mit Falltür-Vordach',
  1,
  [
    doorway(1),
    frame(1, 2),
    steps(0, 0),
    span(-2, 2).map((x) => cell(x, 2, 1, 'shutter', 'trapdoor', { facing: 'south', half: 'bottom', open: 'false' })),
    [sill(-1, 1, 1), sill(1, 1, 1)],
    [lantern(-2, 1, 1, true), lantern(2, 1, 1, true)],
  ],
  'Nach T05a; geschlossene untere Falltüren tragen Hängelaternen (volle Unterseite).',
);

/** T05b: slab canopy two blocks deep on stair brackets, lanterns at the front corners. */
const T05b = doorTemplate(
  'T05b',
  'Tür mit Plattenvordach',
  1,
  [
    doorway(1),
    frame(1, 2),
    steps(0, 0),
    span(-1, 1).map((x) => [slab(x, 2, 1, 'roof', 'bottom'), slab(x, 2, 2, 'roof', 'bottom')]),
    [sill(-1, 1, 1), sill(1, 1, 1)],
    [lantern(-1, 1, 2, true), lantern(1, 1, 2, true)],
    [air(0, 0, 2), air(0, 1, 2)],
  ],
  'Nach T05b ohne Volant (eine offene Falltür in d=+2 würde den Laufweg versperren).',
);

/** T06: porch 5 wide × 2 deep: plank floor, log columns, fence railings, slab roof, lanterns, step. */
const T06 = doorTemplate(
  'T06',
  'Veranda mit Säulen, Geländer und Stufe',
  1,
  [
    doorway(1),
    frame(1, 2),
    span(-2, 2).map((x) => [solid(x, -1, 1, 'floor'), solid(x, -1, 2, 'floor'), slab(x, 2, 1, 'roof', 'bottom'), slab(x, 2, 2, 'roof', 'bottom')]),
    [-2, 2].map((x) => [post(x, 0, 2), post(x, 1, 2), cell(x, 0, 1, 'frame', 'fence')]),
    [-1, 1].map((x) => [cell(x, 0, 2, 'frame', 'fence'), lantern(x, 1, 1, true), air(x, 0, 1)]),
    [air(0, 0, 2), air(0, 1, 2), air(0, 0, 3), air(0, 1, 3)],
    step(0, -1, 3, 'floor'),
  ],
  'Nach T06; Geländer aus Rahmen-Zäunen (braucht Holz als Rahmen), Laternen hängen unter dem Plattendach.',
  2,
);

/** T07: raised entrance: platform, two steps, filled cheeks with a low wall and lanterns. */
const T07 = doorTemplate(
  'T07',
  'Erhöhter Eingang mit Stufen und Wangen',
  1,
  [
    doorway(1),
    frame(1, 2),
    span(-1, 1).map((x) => [solid(x, -1, 1, 'plinth'), solid(x, -2, 1, 'plinth'), solid(x, -2, 2, 'plinth')]),
    [-1, 1].map((x) => [solid(x, -1, 2, 'plinth'), solid(x, -2, 3, 'plinth'), cell(x, 0, 1, 'plinth', 'wall'), cell(x, 0, 2, 'plinth', 'wall'), lantern(x, 1, 2, false)]),
    step(0, -1, 2),
    step(0, -2, 3),
    [air(0, 0, 2), air(0, 1, 2), air(0, -1, 3)],
  ],
  'Nach T07; für Häuser mit 2 Block hohem Sockel (Gelände-Oberkante 2 unter dem Türboden). Laternen stehen auf den vorderen Mauerpfosten.',
);

/** T08: door with a path of stepping slabs and two lamp posts beside it. */
const T08 = doorTemplate(
  'T08',
  'Tür mit Plattenweg und Laternenpfosten',
  1,
  [
    doorway(1),
    frame(1, 2),
    steps(0, 0),
    span(2, 4).map((d) => [slab(0, -1, d, 'path', 'bottom'), air(0, 0, d), air(0, 1, d)]),
    [-1, 1].map((x) => [cell(x, -1, 3, 'plinth', 'wall'), cell(x, 0, 3, 'plinth', 'wall'), lantern(x, 1, 3, false)]),
  ],
  'Nach T08; Trittplatten auf dem Gelände statt eingelassener Wegblöcke (Zellen in d≥1 dürfen kein Gelände ersetzen, sonst schlägt templateFits fehl), Laternen auf 2 hohen Mauerpfosten. Blumen am Rand fehlen bewusst (brauchen Erde, Sache der Landschaft).',
);

/** T09: Japanese entrance: dark frame, small roof (kirayoke) with lanterns below, stone step. */
function t09(id: string, w: number): FacadeTemplate {
  return doorTemplate(
    id,
    w === 1 ? 'Japanischer Eingang (Genkan), einflügelig' : 'Japanischer Eingang (Genkan) mit Doppeltür',
    w,
    [
      doorway(w),
      frame(w, 2),
      span(-2, w + 1).map((x) => step(x, 2, 1, 'roof')),
      lantern(-1, 1, 1, true),
      lantern(w, 1, 1, true),
      span(0, w - 1).map((x) => slab(x, -1, 1, 'path', 'bottom')),
    ],
    'Nach T09 ohne Noren-Banner (Block-Entity); Vordach aus der Dachrolle trägt die Laternen, Trittstein als Platte.',
  );
}

const T09 = t09('T09', 2);
const T09b = t09('T09b', 1);

/** T10: Christmas entrance: spruce garland arch with snow, lamp posts, stepping slab. */
const T10 = doorTemplate(
  'T10',
  'Weihnachtlicher Eingang mit Girlande',
  1,
  [
    doorway(1),
    frame(1, 2),
    steps(0, 0),
    [-1, 1].map((x) => [solid(x, -1, 1, 'plinth'), span(0, 2).map((y) => fixed(x, y, 1, 'spruce_leaves'))]),
    fixed(0, 2, 1, 'spruce_leaves'),
    span(-1, 1).map((x) => fixed(x, 3, 1, 'snow', { layers: '1' })),
    [slab(0, -1, 2, 'path', 'bottom'), air(0, 0, 2), air(0, 1, 2)],
    [-2, 2].map((x) => [cell(x, -1, 2, 'plinth', 'wall'), cell(x, 0, 2, 'plinth', 'wall'), lantern(x, 1, 2, false)]),
  ],
  'Nach T10; Laternen mit Taxi-Abstand ≥ 4 zum Schnee (schmilzt sonst). Keine Fußmatte (Teppich bräuchte Gelände darunter, das die Vorlage nicht garantiert).',
);

export const DOOR_TEMPLATES: readonly FacadeTemplate[] = [T01, T01b, T02, T03, T04, T05, T05b, T06, T07, T08, T09, T09b, T10];
