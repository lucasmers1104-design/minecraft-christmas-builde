import { describe, expect, it } from 'vitest';
import { countMaterials } from '@/core/analysis/materialCounts';
import { blockIdOf } from '@/core/blocks/registry';
import { buildMarketStall } from '@/core/generator/buildMarketStall';
import { buildStation } from '@/core/generator/buildStation';
import { buildTree } from '@/core/generator/buildTree';
import { generateBuilding, generateVariants, generationNotes } from '@/core/generator/generateBuilding';
import {
  BUILD_SIZES,
  BUILD_STYLES,
  COLOR_THEMES,
  DEFAULT_HOUSE_SPEC,
  DETAIL_LEVELS,
  MATERIAL_THEMES,
  type BuildingType,
  type BuildSpec,
} from '@/core/schema/buildSpec';
import { blockAt, collectVoxelIssues } from '@/core/schema/voxelModel';
import { countFloatingBlocks, idAt, isAir } from '../helpers/houseInspection';

const spec = (kind: BuildingType, patch: Partial<BuildSpec> = {}): BuildSpec => ({ ...DEFAULT_HOUSE_SPEC, kind, ...patch });

describe.each(['tree', 'market_stall', 'station'] as const)('Bauwerkstyp %s', (kind) => {
  it('alle Kombinationen sind gültig, in den Grenzen und ohne schwebende Blöcke', () => {
    const failures: string[] = [];
    for (const size of BUILD_SIZES)
      for (const style of BUILD_STYLES)
        for (const materialTheme of MATERIAL_THEMES)
          for (const colorTheme of COLOR_THEMES)
            for (const detailLevel of DETAIL_LEVELS) {
              const s = spec(kind, { size, style, materialTheme, colorTheme, detailLevel });
              const m = generateBuilding(s);
              const issues = [...collectVoxelIssues(m)];
              const floating = countFloatingBlocks(m);
              if (floating > 0) issues.push(`${floating} schwebende Blöcke`);
              if (issues.length > 0) failures.push(`${size}/${style}/${materialTheme}/${colorTheme}/${detailLevel}: ${issues.join('; ')}`);
            }
    expect(failures).toEqual([]);
  });

  it('ist deterministisch; Seeds variieren Details', () => {
    const a = generateBuilding(spec(kind));
    expect(generateBuilding(spec(kind)).hash).toBe(a.hash);
    const hashes = generateVariants(spec(kind)).map((m) => m.hash);
    expect(new Set(hashes).size).toBe(3);
  });

  it('Größe, Stil, Farbe und Schalter verändern das Modell', () => {
    const base = generateBuilding(spec(kind));
    for (const patch of [
      { size: 'small' as const },
      { size: 'large' as const },
      { colorTheme: 'ice_blue' as const },
      { options: { snow: false } },
      { options: { lights: false } },
    ]) {
      expect(generateBuilding(spec(kind, patch)).hash, JSON.stringify(patch)).not.toBe(base.hash);
    }
  });
});

describe('Weihnachtsbaum', () => {
  it('Stamm durchgehend, Stufen verjüngen sich, Stern ganz oben', () => {
    for (const size of BUILD_SIZES) {
      const s = spec('tree', { size });
      const { builder, layout } = buildTree(s);
      const m = builder.toModel(s);
      const c = layout.center;
      for (let y = 1; y <= layout.trunkTop; y++) expect(blockIdOf(blockAt(m, c, y, c)), `${size} y=${y}`).toBe('minecraft:spruce_log');
      expect(idAt(m, c, layout.starY, c)).toBe('minecraft:gold_block');
      // Within each tier the radius shrinks; overall the top is narrower than the bottom.
      const radii = layout.radiusAt.filter((r) => r > 0);
      expect(radii[0]!).toBeGreaterThan(radii.at(-1)!);
      for (let i = 0; i < layout.tierStarts.length - 1; i++) {
        expect(layout.radiusAt[layout.tierStarts[i + 1]!]!).toBeLessThanOrEqual(layout.radiusAt[layout.tierStarts[i]!]!);
      }
      expect(m.dimensions.height).toBeLessThanOrEqual(32);
    }
  });

  it('enthält Schmuck, Lichter und Geschenke im festlichen Stil', () => {
    const m = generateBuilding(spec('tree', { detailLevel: 3 }));
    const ids = new Set(countMaterials(m).byBlock.map((b) => b.blockId));
    expect(ids).toContain('minecraft:glowstone');
    expect(ids).toContain('minecraft:red_wool');
    expect(ids).toContain('minecraft:snow_block');
  });
});

