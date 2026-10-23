import { describe, expect, it } from 'vitest';
import { floatingBlocks, resolverChanges } from '@/core/analysis/buildingLints';
import { blockIdOf, blockState, checkBlockState, definitionOf, propsOf } from '@/core/blocks/registry';
import { generateBuilding, generateBuildingWithReport } from '@/core/generator/generateBuilding';
import { resolveHouseInput } from '@/core/generator/house/resolveInput';
import { buildMarket, hutZ, type HutPlan, type MarketLayout } from '@/core/generator/marketStall';
import { createSeededRandom } from '@/core/generator/seededRandom';
import { DEFAULT_HOUSE_SPEC, STYLE_IDS, type BuildSpec } from '@/core/schema/buildSpec';
import { blockAt, type VoxelModel } from '@/core/schema/voxelModel';
import { STALL_STYLES, WARE_THEMES } from '@/core/templates/stalls';
import { getBlockDefinition } from '@/core/blocks/registry';

const SIZES = ['small', 'medium', 'large', 'huge'] as const;
const spec = (over: Partial<BuildSpec> = {}): BuildSpec => ({ ...DEFAULT_HOUSE_SPEC, kind: 'market_stall', ...over, options: {} });

/** The market exactly as generateBuilding builds it, plus its layout. */
function market(s: BuildSpec): { model: VoxelModel; layout: MarketLayout } {
  const rng = createSeededRandom(s.seed);
  const input = resolveHouseInput(s.style, s.theme, s.size, s.detailLevel, s.seed, s.targetMinecraftVersion, {}, rng);
  const { builder, layout } = buildMarket(
    {
      style: s.style,
      theme: s.theme,
      size: s.size,
      materials: input.materials,
      seed: s.seed,
      minecraftVersion: s.targetMinecraftVersion,
      detailLevel: s.detailLevel,
      lantern: input.lantern,
      garland: s.theme === 'christmas',
      presents: s.theme === 'christmas',
    },
    rng.fork('market'),
  );
  return { model: builder.finalize(s).model, layout };
}

const SMALL_WARE = (state: string) => ['candle', 'potted', 'lantern', 'carpet', 'trapdoor'].includes(definitionOf(state).shape);
const FULL_WARES = new Set(['barrel', 'bookshelf', 'pumpkin', 'melon', 'hay_block', 'spruce_leaves', 'azalea_leaves', 'terracotta', 'crafting_table', 'spruce_log'].map((id) => `minecraft:${id}`));

/** Neighbours: opposite huts and huts side by side in a row. */
function neighbours(huts: readonly HutPlan[]): [HutPlan, HutPlan][] {
  const out: [HutPlan, HutPlan][] = [];
  for (const a of huts)
    for (const b of huts) {
      if (b.index <= a.index) continue;
      if ((a.index % 2 === 0 && b.index === a.index + 1) || b.index === a.index + 2) out.push([a, b]);
    }
  return out;
}

describe('Weihnachtsmarkt: Vorlagen', () => {
  it('alle Budenblöcke und Waren gibt es in beiden Profilen', () => {
    const ids = new Set<string>();
    for (const s of Object.values(STALL_STYLES)) {
      for (const id of [s.post, s.lintel, s.board, s.shelf, s.floor, s.fence, s.door, ...s.walls.map((w) => w.block)]) ids.add(id);
    }
    for (const t of WARE_THEMES) for (const w of [...t.counter, ...t.shelf, ...t.storage]) ids.add(w.id);
    for (const id of ids) {
      expect(getBlockDefinition(`minecraft:${id}`), id).toBeDefined();
      for (const v of ['1.21.11', '1.21.1']) expect(checkBlockState(blockState(id), v).ok, `${id} ${v}`).toBe(true);
    }
  });

  it('Thekenwaren sind alle kleiner als ein halber Block', () => {
    for (const t of WARE_THEMES) for (const w of t.counter) expect(w.small, `${t.id} ${w.id}`).toBe(true);
  });
});

