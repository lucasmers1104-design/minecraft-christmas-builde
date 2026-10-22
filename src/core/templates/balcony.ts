import type { FacadeTemplate } from '@/core/templates/types';
import { air, cell, fixed, flat, lantern, pane, sill, slab, span, type Cells } from '@/core/templates/windows';

/**
 * Balcony on an upper storey (not part of the window/door catalogue; placed by the openings
 * on request): door with a pane on each side in the wall plane, a plank platform flush with
 * the room floor on stair consoles (d = 1..2), a railing around it and standing lanterns on the
 * corner posts. Conventions as in windows.ts (canonical south facade, d = 0 wall plane).
 */

function balcony(id: string, label: string, railing: (x: number, d: number) => Cells): FacadeTemplate {
  const cells: Cells[] = [
    cell(1, 0, 0, 'door', 'door', { half: 'lower', facing: 'south', hinge: 'right', open: 'false' }),
    [air(1, 1, 0), air(1, 0, -1), air(1, 1, -1)],
    span(0, 1).map((y) => [pane(0, y), pane(2, y)]),
    span(-1, 3).map((x) => [slab(x, -1, 1, 'floor', 'top'), slab(x, -1, 2, 'floor', 'top')]),
    [-1, 1, 3].map((x) => sill(x, -2, 1)),
    span(-1, 3).map((x) => railing(x, 2)),
    [railing(-1, 1), railing(3, 1)],
    span(0, 2).map((x) => [air(x, 0, 1), air(x, 1, 1)]),
    [lantern(-1, 1, 2, false), lantern(3, 1, 2, false)],
  ];
  return { id, kind: 'door', label, width: 3, height: 2, cells: flat(...cells), styles: [], spacing: 1, note: 'Balkon im Obergeschoss; Plattform bündig mit dem Raumboden, Konsolen aus Kopfüber-Treppen.' };
}

export const BALCONY_TEMPLATES: readonly FacadeTemplate[] = [
  balcony('B01', 'Balkon mit Holzgeländer und Laternen', (x, d) => cell(x, 0, d, 'frame', 'fence')),
  balcony('B01b', 'Balkon mit Eisengeländer und Laternen', (x, d) => fixed(x, 0, d, 'iron_bars', undefined, 'frame')),
];
