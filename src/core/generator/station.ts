import { blockState } from '@/core/blocks/registry';
import { GeometryError, Priority, VoxelBuilder } from '@/core/generator/geometry';
import { buildHouseInto, planSections, prepareHouse, shiftPlan, type HouseResult } from '@/core/generator/house/buildHouse';
import { Blocks } from '@/core/generator/house/materials';
import type { HouseInput, HousePlan, Mass } from '@/core/generator/house/plan';
import { buildRoofs, planRoofs } from '@/core/generator/roof/roofEngine';
import type { SeededRandom } from '@/core/generator/seededRandom';
import { decorateFestive } from '@/core/generator/festive';
import { MAX_DIMENSIONS } from '@/core/schema/voxelModel';

/**
 * Railway station (phase 5): a station building made of section roofs (a taller hall and two
 * lower wings instead of one giant roof), a raised platform with an edge line, a platform
 * canopy on posts with hanging lanterns, benches from stairs with trapdoor armrests, a clock
 * face on the hall, and a track (rails on ballast with sleepers). Front (street) is north,
 * the track runs along x on the south side.
 */

export interface StationLayout {
  plan: HousePlan;
  trackZ: number;
  platform: { z0: number; z1: number };
  railY: number;
  house: HouseResult;
}

const PLATFORM_DEPTH = 5;

/** Hall + two wings, all facing the street. */
function stationPlan(input: HouseInput): HousePlan {
  const W = input.width;
  const D = input.depth;
  const wingW = 7;
  const wingD = Math.max(5, D - 2);
  const zw = Math.floor((D - wingD) / 2);
  const mass = (id: string, x0: number, x1: number, z0: number, z1: number, floors: number, ridgeAxis: 'x' | 'z'): Mass => ({
    id,
    kind: id === 'main' ? 'main' : 'wing',
    rect: { x0, x1, z0, z1 },
    floors,
    jetty: {},
    joins: {},
    ridgeAxis,
    roofType: input.roofType === 'flat' ? 'flat' : id === 'main' ? 'gable' : 'hip',
    profile: input.roofProfile,
    overhang: input.overhang,
    ridgeStyle: 'block_slab',
    frames: input.styleId !== 'modern' && input.styleId !== 'mediterranean',
    timber: input.timber === 'all',
  });
  const main = mass('main', 0, W - 1, 0, D - 1, Math.max(2, input.floors), 'z');
  const left = mass('wing_left', -wingW + 1, 0, zw, zw + wingD - 1, 1, 'x');
  const right = mass('wing_right', W - 1, W - 1 + wingW - 1, zw, zw + wingD - 1, 1, 'x');
  main.joins = { west: true, east: true };
  left.joins = { east: true };
  right.joins = { west: true };
  return { input, plinth: 1, floorHeight: input.floorHeight, masses: [main, left, right], door: { x: (W - 1) / 2, side: 'north' }, notes: [] };
}

