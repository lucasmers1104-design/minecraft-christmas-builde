import { GeometryError, VoxelBuilder } from '@/core/generator/geometry';
import { buildRoofs, housePitch, planRoofs, slopeColumns, type RoofResult, type RoofSectionSpec } from '@/core/generator/roof/roofEngine';
import { ladderRise } from '@/core/generator/roof/profiles';
import { createSeededRandom, type SeededRandom } from '@/core/generator/seededRandom';
import { Blocks } from '@/core/generator/house/materials';
import { nearRoundTower, planHouse, roofSection, storeyRect, wallTopOf, type HouseInput, type HousePlan, type Mass, type Rect } from '@/core/generator/house/plan';
import { buildRoundTower, roundTowerTop } from '@/core/generator/house/roundTower';
import { buildPassages, buildPlinth, buildStairs, buildStorey, buildTop, type Ctx, type Panel } from '@/core/generator/house/walls';
import { buildChimney, buildDormer, buildPorch, buildRoofChimney, planDormers, porchSection } from '@/core/generator/house/components';
import { buildOpenings, type OpeningsResult } from '@/core/generator/house/openings';
import { buildGables } from '@/core/generator/house/gables';
import { MAX_DIMENSIONS } from '@/core/schema/voxelModel';
import type { HorizontalDirection } from '@/core/blocks/directions';

/**
 * House generator (phases 3 and 4): masses → plinth → storeys with frames and floors →
 * passages → roofs from the roof engine → openings → stairs → components. Everything is
 * deterministic for a given input; randomness is forked per part.
 */

export interface HouseResult {
  builder: VoxelBuilder;
  plan: HousePlan;
  roof: RoofResult;
  sections: RoofSectionSpec[];
  /** Panels per mass, storey and side (for openings and lints). */
  panels: Map<string, Map<HorizontalDirection, Panel[]>[]>;
  ctx: Ctx;
  openings: OpeningsResult;
}

/** Space around the building for plinth apron, porch, garden and festive decoration. */
const MARGIN = 4;

function shiftRect(r: Rect, dx: number, dz: number): Rect {
  return { x0: r.x0 + dx, x1: r.x1 + dx, z0: r.z0 + dz, z1: r.z1 + dz };
}

function bounds(plan: HousePlan, sections: RoofSectionSpec[]): { minX: number; maxX: number; minZ: number; maxZ: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const m of plan.masses) {
    const g = (m.frames ? 1 : 0) + 2 + (m.jetty.north || m.jetty.south || m.jetty.east || m.jetty.west ? 1 : 0);
    minX = Math.min(minX, m.rect.x0 - g);
    maxX = Math.max(maxX, m.rect.x1 + g);
    minZ = Math.min(minZ, m.rect.z0 - g);
    maxZ = Math.max(maxZ, m.rect.z1 + g);
  }
  for (const s of sections) {
    minX = Math.min(minX, s.x0 - s.overhang);
    maxX = Math.max(maxX, s.x1 + s.overhang);
    minZ = Math.min(minZ, s.z0 - s.overhang);
    maxZ = Math.max(maxZ, s.z1 + s.overhang);
  }
  return { minX, maxX, minZ, maxZ };
}

/** Masses built from walls and the roof engine (round towers have their own builder). */
function squareMasses(plan: HousePlan): Mass[] {
  return plan.masses.filter((m) => !m.round);
}

/** Cells inside the rooms of the square masses (an attached round tower stays open there). */
function insideHouse(plan: HousePlan): (x: number, y: number, z: number) => boolean {
  const masses = squareMasses(plan);
  return (x, y, z) =>
    masses.some((m) => {
      if (y > wallTopOf(plan, m)) return false;
      const k = Math.max(0, Math.min(m.floors - 1, Math.floor((y - plan.plinth - 1) / plan.floorHeight)));
      const r = storeyRect(m, k);
      return x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1;
    });
}

/** Plan in local coordinates and the extent of everything it will build. */
export function prepareHouse(input: HouseInput, rng: SeededRandom, plan?: HousePlan): { plan: HousePlan; bounds: ReturnType<typeof bounds> } {
  const local = plan ?? planHouse(input, rng);
  return { plan: local, bounds: bounds(local, squareMasses(local).map((m) => roofSection(local, m, input.materials))) };
}

export function shiftPlan(plan: HousePlan, dx: number, dz: number): HousePlan {
  return {
    ...plan,
    masses: plan.masses.map((m): Mass => ({ ...m, rect: shiftRect(m.rect, dx, dz) })),
    door: { ...plan.door, x: plan.door.x + dx },
  };
}

/** Roof sections of a placed plan, including dormers and porch. */
export function planSections(plan: HousePlan, input: HouseInput, rng: SeededRandom) {
  const sections = squareMasses(plan).map((m) => roofSection(plan, m, input.materials));
  const main = plan.masses[0]!;
  const probe = { builder: null as never, plan, blocks: null as never, rng };
  // Dormers keep clear of a round tower.
  const dormers = planDormers(probe, main, sections[0]!, input.dormers).filter(
    (d) => ![d.section.x0, d.section.x1].some((x) => [d.section.z0, d.section.z1].some((z) => nearRoundTower(plan, x, z, 2))),
  );
  const porch = input.porch ? porchSection(probe, main, plan.door.x) : null;
  // One pitch for the whole house: wings, cross gable and annex follow the main roof. Where the
  // style's minimum pitch needs more height than the cap, the cap grows (taller, not flatter).
  const minPitch = input.style.proportions.roofRise.minPitch;
  const pitch = housePitch(sections[0]!, minPitch);
  if (pitch)
    for (const s of sections) {
      if (s.type === 'shed' || s.type === 'flat') continue;
      s.pitch = pitch;
      s.maxRise = Math.max(s.maxRise ?? 7, ladderRise(pitch, slopeColumns(s)));
    }
  sections.push(...dormers.map((d) => d.section), ...(porch ? [porch] : []));
  return { sections, dormers, porch };
}

