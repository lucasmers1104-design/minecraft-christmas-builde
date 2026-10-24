import { GeometryError, Priority, VoxelBuilder } from '@/core/generator/geometry';
import { straightRun } from '@/core/geometry';
import type { SeededRandom } from '@/core/generator/seededRandom';
import type { HouseResult } from '@/core/generator/house/buildHouse';
import { Blocks } from '@/core/generator/house/materials';
import { emptyOpenings, placeDoor } from '@/core/generator/house/openings';
import { roundRoofFor, type HouseInput, type HousePlan, type Mass } from '@/core/generator/house/plan';
import { buildRoundTower, roundTowerTop } from '@/core/generator/house/roundTower';
import { facadeOf, type Ctx } from '@/core/generator/house/walls';
import type { SizeClass } from '@/core/style/styles';
import { templatesByIds } from '@/core/templates/catalog';
import { MAX_DIMENSIONS } from '@/core/schema/voxelModel';

/**
 * Free-standing round tower ("Turm/Burgturm", phase 7): the round tower component on its own
 * plot with an entrance from the door templates in the straight run of the wall. Landscape and
 * festive layer come from the caller, as for houses.
 */

const MARGIN = 4;
const FRONT = 3;

/**
 * Wall diameter per size, from the ladder of diameters that read as round (research 16, T17:
 * 7 as a deliberate rounded square, 13, 15; no 11, which rasters to an octagon). Medium keeps 9:
 * with its default of four storeys a 13 would give a squat silo (shaft height / D ≈ 1.5, research
 * 19 asks for ≥ 2.5), which reads worse than the octagonal hint of the 9.
 */
export const TOWER_DIAMETERS: Readonly<Record<SizeClass, number>> = { small: 7, medium: 9, large: 13, huge: 15 };

export function towerDiameter(size: SizeClass): number {
  return TOWER_DIAMETERS[size];
}

export function buildTower(input: HouseInput, d: number, rng: SeededRandom, profileWished = false): HouseResult {
  // Merlons by angular sectors are symmetric for every diameter (roundTower.ts).
  const roofSpec = roundRoofFor(input, true, profileWished);
  const r = (d - 1) / 2;
  // One block for the apron ring around the wall.
  const x0 = MARGIN + 1;
  const z0 = MARGIN + FRONT + 1;
  const mass: Mass = {
    id: 'tower',
    kind: 'tower',
    rect: { x0, z0, x1: x0 + d - 1, z1: z0 + d - 1 },
    floors: input.floors,
    jetty: {},
    joins: {},
    ridgeAxis: 'x',
    roofType: 'pyramid',
    profile: input.roofProfile,
    overhang: 1,
    ridgeStyle: 'none',
    frames: false,
    timber: false,
    round: { d, ...roofSpec, ladder: 'south', door: 'north' },
  };
  // A one-block plinth: the entrance step then stands on the ground.
  const plan: HousePlan = { input, plinth: 1, floorHeight: input.floorHeight, masses: [mass], door: { x: x0 + r, side: 'north' }, notes: [] };
  const dims = { width: d + 2 + 2 * MARGIN, length: d + 2 + 2 * MARGIN + FRONT, height: roundTowerTop(plan, mass) + 3 };
  if (dims.height > MAX_DIMENSIONS.height) throw new GeometryError(`Turm ${dims.width}×${dims.height}×${dims.length} passt nicht in die Grenzen`);
  const builder = new VoxelBuilder(dims);
  const blocks = new Blocks(input.materials, input.minecraftVersion, input.seed);
  const ctx: Ctx = { builder, plan, blocks, rng };
  const tower = buildRoundTower(ctx, mass, undefined, Priority.STRUCTURE);

  // Entrance on the north axis: door templates whose frame fits into the straight run.
  const openings = emptyOpenings();
  const run = straightRun(d);
  const doors = templatesByIds('door', input.doorTemplates).filter((t) => t.width + 2 <= run);
  const f = facadeOf(mass.rect, 'north');
  placeDoor(ctx, f, f.origin.x - plan.door.x, plan.plinth + 1, doors, openings);
  openings.sills.push(...tower.sills);
  openings.windows += tower.windows;
  return {
    builder,
    plan,
    roof: { topY: roundTowerTop(plan, mass), ridgeY: {}, gableCells: [], eaveCells: tower.eaves, surface: new Map() },
    sections: [],
    panels: new Map(),
    ctx,
    openings,
  };
}
