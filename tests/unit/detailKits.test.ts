import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import * as nbt from 'prismarine-nbt';
import { afterEach, describe, expect, it } from 'vitest';
import { OPPOSITE, type HorizontalDirection } from '@/core/blocks/directions';
import { AIR, blockIdOf, blockState, checkBlockState, propsOf } from '@/core/blocks/registry';
import type { Repair } from '@/core/blocks/validator';
import { JAVA_1_21_1, JAVA_1_21_11 } from '@/core/compat/profile';
import { buildSpongeV3Nbt } from '@/core/export/writeSpongeV3';
import { Priority, VoxelBuilder } from '@/core/generator/geometry';
import { kitCells, kitTemplate } from '@/core/kits/kitTemplate';
import { createKitLibrary, EMPTY_KIT_LIBRARY, kitsFor, kitTemplates } from '@/core/kits/library';
import { parseKit, type KitFileInput } from '@/core/kits/parseKit';
import type { DetailKit } from '@/core/kits/types';
import { DEFAULT_HOUSE_SPEC, type BuildSpec } from '@/core/schema/buildSpec';
import { lintHouse } from '@/core/analysis/buildingLints';
import { generateBuilding, generateBuildingWithReport, generateSelectedVariants } from '@/core/generator/generateBuilding';
import { blockAt, createVoxelModel, type VoxelModel } from '@/core/schema/voxelModel';
import { PALETTES, ROLES } from '@/core/style/palettes';
import { templateBounds } from '@/core/templates/catalog';
import { cellPosition, placeTemplate, templateFits, type FacadeFrame, type RoleMaterials } from '@/core/templates/place';
import type { FacadeTemplate } from '@/core/templates/types';
import { clearKitCache, loadKits } from '@/lib/kits/loadKits';

const VERSIONS = ['1.21.11', '1.21.1'] as const;
const DIRECTIONS: readonly HorizontalDirection[] = ['south', 'west', 'north', 'east'];
const MATERIALS = Object.fromEntries(ROLES.map((r) => [r, PALETTES[0]!.roles[r][0]![0]])) as RoleMaterials;

// ---------------------------------------------------------------------------------------------
// Kits built inside the test (no foreign files): a VoxelModel written by the app's own Sponge v3
// writer, optionally patched like a WorldEdit file (Offset, Metadata.WorldEdit.Origin).

type Placed = readonly [number, number, number, string];

function kitModel(size: readonly [number, number, number], blocks: readonly Placed[], version: string = JAVA_1_21_11.minecraftVersion): VoxelModel {
  const [width, height, length] = size;
  const palette = [AIR];
  const lookup = new Map([[AIR, 0]]);
  const indices = new Uint16Array(width * height * length);
  for (const [x, y, z, state] of blocks) {
    let id = lookup.get(state);
    if (id === undefined) {
      id = palette.length;
      palette.push(state);
      lookup.set(state, id);
    }
    indices[x + width * (z + length * y)] = id;
  }
  return createVoxelModel({ ...DEFAULT_HOUSE_SPEC, targetMinecraftVersion: version }, { width, height, length }, palette, indices);
}

interface SchemPatch {
  offset?: [number, number, number];
  /** Metadata.WorldEdit.Origin as WorldEdit writes it (absolute player position at //copy). */
  origin?: [number, number, number];
  dataVersion?: number;
  /** Renames a palette key (to smuggle in blocks the app's writer refuses). */
  rename?: [string, string];
}

const tag = (value: unknown) => value as nbt.Tags[nbt.TagType];

function schemBytes(model: VoxelModel, patch: SchemPatch = {}): Uint8Array {
  const profile = model.spec.targetMinecraftVersion === JAVA_1_21_1.minecraftVersion ? JAVA_1_21_1 : JAVA_1_21_11;
  const root = buildSpongeV3Nbt(model, profile);
  const schem = (root.value.Schematic as nbt.Compound).value;
  if (patch.offset) schem.Offset = tag({ type: 'intArray', value: patch.offset });
  if (patch.origin) {
    (schem.Metadata as nbt.Compound).value.WorldEdit = tag({
      type: 'compound',
      value: { Version: { type: 'string', value: '7.4.6' }, Origin: { type: 'intArray', value: patch.origin } },
    });
  }
  if (patch.dataVersion !== undefined) schem.DataVersion = tag({ type: 'int', value: patch.dataVersion });
  if (patch.rename) {
    const palette = ((schem.Blocks as nbt.Compound).value.Palette as nbt.Compound).value;
    palette[patch.rename[1]] = palette[patch.rename[0]]!;
    delete palette[patch.rename[0]];
  }
  return gzipSync(nbt.writeUncompressed(root, 'big'));
}

const json = (fields: Record<string, unknown>) => JSON.stringify({ facing: 'north', ...fields });

function input(model: VoxelModel, description: string, patch: SchemPatch = {}, scope = 'rustic', name = 'fenster'): KitFileInput {
  return { scope, name, schematic: schemBytes(model, patch), description };
}

function mustParse(file: KitFileInput): DetailKit {
  const result = parseKit(file);
  if (!result.ok) throw new Error(result.problems.join('\n'));
  return result.kit;
}

function problemsOf(file: KitFileInput): string[] {
  const result = parseKit(file);
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.problems;
}

const s = blockState;

