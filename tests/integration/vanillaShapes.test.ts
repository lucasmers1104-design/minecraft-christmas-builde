import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Direction } from '@/core/blocks/directions';
import { faceMask } from '@/core/blocks/faces';
import { blockState, formatBlockState, isAvailableIn, listBlockDefinitions } from '@/core/blocks/registry';
import type { ShapeClass } from '@/core/blocks/shapes';
import { bakeBlockState, type Quad } from '@/core/textures/blockModel';
import { readClientJar } from '@/lib/textures/minecraftJar';

/**
 * Checks the app's shape geometry (used for connections, support rules and the colour
 * preview) against the real vanilla block models from the user's client jar: for every face
 * of the block, the area covered by model quads lying on that face must equal the area the
 * shape geometry covers. This catches wrong orientations (stairs corners, door sides, open
 * trapdoors) without trusting any notes.
 *
 * Runs only with a real client jar: MCB_MINECRAFT_JAR=/path/to/1.21.11.jar
 */

const realJar = process.env.MCB_MINECRAFT_JAR;

/** Shapes whose geometry is meant to match vanilla exactly on the block faces. */
const EXACT: readonly ShapeClass[] = ['cube', 'pillar', 'stairs', 'slab', 'fence', 'wall', 'pane', 'trapdoor', 'door', 'snow_layer', 'carpet', 'leaves', 'path', 'end_rod', 'lightning_rod'];
/* Not compared: chain (the model is two crossed planes; the collision box used for support matches
   vanilla's 6.5..9.5 box), and approximate shapes (campfire, candles, plants, buttons, gates). */

const FACES: readonly Direction[] = ['north', 'east', 'south', 'west', 'up', 'down'];

function quadMask(quads: readonly Quad[], dir: Direction): Uint16Array {
  const rows = new Uint16Array(16);
  const axis = dir === 'east' || dir === 'west' ? 0 : dir === 'up' || dir === 'down' ? 1 : 2;
  const plane = dir === 'east' || dir === 'up' || dir === 'south' ? 1 : 0;
  for (const q of quads) {
    if (!q.positions.every((p) => Math.abs(p[axis] - plane) < 1e-6)) continue;
    const [a, b]: [0 | 1 | 2, 0 | 1 | 2] = axis === 0 ? [2, 1] : axis === 1 ? [0, 2] : [0, 1];
    const as = q.positions.map((p) => p[a] * 16);
    const bs = q.positions.map((p) => p[b] * 16);
    const i0 = Math.round(Math.min(...as));
    const i1 = Math.round(Math.max(...as));
    const j0 = Math.round(Math.min(...bs));
    const j1 = Math.round(Math.max(...bs));
    const bits = ((1 << i1) - 1) & ~((1 << i0) - 1);
    for (let j = j0; j < j1; j++) rows[j] = rows[j]! | bits;
  }
  return rows;
}

function allStates(def: ReturnType<typeof listBlockDefinitions>[number]): Record<string, string>[] {
  return Object.entries(def.properties).reduce<Record<string, string>[]>(
    (acc, [k, values]) => acc.flatMap((c) => values.map((v) => ({ ...c, [k]: v }))),
    [{}],
  );
}

describe.skipIf(!realJar || !existsSync(realJar))('Formgeometrie gegen die echten Vanilla-Modelle (1.21.11)', () => {
  const pack = realJar && existsSync(realJar) ? readClientJar(readFileSync(realJar)) : null;

  it('die Randflächen jeder exakten Formklasse stimmen mit dem Modell überein', () => {
    let checked = 0;
    const seenShapes = new Set<ShapeClass>();
    for (const def of listBlockDefinitions()) {
      if (!EXACT.includes(def.shape) || !isAvailableIn(def.id, '1.21.11') || def.id === 'minecraft:air') continue;
      // One block per shape class with all its states is enough; plus every stairs block.
      if (seenShapes.has(def.shape) && def.shape !== 'stairs') continue;
      seenShapes.add(def.shape);
      for (const props of allStates(def)) {
        if (props.waterlogged === 'true') continue;
        const state = formatBlockState(def.id, props);
        const quads = bakeBlockState(def.id, props, pack!).quads;
        for (const dir of FACES) {
          // Door models omit the face between the two halves.
          if (def.shape === 'door' && ((props.half === 'upper' && dir === 'down') || (props.half === 'lower' && dir === 'up'))) continue;
          expect([...faceMask(state, dir, 'collision')], `${state} ${dir}`).toEqual([...quadMask(quads, dir)]);
        }
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it('Walmdach-Ecken: die hohe Seite der Ecktreppe zeigt zur Dachmitte', () => {
    // NW corner of a hip ring: facing=south, outer_left (notes); its top face covers the
    // south-east quarter, i.e. towards the roof centre.
    const nw = bakeBlockState('minecraft:oak_stairs', { facing: 'south', half: 'bottom', shape: 'outer_left', waterlogged: 'false' }, pack!).quads;
    const top = quadMask(nw, 'up');
    // Rows = z, bits = x (pixels 0..15). Step quarter: x 8..15, z 8..15.
    expect(top[12]! & 0xff00).toBe(0xff00);
    expect(top[12]! & 0x00ff).toBe(0);
    expect(top[2]).toBe(0);
    expect(blockState('oak_stairs', { facing: 'south', shape: 'outer_left' })).toContain('outer_left');
  });
});

describe.skipIf(!realJar || !existsSync(realJar))('Leiter-Ausrichtung gegen das Vanilla-Modell', () => {
  it('die Sprossen liegen auf der Seite gegenüber facing (wie die App-Geometrie)', () => {
    const pack = readClientJar(readFileSync(realJar!));
    for (const [facing, axis, side] of [['north', 2, 1], ['south', 2, 0], ['east', 0, 0], ['west', 0, 1]] as const) {
      const quads = bakeBlockState('minecraft:ladder', { facing, waterlogged: 'false' }, pack).quads;
      const coord = quads[0]!.positions[0]![axis];
      expect(Math.abs(coord - side), facing).toBeLessThan(0.2);
    }
  });
});