/** Builds a placed plan into an existing builder (used by the house and the station). */
export function buildHouseInto(builder: VoxelBuilder, plan: HousePlan, input: HouseInput, rng: SeededRandom): HouseResult {
  const { sections, dormers, porch } = planSections(plan, input, rng);
  const blocks = new Blocks(input.materials, input.minecraftVersion, input.seed);
  const ctx: Ctx = { builder, plan, blocks, rng };

  // Masses: plinth, storeys, top beam ring and ceiling.
  const panels = new Map<string, Map<HorizontalDirection, Panel[]>[]>();
  for (const mass of squareMasses(plan)) {
    buildPlinth(ctx, mass);
    const perStorey: Map<HorizontalDirection, Panel[]>[] = [];
    for (let k = 0; k < mass.floors; k++) perStorey.push(buildStorey(ctx, mass, k).panels);
    buildTop(ctx, mass);
    panels.set(mass.id, perStorey);
  }
  const main = plan.masses[0]!;
  for (const other of squareMasses(plan).slice(1)) buildPassages(ctx, main, other);

  for (const d of dormers) buildDormer(ctx, d);
  const roof = buildRoofs(builder, sections);
  if (porch) buildPorch(ctx, porch);
  let chimney: { x: number; z: number } | null = null;
  if (input.chimney && main.roofType !== 'flat') {
    const tower = plan.masses.find((m) => m.round);
    const towerSide = tower ? (tower.rect.x0 + tower.rect.x1 > main.rect.x0 + main.rect.x1 ? 'east' : 'west') : null;
    const free = (['east', 'west'] as const).filter((s) => s !== towerSide);
    const side = main.ridgeAxis === 'x' ? (free.length === 1 ? free[0]! : rng.fork('chimney').chance(0.5) ? 'east' : 'west') : 'south';
    // Without a gable on that side an outside stack would stand free beside the hip: through the
    // roof instead. Nordic houses never have an outside stack (research 10 E8).
    const throughRoof = ['hip', 'pyramid', 'mansard', 'half_hip'].includes(main.roofType) || input.styleId === 'nordic';
    if (throughRoof) chimney = buildRoofChimney(ctx, main, roof.surface, side === 'south' ? 'east' : side);
    else buildChimney(ctx, main, roof.ridgeY[main.id] ?? wallTopOf(plan, main), side, roof.surface);
  }
  const openings = buildOpenings(ctx, panels);
  // Gable fields (timber, windows) and ridge finials, after the chimney so nothing hides behind it.
  openings.windows += buildGables(ctx, roof, sections).windows;
  const nearChimney = (x: number, z: number) => !!chimney && Math.abs(x - chimney.x) <= 1 && Math.abs(z - chimney.z) <= 1;
  buildStairs(ctx, main, (x, z) => nearChimney(x, z) || nearRoundTower(plan, x, z, 1) || [...openings.reserved].some((k) => k.startsWith(`${x},`) && k.endsWith(`,${z}`)));
  // Round towers last: they replace whatever the house put into their cylinder.
  const inHouse = insideHouse(plan);
  for (const tower of plan.masses.filter((m) => m.round)) {
    const t = buildRoundTower(ctx, tower, inHouse);
    roof.eaveCells.push(...t.eaves);
    openings.sills.push(...t.sills);
    openings.windows += t.windows;
  }
  return { builder, plan, roof, sections, panels, ctx, openings };
}

export function buildHouseV2(input: HouseInput): HouseResult {
  const rng = createSeededRandom(input.seed).fork('house');
  const { plan: local, bounds: b } = prepareHouse(input, rng);
  const front = input.porch || input.garden ? 3 : 0;
  const plan = shiftPlan(local, MARGIN - b.minX, MARGIN + front - b.minZ);
  const { sections } = planSections(plan, input, rng);
  const roofPlan = planRoofs(sections);
  const height = Math.max(...plan.masses.map((m) => (m.round ? roundTowerTop(plan, m) + 2 : wallTopOf(plan, m) + 1)));
  const dims = {
    width: b.maxX - b.minX + 1 + 2 * MARGIN,
    length: b.maxZ - b.minZ + 1 + 2 * MARGIN + front,
    height: Math.max(height, roofPlan.topY + 4) + 1,
  };
  if (dims.width > MAX_DIMENSIONS.width || dims.length > MAX_DIMENSIONS.length || dims.height > MAX_DIMENSIONS.height) {
    throw new GeometryError(`Haus ${dims.width}×${dims.height}×${dims.length} passt nicht in die Grenzen`);
  }
  return buildHouseInto(new VoxelBuilder(dims), plan, input, rng);
}