/**
 * Window kit as the creative director would build it: outside faces NORTH (z = 0), wall plane
 * z = 1, room z = 2. Opening 2 × 2 at X 1..2, Y 1..2. Seen from outside (looking south) the left
 * side is east (X = 3): shutters there and a stair hood; on the right (X = 0) a lantern on a
 * chain under a pale oak bracket. Stair sill below the glass. Anchor = bottom-left cell of the
 * opening seen from outside = (2, 1, 1); the player stands in front of it at (2, 1, 0).
 */
const WINDOW_BLOCKS: readonly Placed[] = [
  ...[1, 2].flatMap((x) => [1, 2].map((y): Placed => [x, y, 1, s('glass_pane', x === 1 ? { east: 'true' } : {})])),
  [1, 0, 0, s('spruce_stairs', { facing: 'south', half: 'top', shape: 'outer_left' })],
  [2, 0, 0, s('spruce_stairs', { facing: 'south', half: 'top', waterlogged: 'true' })],
  [3, 1, 0, s('spruce_trapdoor', { facing: 'north', half: 'bottom', open: 'true' })],
  [3, 2, 0, s('spruce_trapdoor', { facing: 'north', half: 'top', open: 'true' })],
  [3, 3, 0, s('stone_brick_stairs', { facing: 'east', half: 'top' })],
  [0, 3, 0, s('pale_oak_planks')],
  [0, 2, 0, s('iron_chain', { axis: 'y' })],
  [0, 1, 0, s('lantern', { hanging: 'true' })],
];
const WINDOW_SIZE = [4, 4, 3] as const;
const WINDOW_JSON = json({ part: 'window', opening: { width: 2, height: 2 }, anchor: [2, 1, 1] });

/** Door kit: oak door (facing north, hinge left) on stone bricks, log frame, step, two lanterns. */
const DOOR_BLOCKS: readonly Placed[] = [
  ...[0, 1, 2].map((x): Placed => [x, 0, 1, s('stone_bricks')]),
  [1, 1, 1, s('oak_door', { facing: 'north', half: 'lower', hinge: 'left' })],
  [1, 2, 1, s('oak_door', { facing: 'north', half: 'upper', hinge: 'left' })],
  ...[0, 2].flatMap((x) => [1, 2].map((y): Placed => [x, y, 1, s('oak_log', { axis: 'y' })])),
  ...[0, 1, 2].map((x): Placed => [x, 3, 1, s('oak_log', { axis: 'x' })]),
  [1, 0, 0, s('oak_stairs', { facing: 'south', half: 'bottom' })],
  ...[0, 2].flatMap((x): Placed[] => [
    [x, 3, 0, s('oak_slab', { type: 'bottom' })],
    [x, 2, 0, s('lantern', { hanging: 'true' })],
  ]),
];
const DOOR_SIZE = [3, 4, 3] as const;
const DOOR_JSON = json({ part: 'door', opening: { width: 1, height: 2 }, anchor: [1, 1, 1] });

/**
 * Chimney head 3 × 3 × 3: brick ring around the open flue (1, 0, 1), above it a ring of brick
 * walls with a stair on the outside (north) face and a lit campfire in the flue.
 */
const CHIMNEY_BLOCKS: readonly Placed[] = [
  ...[0, 1, 2].flatMap((x) => [0, 1, 2].filter((z) => x !== 1 || z !== 1).map((z): Placed => [x, 0, z, s('bricks')])),
  ...[0, 1, 2].flatMap((x) =>
    [0, 1, 2]
      .filter((z) => (x !== 1 || z !== 1) && (x !== 1 || z !== 0))
      .map((z): Placed => [x, 1, z, s('brick_wall')]),
  ),
  [1, 1, 0, s('brick_stairs', { facing: 'south', half: 'bottom' })],
  [1, 1, 1, s('campfire', { facing: 'north', lit: 'true' })],
];

const cellAt = (kit: DetailKit, x: number, y: number, d: number) => kit.cells.find((c) => c.x === x && c.y === y && c.d === d);

// ---------------------------------------------------------------------------------------------
// Dummy facade (as in templates.test.ts): ground y = −2, room floor y = −1 (d < 0), wall in the
// plane d = 0 with a plinth row, opening cleared, a bookshelf in the room right behind the
// opening (forced air must clear it); then the kit template is placed and the grid finalized.

interface Scene {
  model: VoxelModel;
  repairs: Repair[];
  plain: FacadeFrame;
  fits: boolean;
}

const WALL = s('stone_bricks');

function buildScene(t: FacadeTemplate, outward: HorizontalDirection, mirror: boolean, version: string): Scene {
  const b = templateBounds(t);
  const xlo = Math.min(b.minX - 3, t.width - 1 - (b.maxX + 3));
  const xhi = Math.max(b.maxX + 3, t.width - 1 - (b.minX - 3));
  const dlo = Math.min(-2, b.minD - 1);
  const dhi = Math.max(2, b.maxD + 2);
  const ylo = Math.min(-2, b.minY - 1);
  const yhi = b.maxY + 2;
  const r = Math.max(-xlo, xhi, -dlo, dhi);
  const builder = new VoxelBuilder({ width: 2 * r + 1, height: yhi - ylo + 1, length: 2 * r + 1 });
  const origin = { x: r, y: -ylo, z: r };
  const plain: FacadeFrame = { origin, outward };
  const put = (x: number, y: number, d: number, state: string) => {
    const p = cellPosition(t, { x, y, d }, plain);
    builder.setBlock(p.x, p.y, p.z, state, Priority.STRUCTURE);
  };
  for (let x = xlo; x <= xhi; x++) {
    for (let d = dlo; d <= dhi; d++) put(x, -2, d, s('dirt'));
    for (let d = dlo; d <= -1; d++) put(x, -1, d, s('oak_planks'));
    put(x, -1, 0, s('cobblestone'));
    for (let y = 0; y <= yhi; y++) put(x, y, 0, WALL);
  }
  for (let x = 0; x < t.width; x++) for (let y = 0; y < t.height; y++) put(x, y, 0, AIR);
  put(0, 0, -1, s('bookshelf'));
  const frame: FacadeFrame = { origin, outward, mirror };
  const fits = templateFits(builder, t, frame);
  placeTemplate(builder, t, frame, MATERIALS, version);
  const { model, repairs } = builder.finalize({ ...DEFAULT_HOUSE_SPEC, targetMinecraftVersion: version });
  return { model, repairs, plain, fits };
}