describe('Marktstand', () => {
  it('Anzahl Buden je Größe, Theke, freier Platz dahinter, Dach über allem', () => {
    for (const [size, booths] of [
      ['small', 1],
      ['medium', 2],
      ['large', 3],
    ] as const) {
      const s = spec('market_stall', { size });
      const { builder, layout } = buildMarketStall(s);
      const m = builder.toModel(s);
      expect(layout.booths).toHaveLength(booths);
      for (const b of layout.booths) {
        const mid = Math.round((b.x0 + b.x1) / 2);
        expect(isAir(m, mid, layout.counterY, layout.front)).toBe(false); // counter
        expect(isAir(m, mid, layout.counterY + 1, layout.front)).toBe(true); // serving hatch
        expect(isAir(m, mid, 3, layout.front)).toBe(true); // open front
        expect(isAir(m, mid, 1, layout.front + 1)).toBe(true); // vendor space
        expect(isAir(m, mid, 2, layout.front + 1)).toBe(true);
        let roofed = false;
        for (let y = layout.roofBaseY; y < m.dimensions.height; y++) if (!isAir(m, mid, y, layout.front + 1)) roofed = true;
        expect(roofed).toBe(true);
      }
      // Striped roof: two alternating roof colours.
      expect(countMaterials(m).byBlock.map((e) => e.blockId)).toEqual(expect.arrayContaining(['minecraft:red_wool', 'minecraft:white_wool']));
    }
  });
});

describe('Bahnhof', () => {
  it('Gleise mit echten Schienen auf festem Grund, Bahnsteig, Gebäude mit Tür zum Bahnsteig', () => {
    for (const size of BUILD_SIZES) {
      const s = spec('station', { size });
      const { builder, layout } = buildStation(s);
      const m = builder.toModel(s);
      expect(layout.tracks).toHaveLength(size === 'large' ? 2 : 1);
      for (const t of layout.tracks)
        for (let x = 0; x < m.dimensions.width; x++) {
          expect(blockAt(m, x, 1, t.z)).toBe('minecraft:rail[shape=east_west,waterlogged=false]');
          expect(isAir(m, x, 0, t.z)).toBe(false); // rails need a solid block below
        }
      const d = layout.door;
      for (let y = d.yFrom; y <= d.yTo; y++) {
        expect(isAir(m, d.x, y, d.z)).toBe(true);
        expect(isAir(m, d.x, y, d.z - 1)).toBe(true); // platform side
        expect(isAir(m, d.x, y, d.z + 1)).toBe(true); // inside
      }
      expect(isAir(m, d.x, 1, d.z - 1)).toBe(false); // platform surface in front of the door
      const p = layout.platform;
      expect(idAt(m, p.x0 + 3, 1, p.z0)).toBe('minecraft:yellow_concrete');
      for (const x of layout.canopyPosts) expect(isAir(m, x, 6, p.z0 + 1)).toBe(false); // canopy roof
    }
  });
});

describe('Hinweise zu Optionen', () => {
  it('meldet Haus-Optionen, die bei anderen Bauwerken keine Wirkung haben', () => {
    expect(generationNotes(spec('tree', { options: { tower: 'left', width: 15 } })).join()).toMatch(/Turm.*Breite|Breite.*Turm/);
    expect(generationNotes(spec('house', { options: { tower: 'left' } }))).toEqual([]);
  });
});