export function buildStation(input: HouseInput, rng: SeededRandom): { builder: VoxelBuilder; layout: StationLayout } {
  const r = rng.fork('station');
  const prepared = prepareHouse(input, r, stationPlan(input));
  const b = prepared.bounds;
  const margin = 3;
  const houseLength = b.maxZ - b.minZ + 1;
  const trackDepth = 5;
  const width = b.maxX - b.minX + 1 + 2 * margin;
  const length = margin + houseLength + PLATFORM_DEPTH + trackDepth + 2;
  const height = planRoofs(planSections(shiftPlan(prepared.plan, margin - b.minX, margin - b.minZ), input, r.fork('probe')).sections).topY + 6;
  if (width > MAX_DIMENSIONS.width || length > MAX_DIMENSIONS.length) throw new GeometryError('Bahnhof passt nicht in die Grenzen');
  const builder = new VoxelBuilder({ width, height, length });
  const plan = shiftPlan(prepared.plan, margin - b.minX, margin - b.minZ);
  const blocks = new Blocks(input.materials, input.minecraftVersion, input.seed);

  // Ground.
  for (let x = 0; x < width; x++) for (let z = 0; z < length; z++) builder.setBlock(x, 0, z, blockState('grass_block'), Priority.DECOR);

  const house = buildHouseInto(builder, plan, input, r);
  const main = plan.masses[0]!;

  // Platform: raised one block behind the building, edge line towards the track.
  const pz0 = main.rect.z1 + 2;
  const pz1 = pz0 + PLATFORM_DEPTH - 1;
  for (let x = 1; x < width - 1; x++)
    for (let z = pz0; z <= pz1; z++) {
      builder.setBlock(x, 0, z, blocks.block('plinth'), Priority.STRUCTURE);
      builder.setBlock(x, 1, z, z === pz1 ? blockState('yellow_concrete') : blocks.block('path'), Priority.STRUCTURE);
    }
  // Back door of the hall onto the platform.
  for (const y of [2, 3]) builder.clear(Math.round((main.rect.x0 + main.rect.x1) / 2), y, main.rect.z1, Priority.OPENING);
  for (let z = main.rect.z1 + 1; z < pz0; z++) builder.setBlock(Math.round((main.rect.x0 + main.rect.x1) / 2), 1, z, blocks.block('path'), Priority.STRUCTURE);

  // Track: ballast with sleepers, rails on top.
  const trackZ = pz1 + 3;
  for (let x = 0; x < width; x++)
    for (let dz = -1; dz <= 1; dz++) {
      const z = trackZ + dz;
      builder.setBlock(x, 0, z, dz === 0 && x % 2 === 0 ? blockState('spruce_planks') : blockState(dz === 0 ? 'andesite' : 'coarse_dirt'), Priority.STRUCTURE);
    }
  for (let x = 0; x < width; x++) builder.setBlock(x, 1, trackZ, blockState('rail', { shape: 'east_west' }), Priority.STRUCTURE);

  // Canopy: posts along both platform sides, a shallow gable roof along x.
  const canopyTop = 5;
  for (let x = 2; x < width - 2; x += 5) {
    for (const z of [pz0, pz1 - 1]) for (let y = 2; y <= canopyTop; y++) builder.setBlock(x, y, z, blocks.log('frame', 'y'), Priority.STRUCTURE);
  }
  const canopy = buildRoofs(builder, [
    {
      id: 'canopy',
      x0: 2,
      x1: width - 3,
      z0: pz0,
      z1: pz1 - 1,
      wallTop: canopyTop,
      type: 'gable',
      ridgeAxis: 'x',
      profile: 'shallow',
      overhang: 1,
      materials: { roof: input.materials.roof, trim: input.materials.roofTrim, ridge: input.materials.ridge, soffit: input.materials.soffit, gable: input.materials.wall },
      ridgeStyle: 'slab',
      soffit: true,
      gables: false,
    },
  ]);
  // Lanterns hanging from the canopy between the posts.
  const hanging = blockState(input.lantern, { hanging: 'true' });
  for (let x = 4; x < width - 3; x += 5) {
    const z = Math.floor((pz0 + pz1 - 1) / 2);
    const top = canopy.surface.get(`${x},${z}`);
    if (top === undefined) continue;
    let y = top - 1;
    while (y > 2 && !builder.isAir(x, y, z)) y--;
    const above = builder.getBlock(x, y + 1, z);
    if (above.includes('_slab') && above.includes('type=top')) continue;
    if (builder.isAir(x, y, z)) builder.setBlock(x, y, z, hanging, Priority.DECOR);
  }
  // Benches facing the track: stairs with open trapdoors as armrests.
  for (let x = 4; x < width - 6; x += 7) {
    const z = pz0 + 1;
    for (let i = 0; i < 2; i++) builder.setBlock(x + i, 2, z, blocks.stairs('floor', 'north', 'bottom'), Priority.DECOR);
    builder.setBlock(x - 1, 2, z, blocks.trapdoor('shutter', 'west', 'bottom', true), Priority.DECOR);
    builder.setBlock(x + 2, 2, z, blocks.trapdoor('shutter', 'east', 'bottom', true), Priority.DECOR);
  }
  // Clock face on the hall front (above the entrance): white dial, dark centre and hands.
  const top = main.floors > 1 ? main.floors - 1 : 0;
  const cy = plan.plinth + top * plan.floorHeight + Math.floor(plan.floorHeight / 2) + 1;
  const cx = Math.round((main.rect.x0 + main.rect.x1) / 2);
  const cz = main.rect.z0 - (main.frames ? 2 : 1);
  for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++) {
      const hand = (dx === 0 && dy === 1) || (dx === 1 && dy === 0);
      const state = dx === 0 && dy === 0 ? blockState('black_concrete') : hand ? blockState('black_concrete') : blockState('white_concrete');
      builder.setBlock(cx + dx, cy + dy, cz, state, Priority.OPENING);
    }

  // Festive layer on the station building.
  if (input.theme !== 'none') {
    decorateFestive(builder, r.fork('festive'), { eaves: [...house.roof.eaveCells, ...canopy.eaveCells], doors: [], sills: [], yard: [] }, {
      theme: input.theme,
      intensity: input.detailLevel,
      garland: input.festive.garland,
      presents: false,
      lantern: input.lantern,
      lanternDensity: input.lanternDensity,
      minecraftVersion: input.minecraftVersion,
    });
  }
  return { builder, layout: { plan, trackZ, platform: { z0: pz0, z1: pz1 }, railY: 1, house } };
}