describe('Weihnachtsmarkt: alle Stile, Größen und Themen', () => {
  it.each(STYLE_IDS.map((s) => [s]))('%s: gültig, ohne Reparaturen, nichts schwebt, Resolver-Fixpunkt', (style) => {
    for (const size of SIZES)
      for (const theme of ['none', 'winter', 'christmas'] as const) {
        const r = generateBuildingWithReport(spec({ style, size, theme }));
        const label = `${style} ${size} ${theme}`;
        expect(r.repairs, label).toEqual([]);
        expect(floatingBlocks(r.model), label).toBe(0);
        expect(resolverChanges(r.model), label).toBe(0);
        for (const state of r.model.palette) expect(checkBlockState(state, '1.21.11').ok, state).toBe(true);
      }
  });

  it('Profil 1.21.1 ohne Reparaturen (chain statt iron_chain)', () => {
    const r = generateBuildingWithReport(spec({ size: 'large', targetMinecraftVersion: '1.21.1' }));
    expect(r.repairs).toEqual([]);
    expect(r.model.palette.some((s) => blockIdOf(s) === 'minecraft:chain')).toBe(true);
  });

  it('ist deterministisch', () => {
    const s = spec({ size: 'huge', style: 'nordic', seed: 7 });
    expect(generateBuilding(s).hash).toBe(generateBuilding(s).hash);
  });
});

describe('Weihnachtsmarkthütte (Bericht 17, Empfehlung 5)', () => {
  it('im Thema Weihnachten nirgends ein red_nether_brick-Dach', () => {
    for (const style of STYLE_IDS)
      for (const size of SIZES) {
        const m = generateBuilding(spec({ style, size }));
        expect(m.palette.filter((s) => s.includes('red_nether_brick')), `${style} ${size}`).toEqual([]);
      }
  });

  it('Satteldach mit Giebel zur Gasse, Auslage-Falltür bei d=+1, Innenlaterne, Überstand 1–2', () => {
    for (const style of STYLE_IDS)
      for (const size of SIZES) {
        const { model, layout } = market(spec({ style, size, seed: 3 }));
        for (const h of layout.huts) {
          const label = `${style} ${size} Bude ${h.index}`;
          expect([1, 2], label).toContain(h.overhangFront);
          // Display: closed top trapdoors in front of the parapet.
          for (let u = 1; u < h.width - 1; u++) {
            const s = blockAt(model, h.x0 + u, 1, hutZ(h, 1));
            expect(definitionOf(s).shape, label).toBe('trapdoor');
            expect(propsOf(s).half, label).toBe('top');
            expect(propsOf(s).open, label).toBe('false');
          }
          // Gable towards the lane: the ridge runs along z, so the centre column is highest at the front.
          const xc = h.x0 + (h.width - 1) / 2;
          const topAt = (x: number) => {
            for (let y = model.dimensions.height - 1; y > 0; y--) if (blockAt(model, x, y, h.zFront) !== 'minecraft:air') return y;
            return 0;
          };
          expect(topAt(xc), label).toBeGreaterThan(topAt(h.x0));
          // A light inside: a lantern between the walls.
          let lantern = false;
          for (let u = 1; u < h.width - 1; u++)
            for (let d = 1; d < h.depth - 1; d++)
              for (let y = 1; y <= h.wallHeight; y++) if (blockIdOf(blockAt(model, h.x0 + u, y, hutZ(h, -d))).endsWith('lantern')) lantern = true;
          expect(lantern, label).toBe(true);
        }
      }
  });

  it('Tannengrün mit warmem Licht an Traufe und Ortgang (nur Weihnachten)', () => {
    const { model, layout } = market(spec({ size: 'medium' }));
    for (const h of layout.huts) {
      const zVerge = hutZ(h, h.overhangFront);
      let green = 0;
      let light = 0;
      for (let x = h.x0 - 1; x <= h.x0 + h.width; x++)
        for (let y = 1; y < model.dimensions.height; y++) {
          const id = blockIdOf(blockAt(model, x, y, zVerge));
          if (id === 'minecraft:spruce_leaves') green++;
          if (id === 'minecraft:glowstone' || id === 'minecraft:ochre_froglight') light++;
        }
      expect(green, `Ortgang Bude ${h.index}`).toBeGreaterThan(2);
      expect(light, `Ortgang Bude ${h.index}`).toBeGreaterThan(0);
    }
    const none = generateBuilding(spec({ size: 'medium', theme: 'none' }));
    expect(none.palette.some((s) => s.includes('spruce_leaves'))).toBe(false);
  });
});

