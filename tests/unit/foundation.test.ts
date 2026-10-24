import { describe, expect, it } from 'vitest';
import { floatingBlocks, lintHouse } from '@/core/analysis/buildingLints';
import { AIR, blockIdOf } from '@/core/blocks/registry';
import { buildSpongeV3Nbt } from '@/core/export/writeSpongeV3';
import { generateBuildingWithReport } from '@/core/generator/generateBuilding';
import { buildOptionsSchema } from '@/core/schema/buildOptions';
import { DEFAULT_HOUSE_SPEC, type BuildSpec } from '@/core/schema/buildSpec';
import { aboveGround, blockAt } from '@/core/schema/voxelModel';

/**
 * Option „Fundament nach unten“ (Profi-Builds phase 4): the building is lifted by N layers, the
 * plinth continues downwards, earth fills the plot with an embankment and terrace steps at the
 * edge, and the export moves the paste point so the ground level stays the same.
 */

const spec = (over: Partial<BuildSpec>, options: BuildSpec['options'] = {}): BuildSpec => ({ ...DEFAULT_HOUSE_SPEC, theme: 'none', ...over, options });

describe('Fundament nach unten', () => {
  it('hebt das Bauwerk um N Lagen, darüber bleibt alles gleich', () => {
    const plain = generateBuildingWithReport(spec({ style: 'rustic', size: 'medium', seed: 1 }));
    const deep = generateBuildingWithReport(spec({ style: 'rustic', size: 'medium', seed: 1 }, { foundation: 2 }));
    const { width: W, height: H, length: L } = plain.model.dimensions;
    expect(deep.model.dimensions).toEqual({ width: W, height: H + 2, length: L });
    let differ = 0;
    for (let y = 0; y < H; y++) for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) if (blockAt(deep.model, x, y + 2, z) !== blockAt(plain.model, x, y, z)) differ++;
    expect(differ).toBe(0);
    expect(deep.repairs).toEqual([]);
    expect(lintHouse(deep.model, deep.house!)).toEqual([]);
    // The view from the ground layer up is the plain model.
    const view = aboveGround(deep.model);
    expect(view.dimensions).toEqual(plain.model.dimensions);
    expect(blockAt(view, 5, 0, 5)).toBe(blockAt(plain.model, 5, 0, 5));
  });

  it('der Sockel geht nach unten weiter, das Grundstück bekommt Erde und eine Böschung mit Stufen', () => {
    const r = generateBuildingWithReport(spec({ style: 'medieval', size: 'medium', seed: 2 }, { foundation: 3 }));
    const main = r.house!.plan.masses[0]!;
    const { x0, z0 } = main.rect;
    const ground = blockAt(r.model, x0, 3, z0);
    expect(ground).not.toBe(AIR);
    for (const y of [0, 1, 2]) expect(blockAt(r.model, x0, y, z0), `y=${y}`).toBe(ground);
    const ids = new Map<string, number>();
    const { width: W, length: L } = r.model.dimensions;
    for (let y = 0; y < 3; y++)
      for (let z = 0; z < L; z++)
        for (let x = 0; x < W; x++) {
          const id = blockIdOf(blockAt(r.model, x, y, z));
          ids.set(id, (ids.get(id) ?? 0) + 1);
        }
    expect(ids.get('minecraft:dirt') ?? 0).toBeGreaterThan(50);
    expect(ids.get('minecraft:coarse_dirt') ?? 0).toBeGreaterThan(10);
    // Terrace steps below the ground layer where the landscape dissolved the edge.
    expect(ids.get('minecraft:grass_block') ?? 0).toBeGreaterThan(0);
    expect(r.repairs).toEqual([]);
    expect(floatingBlocks(r.model)).toBe(0);
  });

  it('der Export verschiebt den Einfügepunkt: Offset [0, −N, 0]', () => {
    const offset = (n: number) => {
      const r = generateBuildingWithReport(spec({ size: 'small', seed: 1 }, n > 0 ? { foundation: n } : {}));
      const root = buildSpongeV3Nbt(r.model) as unknown as { value: { Schematic: { value: { Offset: { value: number[] } } } } };
      return root.value.Schematic.value.Offset.value;
    };
    expect(offset(0)).toEqual([0, 0, 0]);
    expect(offset(4)).toEqual([0, -4, 0]);
  });

  it('gilt für alle Bauwerkstypen, ist deterministisch und auf 0–4 Lagen begrenzt', () => {
    for (const kind of ['tree', 'market_stall', 'station', 'tower'] as const) {
      const plain = generateBuildingWithReport(spec({ kind, size: 'small', seed: 1, theme: 'christmas' }));
      const a = generateBuildingWithReport(spec({ kind, size: 'small', seed: 1, theme: 'christmas' }, { foundation: 1, snow: true }));
      const b = generateBuildingWithReport(spec({ kind, size: 'small', seed: 1, theme: 'christmas' }, { foundation: 1, snow: true }));
      expect(a.model.dimensions.height, kind).toBe(plain.model.dimensions.height + 1);
      expect(a.repairs, kind).toEqual([]);
      expect(floatingBlocks(a.model), kind).toBe(0);
      expect(a.model.hash, kind).toBe(b.model.hash);
      expect(a.notes.join(' '), kind).not.toContain('ohne Wirkung');
    }
    expect(buildOptionsSchema.safeParse({ foundation: 5 }).success).toBe(false);
    expect(buildOptionsSchema.safeParse({ foundation: -1 }).success).toBe(false);
    expect(buildOptionsSchema.safeParse({ foundation: 4 }).success).toBe(true);
  });
});
