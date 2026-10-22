import { GeometryError, Priority, VoxelBuilder } from '@/core/generator/geometry';
import { battlementSymmetric, straightRun } from '@/core/geometry';
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

/** Wall diameter per size; 7, 9 and 15 carry symmetric battlements. */
export function towerDiameter(size: SizeClass): number {
  return { small: 7, medium: 9, large: 11, huge: 15 }[size];
}

export function buildTower(input: HouseInput, d: number, rng: SeededRandom, profileWished = false): HouseResult {
  const roofSpec = roundRoofFor(input, battlementSymmetric(d), profileWished);
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