describe('Buden und Waren (Bericht 17, Empfehlung 6; Bericht 19, Empfehlung 12)', () => {
  it('mindestens 70 % der Thekenwaren sind klein; Vollblock-Waren nur bei d ≤ −2', () => {
    for (const style of STYLE_IDS)
      for (const theme of ['none', 'christmas'] as const) {
        const { model, layout } = market(spec({ style, size: 'huge', theme }));
        let small = 0;
        let total = 0;
        for (const h of layout.huts) {
          for (let u = 1; u < h.width - 1; u++)
            for (const d of [0, 1]) {
              const s = blockAt(model, h.x0 + u, 2, hutZ(h, d));
              if (s === 'minecraft:air') continue;
              total++;
              if (SMALL_WARE(s)) small++;
            }
          // Full-block wares inside the hut only at the back (d ≤ −2).
          for (let u = 1; u < h.width - 1; u++)
            for (let d = 0; d >= -(h.depth - 2); d--)
              for (let y = 1; y <= h.wallHeight; y++) {
                const id = blockIdOf(blockAt(model, h.x0 + u, y, hutZ(h, d)));
                if (FULL_WARES.has(id)) expect(d, `${style} ${theme} Bude ${h.index} ${id}`).toBeLessThanOrEqual(-2);
              }
        }
        expect(total, `${style} ${theme}`).toBeGreaterThan(0);
        expect(small / total, `${style} ${theme}`).toBeGreaterThanOrEqual(0.7);
      }
  });

  it('Nachbarn unterscheiden sich in Wand, Dach und Warenthema und in Breite oder Höhe; keine zwei gleichen Buden', () => {
    for (const style of STYLE_IDS)
      for (const seed of [1, 2, 3]) {
        const { layout } = market(spec({ style, size: 'huge', seed }));
        for (const [a, b] of neighbours(layout.huts)) {
          const label = `${style} ${seed}: Bude ${a.index}/${b.index}`;
          const diffs = [a.wall.id !== b.wall.id, a.roof !== b.roof, a.wares.id !== b.wares.id].filter(Boolean).length;
          expect(diffs, label).toBeGreaterThanOrEqual(2);
          expect(a.width !== b.width || a.wallHeight !== b.wallHeight, label).toBe(true);
        }
        const boxes = layout.huts.map((h) => `${h.width}x${h.depth}x${h.ridgeY}`);
        expect(new Set(boxes).size, `${style} ${seed}`).toBe(boxes.length);
      }
  });

  it('zwischen den Dachüberständen benachbarter Buden bleibt Luft', () => {
    for (const style of STYLE_IDS) {
      const { layout } = market(spec({ style, size: 'huge' }));
      for (const row of [0, 1]) {
        const huts = layout.huts.filter((h) => h.index % 2 === row).sort((a, b) => a.x0 - b.x0);
        for (let i = 1; i < huts.length; i++) {
          const left = huts[i - 1]!;
          const right = huts[i]!;
          // Roofs span x0 − 1 … x1 + 1; at least one free column in between.
          expect(right.x0 - 1 - (left.x0 + left.width), style).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });
});

describe('Budengasse (Bericht 17, Empfehlung 13; Bericht 18, Empfehlung 13)', () => {
  it('ab Größe large ein Platz von mindestens 9 × 9 mit Baum, Geschenke nur dort', () => {
    for (const size of ['large', 'huge'] as const) {
      const { model, layout } = market(spec({ size }));
      const p = layout.plaza!;
      expect(p.x1 - p.x0 + 1).toBeGreaterThanOrEqual(9);
      expect(p.z1 - p.z0 + 1).toBeGreaterThanOrEqual(9);
      expect(blockIdOf(blockAt(model, p.treeX, 1, p.treeZ))).toBe('minecraft:spruce_log');
      expect(layout.presents.length).toBeGreaterThanOrEqual(3);
      for (const g of layout.presents) expect(g.x >= p.x0 && g.x <= p.x1 && g.z >= p.z0 && g.z <= p.z1).toBe(true);
      // No wool cube (present) anywhere in the lane.
      for (let x = 0; x < p.x0; x++)
        for (let z = layout.lane.z0; z <= layout.lane.z1; z++) expect(blockIdOf(blockAt(model, x, 1, z)).endsWith('_wool'), `${size} ${x},${z}`).toBe(false);
    }
    expect(market(spec({ size: 'medium' })).layout.plaza).toBeNull();
  });

  it('Lichterketten über die Gasse von Giebel zu Giebel, je Budenpaar eine', () => {
    for (const size of ['medium', 'large', 'huge'] as const) {
      const { model, layout } = market(spec({ size }));
      expect(layout.chains.length, size).toBe(Math.ceil(layout.huts.length / 2));
      for (const c of layout.chains) {
        let lights = 0;
        for (let z = c.z0; z <= c.z1; z++) {
          const s = blockAt(model, c.x, c.y, z);
          const id = blockIdOf(s);
          if (id === 'minecraft:iron_chain') expect(propsOf(s).axis).toBe('z');
          else if (id === 'minecraft:glowstone' || id === 'minecraft:ochre_froglight') lights++;
        }
        expect(lights, size).toBeGreaterThan(0);
      }
    }
  });

  it('keine Laterne hängt unter einer waagerechten Kette (alle Stile und Größen)', () => {
    for (const style of STYLE_IDS)
      for (const size of SIZES) {
        const m = generateBuilding(spec({ style, size }));
        const { width, height, length } = m.dimensions;
        for (let y = 1; y < height - 1; y++)
          for (let z = 0; z < length; z++)
            for (let x = 0; x < width; x++) {
              const s = blockAt(m, x, y, z);
              if (definitionOf(s).shape !== 'lantern' || propsOf(s).hanging !== 'true') continue;
              const above = blockAt(m, x, y + 1, z);
              const horizontalChain = definitionOf(above).shape === 'chain' && propsOf(above).axis !== 'y';
              expect(horizontalChain, `${style} ${size} ${x},${y},${z}`).toBe(false);
            }
      }
  });

  it('Mehrarm-Laternenpfahl am Gassenende, Lichtbudget eingehalten', () => {
    const budget = { medium: [5, 8], large: [8, 12], huge: [12, 18] } as const;
    for (const size of ['medium', 'large', 'huge'] as const) {
      const { model, layout } = market(spec({ size }));
      expect(layout.lampPosts.some((p) => p.arms === 4), size).toBe(true);
      // Visible light sources outside garland, chains and tree: hanging lanterns (18, budget per size).
      const lanterns = model.palette.filter((s) => blockIdOf(s).endsWith('lantern') && propsOf(s).hanging === 'true');
      let count = 0;
      for (let i = 0; i < model.indices.length; i++) if (lanterns.includes(model.palette[model.indices[i]!]!)) count++;
      expect(count, size).toBeGreaterThanOrEqual(budget[size][0]);
      expect(count, size).toBeLessThanOrEqual(budget[size][1]);
    }
  });
});