/** State at canonical facade coordinates of the UNmirrored frame (mirroring moves the kit, not the probe). */
function plainAt(t: FacadeTemplate, scene: Scene, x: number, y: number, d: number): string {
  const p = cellPosition(t, { x, y, d }, scene.plain);
  return blockAt(scene.model, p.x, p.y, p.z);
}

function idCounts(model: VoxelModel): string {
  const counts = new Map<string, number>();
  for (const i of model.indices) {
    const id = blockIdOf(model.palette[i]!);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return JSON.stringify([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

// ---------------------------------------------------------------------------------------------

describe('Detail-Kits: Einlesen und kanonische Form', () => {
  it('Fenster-Kit wird nach Süden gedreht: Glas, Sims, Läden, Haube und Laterne an den richtigen Stellen', () => {
    const kit = mustParse(input(kitModel(WINDOW_SIZE, WINDOW_BLOCKS), WINDOW_JSON));
    expect(kit.id).toBe('kit:rustic/fenster');
    expect(kit.part).toBe('window');
    expect(kit.opening).toEqual({ width: 2, height: 2 });
    expect(kit.source).toMatchObject({ dataVersion: 4671, minecraftVersion: '1.21.11', anchor: [2, 1, 1], anchorFrom: 'json' });
    // Glass in the wall plane; x = 0 is the left column seen from outside (east in the kit world).
    for (const x of [0, 1]) for (const y of [0, 1]) expect(cellAt(kit, x, y, 0)?.block).toBe('minecraft:glass_pane');
    // Pane connections are left to the resolver.
    expect(cellAt(kit, 1, 0, 0)?.props).toEqual({});
    // Sill: north-facing kit stairs facing south → canonical facing north (full side at the wall),
    // exactly like the procedural `sill`; shape and water are dropped.
    for (const x of [0, 1]) expect(cellAt(kit, x, -1, 1)?.props).toEqual({ facing: 'north', half: 'top' });
    // Shutters on the left: same state as the procedural `shutter` (open trapdoor facing south).
    expect(cellAt(kit, -1, 0, 1)).toMatchObject({ block: 'minecraft:spruce_trapdoor', props: { facing: 'south', half: 'bottom', open: 'true', powered: 'false' } });
    expect(cellAt(kit, -1, 1, 1)?.props.half).toBe('top');
    // East-facing hood stair turned by 180° faces west.
    expect(cellAt(kit, -1, 2, 1)).toMatchObject({ block: 'minecraft:stone_brick_stairs', props: { facing: 'west', half: 'top' } });
    // Lantern on a chain on the right (x = width).
    expect(cellAt(kit, 2, 0, 1)).toMatchObject({ block: 'minecraft:lantern', props: { hanging: 'true' } });
    expect(cellAt(kit, 2, 1, 1)?.block).toBe('minecraft:iron_chain');
    // Forced air only where the opening (and the room cell behind it) has no block.
    expect(kit.air).toEqual([
      { x: 0, y: 0, d: -1 },
      { x: 1, y: 0, d: -1 },
      { x: 0, y: 1, d: -1 },
      { x: 1, y: 1, d: -1 },
    ]);
    expect(kit.notes.some((n) => n.includes('Wasser in 1 Blöcken'))).toBe(true);
    // 1.21.1: renamed chain and the pale oak stand-in, still placeable.
    expect(kit.versions).toEqual([
      { minecraftVersion: '1.21.11', placeable: true, replacements: [], missing: [] },
      {
        minecraftVersion: '1.21.1',
        placeable: true,
        replacements: ['minecraft:iron_chain → minecraft:chain', 'minecraft:pale_oak_planks → minecraft:smooth_quartz'],
        missing: [],
      },
    ]);
    expect(Object.isFrozen(kit) && Object.isFrozen(kit.cells)).toBe(true);
  });

  it('Anker aus dem WorldEdit-Offset: Spieler stand außen vor der linken unteren Öffnungszelle', () => {
    const model = kitModel(WINDOW_SIZE, WINDOW_BLOCKS);
    const explicit = mustParse(input(model, WINDOW_JSON));
    // WorldEdit: Offset = minimum corner − player position. Kit built at min (100, 64, −20),
    // player at (102, 65, −20) = one block north of the anchor (102, 65, −19).
    const derived = mustParse(input(model, json({ part: 'window', opening: { width: 2, height: 2 } }), { offset: [-2, -1, 0], origin: [102, 65, -20] }));
    expect(derived.source).toMatchObject({ anchor: [2, 1, 1], anchorFrom: 'offset', offset: [-2, -1, 0] });
    expect(derived.cells).toEqual(explicit.cells);
    expect(derived.air).toEqual(explicit.air);
  });

  it('Tür-Kit: nur die untere Türhälfte als Block, die obere wird erzwungene Luft; Stufe wie die prozedurale', () => {
    const kit = mustParse(input(kitModel(DOOR_SIZE, DOOR_BLOCKS), DOOR_JSON, {}, 'alle', 'tuer'));
    expect(cellAt(kit, 0, 0, 0)).toMatchObject({ block: 'minecraft:oak_door', props: { facing: 'south', half: 'lower', hinge: 'left', open: 'false', powered: 'false' } });
    expect(cellAt(kit, 0, 1, 0)).toBeUndefined();
    expect(kit.air).toEqual(expect.arrayContaining([{ x: 0, y: 1, d: 0 }, { x: 0, y: 0, d: -1 }, { x: 0, y: 1, d: -1 }]));
    expect(cellAt(kit, 0, -1, 1)?.props).toEqual({ facing: 'north', half: 'bottom' });
    expect(cellAt(kit, 0, 2, 0)?.props).toEqual({ axis: 'x' });
    expect(kitTemplate(kit)).toMatchObject({ id: 'kit:alle/tuer', kind: 'door', width: 1, height: 2, spacing: 1 });
    expect(kitTemplate(kit)!.styles.length).toBe(8);
  });

  it('Kits aus Minecraft 1.21.1 werden auf 1.21.11-Namen gebracht (chain → iron_chain)', () => {
    const blocks = WINDOW_BLOCKS.filter((b) => !b[3].includes('pale_oak')).map((b): Placed => (b[3].includes('iron_chain') ? [b[0], b[1], b[2], s('chain', { axis: 'y' })] : b));
    const kit = mustParse(input(kitModel(WINDOW_SIZE, [...blocks, [0, 3, 0, s('oak_planks')]], '1.21.1'), WINDOW_JSON));
    expect(kit.source).toMatchObject({ dataVersion: 3955, minecraftVersion: '1.21.1' });
    expect(cellAt(kit, 2, 1, 1)?.block).toBe('minecraft:iron_chain');
  });

  it('Kaminkopf: Anker im Rauchzug der untersten Reihe, Rauchzug bleibt frei, kitCells dreht zur Außenseite', () => {
    const model = kitModel([3, 3, 3], CHIMNEY_BLOCKS);
    const kit = mustParse(input(model, json({ part: 'chimney_head' }), { offset: [-1, 0, -1], origin: [10, 80, 10] }, 'nordic', 'kamin'));
    expect(kit.source).toMatchObject({ anchor: [1, 0, 1], anchorFrom: 'offset' });
    expect(kit.opening).toBeNull();
    expect(kitTemplate(kit)).toBeNull();
    expect(kit.air).toEqual([
      { x: 0, y: 0, d: 0 },
      { x: 0, y: 2, d: 0 },
    ]);
    expect(cellAt(kit, 0, 1, 0)).toMatchObject({ block: 'minecraft:campfire', props: { facing: 'south', lit: 'true' } });
    expect(cellAt(kit, 1, 1, 1)?.props).toEqual({});
    // Outside (north in the kit) turned to the east: the stair sits east of the flue, facing it.
    const east = kitCells(kit, 'east');
    const at = (x: number, y: number, z: number) => east.find((c) => c.x === x && c.y === y && c.z === z)?.state;
    expect(at(1, 1, 0)).toBe(s('brick_stairs', { facing: 'west', half: 'bottom' }));
    expect(at(0, 1, 0)).toBe(s('campfire', { facing: 'east', lit: 'true' }));
    expect(at(0, 0, 0)).toBe(AIR);
    expect(at(0, 2, 0)).toBe(AIR);
    expect(east.filter((c) => c.state !== AIR)).toHaveLength(CHIMNEY_BLOCKS.length);
  });

  it('gleiche Dateien → gleiches Kit (deterministisch)', () => {
    const file = input(kitModel(WINDOW_SIZE, WINDOW_BLOCKS), WINDOW_JSON);
    expect(mustParse(file)).toEqual(mustParse({ ...file, schematic: Uint8Array.from(file.schematic) }));
    expect(createKitLibrary([mustParse(file)]).fingerprint).toBe(createKitLibrary([mustParse(file)]).fingerprint);
  });
});

describe('Detail-Kits: Einsetzen über den Fassadenpfad (4 Richtungen × gespiegelt × 1.21.11/1.21.1)', () => {
  const window = mustParse(input(kitModel(WINDOW_SIZE, WINDOW_BLOCKS), WINDOW_JSON));
  const door = mustParse(input(kitModel(DOOR_SIZE, DOOR_BLOCKS), DOOR_JSON, {}, 'rustic', 'tuer'));

  it.each([
    ['Fenster', window],
    ['Tür', door],
  ] as const)('%s', (_, kit) => {
    const t = kitTemplate(kit)!;
    for (const version of VERSIONS) {
      for (const mirror of [false, true]) {
        const counts = new Set<string>();
        for (const outward of DIRECTIONS) {
          const ctx = `${kit.id} ${version} ${outward}${mirror ? ' gespiegelt' : ''}`;
          const scene = buildScene(t, outward, mirror, version);
          expect(scene.fits, ctx).toBe(true);
          expect(scene.repairs, ctx).toEqual([]);
          for (const state of scene.model.palette) expect(checkBlockState(state, version), `${ctx}: ${state}`).toMatchObject({ ok: true });
          // Forced air cleared the bookshelf behind the opening; air elsewhere left the wall as is.
          expect(plainAt(t, scene, 0, 0, -1), ctx).toBe(AIR);
          expect(plainAt(t, scene, -2, 0, 0), ctx).toBe(WALL);
          counts.add(idCounts(scene.model));
          if (kit === window) {
            for (const x of [0, 1]) for (const y of [0, 1]) expect(blockIdOf(plainAt(t, scene, x, y, 0)), ctx).toBe('minecraft:glass_pane');
            expect(propsOf(plainAt(t, scene, 0, -1, 1)).facing, `${ctx}: Sims zur Wand`).toBe(OPPOSITE[outward]);
            // Mirroring swaps the shutters (left) and the lantern (right).
            const [left, right] = [plainAt(t, scene, -1, 0, 1), plainAt(t, scene, 2, 0, 1)];
            expect(blockIdOf(mirror ? right : left), ctx).toBe('minecraft:spruce_trapdoor');
            expect(blockIdOf(mirror ? left : right), ctx).toBe('minecraft:lantern');
            expect(blockIdOf(plainAt(t, scene, mirror ? -1 : 2, 1, 1)), ctx).toBe(version === '1.21.1' ? 'minecraft:chain' : 'minecraft:iron_chain');
            expect(blockIdOf(plainAt(t, scene, mirror ? -1 : 2, 2, 1)), ctx).toBe(version === '1.21.1' ? 'minecraft:smooth_quartz' : 'minecraft:pale_oak_planks');
          } else {
            const lower = plainAt(t, scene, 0, 0, 0);
            const upper = plainAt(t, scene, 0, 1, 0);
            expect(blockIdOf(lower), ctx).toBe('minecraft:oak_door');
            // Kit door facing north = towards the outside; on every facade it faces outward.
            expect(propsOf(lower), ctx).toMatchObject({ half: 'lower', facing: outward, hinge: mirror ? 'right' : 'left' });
            expect(propsOf(upper), ctx).toMatchObject({ half: 'upper', facing: outward, hinge: mirror ? 'right' : 'left' });
            for (const y of [0, 1]) expect(plainAt(t, scene, 0, y, 1), `${ctx}: frei vor der Tür`).toBe(AIR);
          }
        }
        expect(counts.size, `${kit.id} ${version}: gleiche Blockanzahlen in allen 4 Richtungen`).toBe(1);
      }
    }
  });

  it('kitCells liefert dieselben Zellen wie placeTemplate (Position und Zustand)', () => {
    for (const kit of [window, door]) {
      const t = kitTemplate(kit)!;
      for (const version of VERSIONS)
        for (const mirror of [false, true])
          for (const outward of DIRECTIONS) {
            const builder = new VoxelBuilder({ width: 21, height: 21, length: 21 });
            const placed = placeTemplate(builder, t, { origin: { x: 10, y: 10, z: 10 }, outward, mirror }, MATERIALS, version);
            const fromTemplate = placed.cells.map((c) => `${c.x - 10},${c.y - 10},${c.z - 10}|${c.state}`).sort();
            const fromKit = kitCells(kit, outward, mirror, version).map((c) => `${c.x},${c.y},${c.z}|${c.state}`).sort();
            expect(fromKit, `${kit.id} ${version} ${outward} ${mirror}`).toEqual(fromTemplate);
          }
    }
  });
});

describe('Detail-Kits: Ablehnung mit deutscher Meldung', () => {
  const model = kitModel(WINDOW_SIZE, WINDOW_BLOCKS);

  it('unbekannter Block wird mit Namen abgelehnt', () => {
    const problems = problemsOf(input(model, WINDOW_JSON, { rename: [s('pale_oak_planks'), 'minecraft:command_block'] }));
    expect(problems.join('\n')).toMatch(/"minecraft:command_block" ist nicht freigegeben/);
  });

  it('fremde DataVersion wird abgelehnt', () => {
    expect(problemsOf(input(model, WINDOW_JSON, { dataVersion: 4189 })).join('\n')).toMatch(/DataVersion 4189 wird nicht unterstützt.*1\.21\.11 \(DataVersion 4671\)/);
  });

  it('zu groß: Box über 9 × 12 × 9 oder mehr als 600 Blöcke', () => {
    const wide = kitModel([10, 3, 3], [[0, 0, 0, s('stone')]]);
    expect(problemsOf(input(wide, WINDOW_JSON)).join('\n')).toMatch(/Kit zu groß: 10 × 3 × 3/);
    const full: Placed[] = [];
    for (let x = 0; x < 9; x++) for (let y = 0; y < 9; y++) for (let z = 0; z < 9; z++) full.push([x, y, z, s('stone')]);
    expect(problemsOf(input(kitModel([9, 9, 9], full), WINDOW_JSON)).join('\n')).toMatch(/729 Blöcke, erlaubt sind höchstens 600/);
  });

  it('Anker außerhalb der Schematic (aus JSON und aus dem Offset)', () => {
    expect(problemsOf(input(model, json({ part: 'window', opening: { width: 2, height: 2 }, anchor: [7, 1, 1] }))).join('\n')).toMatch(/Anker \[7, 1, 1\] liegt außerhalb/);
    expect(problemsOf(input(model, json({ part: 'window', opening: { width: 2, height: 2 } }), { offset: [-6, -1, 0] })).join('\n')).toMatch(/außerhalb.*Stell dich beim \/\/copy außen/);
  });

  it('Spieler stand in der Öffnung statt davor: leere Öffnung wird erkannt', () => {
    // Player at the anchor itself → anchor one block too far inside.
    expect(problemsOf(input(model, json({ part: 'window', opening: { width: 2, height: 2 } }), { offset: [-2, -1, -1] })).join('\n')).toMatch(/kein Block\. Liegt der Anker richtig/);
  });

  it('kaputtes oder ungültiges JSON', () => {
    expect(problemsOf(input(model, '{ "part": "window", ')).join('\n')).toMatch(/kein gültiges JSON/);
    expect(problemsOf(input(model, json({ part: 'roof', opening: { width: 1, height: 1 } }))).join('\n')).toMatch(/^part: Ungültige Option/m);
    expect(problemsOf(input(model, json({ part: 'window', opening: { width: 2, height: 2 }, colour: 'red' }))).join('\n')).toMatch(/Unbekannter Schlüssel: "colour"/);
    expect(problemsOf(input(model, JSON.stringify({ part: 'window', opening: { width: 2, height: 2 }, facing: 'south' }))).join('\n')).toMatch(/facing muss "north" sein/);
    expect(problemsOf(input(model, json({ part: 'window' }))).join('\n')).toMatch(/opening fehlt/);
    expect(problemsOf(input(model, json({ part: 'chimney_head', opening: { width: 1, height: 1 } }))).join('\n')).toMatch(/opening gibt es bei Kaminköpfen nicht/);
  });

  it('Tür-Kit mit fehlender Türhälfte oder ohne Tür', () => {
    const noUpper = DOOR_BLOCKS.filter((b) => !b[3].includes('half=upper'));
    expect(problemsOf(input(kitModel(DOOR_SIZE, noUpper), DOOR_JSON)).join('\n')).toMatch(/Tür minecraft:oak_door an Position \(1, 1, 1\).*obere Hälfte fehlt/);
    const noLower = DOOR_BLOCKS.filter((b) => !b[3].includes('half=lower'));
    expect(problemsOf(input(kitModel(DOOR_SIZE, noLower), DOOR_JSON)).join('\n')).toMatch(/untere Hälfte fehlt/);
    const noDoor = DOOR_BLOCKS.filter((b) => !b[3].includes('oak_door'));
    expect(problemsOf(input(kitModel(DOOR_SIZE, noDoor), DOOR_JSON)).join('\n')).toMatch(/Tür-Kit ohne Tür/);
  });

  it('Blöcke tief im Raum, unbekannter Ordner und ungültiger Name', () => {
    const deep = kitModel([4, 4, 4], [...WINDOW_BLOCKS, [1, 1, 3, s('bookshelf')]]);
    expect(problemsOf(input(deep, WINDOW_JSON)).join('\n')).toMatch(/1 Blöcke liegen mehr als 1 Block hinter der Wandebene/);
    expect(problemsOf(input(model, WINDOW_JSON, {}, 'barock')).join('\n')).toMatch(/Unbekannter Ordner „barock“/);
    expect(problemsOf(input(model, WINDOW_JSON, {}, 'rustic', '../x')).join('\n')).toMatch(/Ungültiger Kit-Name/);
  });

  it('keine gzip-Datei', () => {
    expect(problemsOf({ scope: 'rustic', name: 'x', schematic: new Uint8Array([1, 2, 3]), description: WINDOW_JSON }).join('\n')).toMatch(/lässt sich nicht entpacken/);
  });
});

describe('Detail-Kits: Bibliothek', () => {
  const windowModel = kitModel(WINDOW_SIZE, WINDOW_BLOCKS);
  const make = (scope: string, name: string, fits?: Record<string, unknown>) =>
    mustParse(input(windowModel, json({ part: 'window', opening: { width: 2, height: 2 }, anchor: [2, 1, 1], ...(fits ? { fits } : {}) }), {}, scope, name));
  const rusticA = make('rustic', 'a');
  const rusticB = make('rustic', 'b', { weight: 5 });
  const upperOnly = make('rustic', 'oben', { storeys: ['upper'], sides: ['front', 'front'], minFacadeLength: 9 });
  const all = make('alle', 'standard');
  const modern = make('modern', 'band');
  const door = mustParse(input(kitModel(DOOR_SIZE, DOOR_BLOCKS), DOOR_JSON, {}, 'alle', 'tuer'));

  it('Reihenfolge ist deterministisch (nach ID), egal in welcher Reihenfolge die Kits kommen', () => {
    const one = createKitLibrary([modern, all, rusticB, door, rusticA, upperOnly]);
    const two = createKitLibrary([upperOnly, rusticA, door, rusticB, all, modern]);
    expect(one.kits.map((k) => k.id)).toEqual(['kit:alle/standard', 'kit:alle/tuer', 'kit:modern/band', 'kit:rustic/a', 'kit:rustic/b', 'kit:rustic/oben']);
    expect(two.kits).toEqual(one.kits);
    expect(two.fingerprint).toBe(one.fingerprint);
    expect(createKitLibrary([all]).fingerprint).not.toBe(one.fingerprint);
    expect(() => createKitLibrary([all, all])).toThrow(/Doppelte Kit-ID/);
  });

  it('kitsFor: Stilordner zuerst (höheres Gewicht vorn), dann „alle“; gefiltert nach fits und Version', () => {
    const lib = createKitLibrary([modern, all, rusticB, door, rusticA, upperOnly]);
    expect(upperOnly.fits).toEqual({ storeys: ['upper'], sides: ['front'], minFacadeLength: 9, weight: 1 });
    expect(kitsFor(lib, 'window', 'rustic').map((k) => k.id)).toEqual(['kit:rustic/b', 'kit:rustic/a', 'kit:rustic/oben', 'kit:alle/standard']);
    expect(kitsFor(lib, 'window', 'rustic', { storey: 'ground' }).map((k) => k.id)).toEqual(['kit:rustic/b', 'kit:rustic/a', 'kit:alle/standard']);
    expect(kitsFor(lib, 'window', 'rustic', { storey: 'upper', side: 'front', facadeLength: 8 }).map((k) => k.id)).toEqual(['kit:rustic/b', 'kit:rustic/a', 'kit:alle/standard']);
    expect(kitsFor(lib, 'window', 'japanese').map((k) => k.id)).toEqual(['kit:alle/standard']);
    expect(kitsFor(lib, 'door', 'japanese').map((k) => k.id)).toEqual(['kit:alle/tuer']);
    expect(kitsFor(lib, 'balcony', 'rustic')).toEqual([]);
    expect(kitTemplates(lib, 'window', 'modern').map((t) => t.id)).toEqual(['kit:modern/band', 'kit:alle/standard']);
  });

  it('Kits mit Blöcken, die es in 1.21.1 nicht gibt, fallen dort weg', () => {
    const leafy = mustParse(input(kitModel(WINDOW_SIZE, [...WINDOW_BLOCKS, [3, 0, 0, s('pale_oak_leaves')]]), WINDOW_JSON, {}, 'alle', 'laub'));
    expect(leafy.versions[1]).toMatchObject({ minecraftVersion: '1.21.1', placeable: false, missing: ['minecraft:pale_oak_leaves'] });
    expect(cellAt(leafy, -1, -1, 1)?.props).toEqual({ persistent: 'true' });
    const lib = createKitLibrary([leafy, all]);
    expect(kitsFor(lib, 'window', 'rustic', { minecraftVersion: '1.21.11' }).map((k) => k.id)).toEqual(['kit:alle/laub', 'kit:alle/standard']);
    expect(kitsFor(lib, 'window', 'rustic', { minecraftVersion: '1.21.1' }).map((k) => k.id)).toEqual(['kit:alle/standard']);
    expect(() => kitCells(leafy, 'south', false, '1.21.1')).toThrow(/nicht verwendbar/);
  });

  it('ohne Kits: keine Vorlagen, die prozedurale Liste bleibt unverändert', () => {
    for (const part of ['window', 'door', 'balcony', 'dormer_front'] as const) expect(kitTemplates(EMPTY_KIT_LIBRARY, part, 'rustic')).toEqual([]);
    expect(kitsFor(EMPTY_KIT_LIBRARY, 'chimney_head', 'rustic')).toEqual([]);
  });
});

describe('Detail-Kits: Laden vom Server (MCB_KITS_DIR)', () => {
  const dirs: string[] = [];
  const saved = process.env.MCB_KITS_DIR;
  afterEach(() => {
    if (saved === undefined) delete process.env.MCB_KITS_DIR;
    else process.env.MCB_KITS_DIR = saved;
    clearKitCache();
    for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
  });
  const tempDir = () => {
    const d = mkdtempSync(join(tmpdir(), 'mcb-kits-'));
    dirs.push(d);
    return d;
  };

  it('fehlender oder leerer Ordner = leere Bibliothek ohne Fehler', async () => {
    const root = tempDir();
    process.env.MCB_KITS_DIR = join(root, 'gibt-es-nicht');
    expect(await loadKits()).toMatchObject({ library: EMPTY_KIT_LIBRARY, problems: [] });
    process.env.MCB_KITS_DIR = root;
    const result = await loadKits();
    expect(result.dir).toBe(root);
    expect(result.library.kits).toEqual([]);
    expect(result.problems).toEqual([]);
  });

  it('liest gültige Paare, meldet Probleme je Datei und nutzt den Cache bis sich etwas ändert', async () => {
    const root = tempDir();
    mkdirSync(join(root, 'rustic'));
    mkdirSync(join(root, 'alle'));
    mkdirSync(join(root, 'barock'));
    writeFileSync(join(root, 'README.md'), 'Hinweis');
    writeFileSync(join(root, 'rustic', 'fenster.schem'), schemBytes(kitModel(WINDOW_SIZE, WINDOW_BLOCKS)));
    writeFileSync(join(root, 'rustic', 'fenster.json'), WINDOW_JSON);
    writeFileSync(join(root, 'rustic', 'einzeln.schem'), schemBytes(kitModel(WINDOW_SIZE, WINDOW_BLOCKS)));
    writeFileSync(join(root, 'alle', 'tuer.schem'), schemBytes(kitModel(DOOR_SIZE, DOOR_BLOCKS)));
    writeFileSync(join(root, 'alle', 'tuer.json'), json({ part: 'door', opening: { width: 3, height: 2 }, anchor: [1, 1, 1] }));

    const first = await loadKits({ dir: root });
    expect(first.library.kits.map((k) => k.id)).toEqual(['kit:rustic/fenster']);
    expect(first.problems.map((p) => p.file)).toEqual(['alle/tuer.schem', 'barock/', 'rustic/einzeln.schem']);
    expect(first.problems[0]!.problems.join('\n')).toMatch(/Öffnung \(3 × 2\) ragt aus der Schematic/);
    expect(first.problems[2]!.problems).toEqual(['Die Beschreibung einzeln.json fehlt.']);
    expect(await loadKits({ dir: root })).toBe(first);

    // Fixed description with a new modification time → reloaded.
    const file = join(root, 'alle', 'tuer.json');
    writeFileSync(file, DOOR_JSON);
    utimesSync(file, new Date(2030, 0, 1), new Date(2030, 0, 1));
    const second = await loadKits({ dir: root });
    expect(second).not.toBe(first);
    expect(second.library.kits.map((k) => k.id)).toEqual(['kit:alle/tuer', 'kit:rustic/fenster']);
    expect(second.problems.map((p) => p.file)).toEqual(['barock/', 'rustic/einzeln.schem']);
  });
});

describe('Detail-Kits im Generator: Vorrang vor der prozeduralen Variante', () => {
  const windowKit = mustParse(input(kitModel(WINDOW_SIZE, WINDOW_BLOCKS), WINDOW_JSON, {}, 'rustic', 'fenster'));
  const doorKit = mustParse(input(kitModel(DOOR_SIZE, DOOR_BLOCKS), DOOR_JSON, {}, 'rustic', 'tuer'));
  const chimneyKit = mustParse(input(kitModel([3, 3, 3], CHIMNEY_BLOCKS), json({ part: 'chimney_head' }), { offset: [-1, 0, -1] }, 'rustic', 'kamin'));
  const kits = createKitLibrary([windowKit, doorKit, chimneyKit]);
  const house = (over: Partial<BuildSpec> = {}) => ({ ...DEFAULT_HOUSE_SPEC, style: 'rustic' as const, size: 'medium' as const, seed: 3, theme: 'none' as const, options: {}, ...over });

  it('ohne Kits bleibt jedes Bauwerk bitgleich', () => {
    for (const seed of [1, 2]) expect(generateBuilding(house({ seed }), { kits: EMPTY_KIT_LIBRARY }).hash).toBe(generateBuilding(house({ seed })).hash);
  });

  it('Fenster-, Tür- und Kamin-Kit werden eingesetzt, ohne Reparatur und ohne Lint-Befund', () => {
    const r = generateBuildingWithReport(house(), { kits });
    expect(r.repairs).toEqual([]);
    expect(lintHouse(r.model, r.house!)).toEqual([]);
    const used = r.house!.openings.templates;
    expect(used).toContain('kit:rustic/fenster');
    expect(used).toContain('kit:rustic/tuer');
    // The window kit's bracket block appears once per placed kit window.
    const brackets = r.model.indices.filter((i) => blockIdOf(r.model.palette[i]!) === 'minecraft:pale_oak_planks').length;
    expect(brackets).toBe(used.filter((id) => id === 'kit:rustic/fenster').length);
    // The front door is the kit's oak door.
    const d = r.house!.openings.doors[0]!;
    expect(blockIdOf(blockAt(r.model, d.x, d.y, d.z))).toBe('minecraft:oak_door');
    // The chimney head: brick walls of the kit around a lit campfire.
    expect(r.model.palette.some((st) => blockIdOf(st) === 'minecraft:brick_wall')).toBe(true);
  });

  it('gleiche Kits → gleiches Bauwerk; andere Kits → anderer Fingerabdruck und anderes Bauwerk', () => {
    const a = generateBuilding(house(), { kits });
    expect(generateBuilding(house(), { kits }).hash).toBe(a.hash);
    const onlyDoor = createKitLibrary([doorKit]);
    expect(onlyDoor.fingerprint).not.toBe(kits.fingerprint);
    expect(generateBuilding(house(), { kits: onlyDoor }).hash).not.toBe(a.hash);
  });

  it('in 1.21.1: Blöcke mit Ersatz werden übersetzt, Kits mit Blöcken ohne Ersatz fallen weg', () => {
    const r = generateBuildingWithReport(house({ targetMinecraftVersion: '1.21.1' }), { kits });
    expect(r.repairs).toEqual([]);
    // Pale oak planks have a stand-in in 1.21.1: the window kit is still used, without pale oak.
    expect(r.house!.openings.templates).toContain('kit:rustic/fenster');
    expect(r.model.palette.some((st) => st.includes('pale_oak'))).toBe(false);
    const leafy = mustParse(input(kitModel(WINDOW_SIZE, [...WINDOW_BLOCKS, [3, 0, 0, s('pale_oak_leaves')]]), WINDOW_JSON, {}, 'rustic', 'laub'));
    const old = generateBuildingWithReport(house({ targetMinecraftVersion: '1.21.1' }), { kits: createKitLibrary([leafy]) });
    expect(old.house!.openings.templates).not.toContain('kit:rustic/laub');
    expect(old.repairs).toEqual([]);
  });

  it('ein ausdrücklicher Fenster- oder Türwunsch geht vor den Kits', () => {
    const r = generateBuildingWithReport(house({ options: { windowFamily: 'arched', doorFamily: 'double' } }), { kits });
    expect(r.house!.openings.templates.filter((id) => id.startsWith('kit:'))).toEqual([]);
  });

  it('Variantenauswahl mit Kits: die gezeigten Modelle entsprechen der frischen Generierung', () => {
    const { models } = generateSelectedVariants(house({ seed: 5 }), 3, { kits });
    for (const m of models) expect(m.hash).toBe(generateBuilding({ ...house({ seed: 5 }), seed: m.spec.seed }, { kits }).hash);
  });
});
