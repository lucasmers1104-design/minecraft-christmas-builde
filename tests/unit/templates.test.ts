import { describe, expect, it } from 'vitest';
import type { HorizontalDirection } from '@/core/blocks/directions';
import { AIR, blockIdOf, blockState, checkBlockState, profileBlockId, propsOf } from '@/core/blocks/registry';
import type { Repair } from '@/core/blocks/validator';
import { Priority, VoxelBuilder } from '@/core/generator/geometry';
import { DEFAULT_HOUSE_SPEC } from '@/core/schema/buildSpec';
import { blockAt, type VoxelModel } from '@/core/schema/voxelModel';
import { formOf } from '@/core/style/materials';
import { PALETTES, ROLES, type Palette, type Role } from '@/core/style/palettes';
import { STYLE_IDS, STYLES, type StyleId } from '@/core/style/styles';
import { TEMPLATES, baseTemplateId, getTemplate, templateBounds, templatesFor } from '@/core/templates/catalog';
import { cellPosition, placeTemplate, templateFits, type FacadeFrame, type RoleMaterials } from '@/core/templates/place';
import type { FacadeTemplate, TemplateCell } from '@/core/templates/types';

const VERSIONS = ['1.21.11', '1.21.1'] as const;
const DIRECTIONS: readonly HorizontalDirection[] = ['south', 'west', 'north', 'east'];

/** First material of every role (what a building of this palette uses most often). */
function materialsOf(p: Palette): RoleMaterials {
  return Object.fromEntries(ROLES.map((r) => [r, p.roles[r][0]![0]])) as RoleMaterials;
}

/** Palettes of every style that uses the template; unused templates must work with all palettes. */
function palettesFor(t: FacadeTemplate): readonly Palette[] {
  if (t.styles.length === 0) return PALETTES;
  const ids = new Set(t.styles.flatMap((s) => STYLES[s].palettes));
  return PALETTES.filter((p) => ids.has(p.id));
}

function listOf(styleId: StyleId, kind: FacadeTemplate['kind']): readonly string[] {
  return kind === 'window' ? STYLES[styleId].windows : STYLES[styleId].doors;
}

const roleOf = (c: TemplateCell): Role => (c.role === 'glass' ? 'window' : (c.role as Role));
const isRoleCell = (c: TemplateCell) => !c.block && c.role !== 'air';

/** Cell description after mirroring left/right (positions and handed properties). */
function mirroredKey(t: FacadeTemplate, c: TemplateCell, mirror: boolean): string {
  const props: Record<string, string> = { ...(c.props ?? {}) };
  if (mirror) {
    if (props.facing === 'east') props.facing = 'west';
    else if (props.facing === 'west') props.facing = 'east';
    if (props.hinge) props.hinge = props.hinge === 'left' ? 'right' : 'left';
  }
  const x = mirror ? t.width - 1 - c.x : c.x;
  const p = Object.keys(props)
    .sort()
    .map((k) => `${k}=${props[k]}`)
    .join(',');
  return `${x},${c.y},${c.d}|${c.role}|${c.form ?? ''}|${c.block ?? ''}|${p}`;
}

function isSymmetric(t: FacadeTemplate): boolean {
  const plain = t.cells.map((c) => mirroredKey(t, c, false)).sort();
  const mirrored = t.cells.map((c) => mirroredKey(t, c, true)).sort();
  return JSON.stringify(plain) === JSON.stringify(mirrored);
}

interface Scene {
  model: VoxelModel;
  repairs: Repair[];
  frame: FacadeFrame;
  fits: boolean;
}

/**
 * Dummy facade around the template, built in canonical coordinates and rotated with the same
 * mapping as the templates: ground at y = −2, interior floor at y = −1 (d < 0), wall in the
 * plane d = 0 (plinth row y = −1, wall above, reaching 2 rows above the template), the opening
 * cleared, then the template placed and the whole grid finalized (resolver + validator).
 */
function buildScene(t: FacadeTemplate, palette: Palette, outward: HorizontalDirection, mirror: boolean, version: string): Scene {
  const b = templateBounds(t);
  const left = b.minX - 3;
  const right = b.maxX + 3;
  // Symmetric around the opening centre, so mirroring maps the facade onto itself.
  const xlo = Math.min(left, t.width - 1 - right);
  const xhi = Math.max(right, t.width - 1 - left);
  const dlo = Math.min(-2, b.minD - 1);
  const dhi = Math.max(2, b.maxD + 2);
  const ylo = Math.min(-2, b.minY - 1);
  const yhi = b.maxY + 2;
  const r = Math.max(-xlo, xhi, -dlo, dhi);
  const builder = new VoxelBuilder({ width: 2 * r + 1, height: yhi - ylo + 1, length: 2 * r + 1 });
  const origin = { x: r, y: -ylo, z: r };
  const frame: FacadeFrame = { origin, outward, mirror };
  const plain: FacadeFrame = { origin, outward };
  const materials = materialsOf(palette);
  const block = (role: Role) => blockState(formOf(materials[role], 'block')!);
  const put = (x: number, y: number, d: number, state: string) => {
    const p = cellPosition(t, { x, y, d }, plain);
    builder.setBlock(p.x, p.y, p.z, state, Priority.STRUCTURE);
  };
  const dirt = blockState('dirt');
  for (let x = xlo; x <= xhi; x++) {
    for (let d = dlo; d <= dhi; d++) put(x, -2, d, dirt);
    for (let d = dlo; d <= -1; d++) put(x, -1, d, block('floor'));
    put(x, -1, 0, block('plinth'));
    for (let y = 0; y <= yhi; y++) put(x, y, 0, block('wall'));
  }
  for (let x = 0; x < t.width; x++) for (let y = 0; y < t.height; y++) put(x, y, 0, AIR);
  const fits = templateFits(builder, t, frame);
  placeTemplate(builder, t, frame, materials, version);
  const { model, repairs } = builder.finalize({ ...DEFAULT_HOUSE_SPEC, targetMinecraftVersion: version });
  return { model, repairs, frame, fits };
}

function stateAt(t: FacadeTemplate, scene: Scene, x: number, y: number, d: number): string {
  const p = cellPosition(t, { x, y, d }, scene.frame);
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

describe('Fenster- und Türvorlagen: Katalog', () => {
  it('kanonische IDs W01–W18 und T01–T10 existieren, IDs sind eindeutig, Varianten folgen ihrer Grundvorlage', () => {
    for (let i = 1; i <= 18; i++) expect(getTemplate(`W${String(i).padStart(2, '0')}`).kind).toBe('window');
    for (let i = 1; i <= 10; i++) expect(getTemplate(`T${String(i).padStart(2, '0')}`).kind).toBe('door');
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
    for (const t of TEMPLATES) {
      const base = getTemplate(baseTemplateId(t.id));
      expect(t.kind, t.id).toBe(base.kind);
      expect(t.styles, t.id).toEqual(base.styles);
      expect(t.id.startsWith(t.kind === 'window' ? 'W' : 'T'), t.id).toBe(true);
      expect(t.label.length, t.id).toBeGreaterThan(5);
      expect(t.spacing, t.id).toBeGreaterThanOrEqual(1);
      expect(t.width * t.height, t.id).toBeGreaterThan(0);
    }
    expect(() => getTemplate('W99')).toThrow(/Unbekannte/);
  });

  it('Stilzuordnung der Vorlagen stimmt mit den Listen in styles.ts überein', () => {
    for (const t of TEMPLATES) {
      const expected = STYLE_IDS.filter((s) => listOf(s, t.kind).includes(baseTemplateId(t.id)));
      expect([...t.styles].sort(), t.id).toEqual([...expected].sort());
    }
    for (const s of STYLE_IDS) {
      for (const kind of ['window', 'door'] as const) {
        for (const id of listOf(s, kind)) expect(getTemplate(id).kind, `${s} ${id}`).toBe(kind);
        const found = templatesFor(kind, s);
        expect(found.length, `${s} ${kind}`).toBeGreaterThanOrEqual(listOf(s, kind).length);
        expect(found.every((t) => t.kind === kind && t.styles.includes(s))).toBe(true);
        // Order follows the style list: first entry belongs to the first listed template.
        expect(baseTemplateId(found[0]!.id)).toBe(listOf(s, kind)[0]);
      }
    }
  });

  it('Zellen: keine doppelten Positionen, nur Registry-Blöcke, keine vom Resolver berechneten Eigenschaften, keine Block-Entities', () => {
    const blockEntity = /(banner|sign|bell|campfire|chest|barrel|shelf|decorated_pot|lectern|item_frame|painting|armor_stand)/;
    for (const t of TEMPLATES) {
      const seen = new Set<string>();
      for (const c of t.cells) {
        const key = `${c.x},${c.y},${c.d}`;
        expect(seen.has(key), `${t.id} doppelt ${key}`).toBe(false);
        seen.add(key);
        const props = c.props ?? {};
        for (const computed of ['shape', 'north', 'east', 'south', 'west', 'up', 'distance', 'waterlogged']) expect(props[computed], `${t.id} ${key} ${computed}`).toBeUndefined();
        if (c.form === 'door') expect(props.half, `${t.id} ${key}`).toBe('lower');
        expect(props.half === 'upper', `${t.id} ${key}`).toBe(false);
        if (c.block) {
          expect(c.block, `${t.id} ${key}`).not.toMatch(blockEntity);
          expect(c.block.includes(':'), `${t.id} ${key}`).toBe(false);
          for (const v of VERSIONS) expect(() => blockState(profileBlockId(c.block!, v), props), `${t.id} ${c.block} ${v}`).not.toThrow();
        }
      }
    }
  });

  it('jede Rollenform löst sich für alle gewichteten Materialien der zugehörigen Paletten auf', () => {
    for (const t of TEMPLATES) {
      for (const palette of palettesFor(t)) {
        for (const c of t.cells.filter(isRoleCell)) {
          const form = c.form ?? 'block';
          for (const [material] of palette.roles[roleOf(c)]) {
            const id = formOf(material, form) ?? (form === 'pillar' ? formOf(material, 'block') : null);
            expect(id, `${t.id} ${palette.id} ${c.role}/${form} (${material})`).not.toBeNull();
          }
        }
      }
    }
  });

  it('Gestaltungsregeln: Fenster haben Tiefe und Glas, Türen Laternen, Stufe/Schwelle und freien Weg', () => {
    for (const t of TEMPLATES) {
      expect(t.cells.some((c) => c.d >= 1 && c.role !== 'air'), `${t.id} ohne Tiefenelement`).toBe(true);
      if (t.kind === 'window') {
        const glass = t.cells.filter((c) => c.role === 'glass');
        expect(glass.length, t.id).toBeGreaterThan(0);
        expect(glass.every((c) => c.d >= 0), `${t.id}: Glas nie innen`).toBe(true);
      } else {
        const doors = t.cells.filter((c) => c.form === 'door');
        expect(doors.length, t.id).toBe(t.width);
        const lanterns = t.cells.filter((c) => c.block === 'lantern');
        expect(lanterns.length, `${t.id}: Laternen beidseitig`).toBeGreaterThanOrEqual(2);
        for (const door of doors) {
          const below = t.cells.find((c) => c.x === door.x && c.y === -1 && c.d === 0);
          expect(below?.role, `${t.id}: voller Block unter der Tür`).toBe('plinth');
          for (const y of [0, 1]) {
            for (const d of [1, -1]) expect(t.cells.find((c) => c.x === door.x && c.y === y && c.d === d)?.role, `${t.id} ${y}/${d}`).toBe('air');
          }
        }
        // Double doors hinge on the outer sides.
        if (doors.length === 2) expect(doors.map((c) => c.props?.hinge)).toEqual(['right', 'left']);
      }
    }
  });
});

describe('Fenster- und Türvorlagen im Spiel gültig (alle Paletten × 4 Richtungen × gespiegelt × 1.21.11/1.21.1)', () => {
  it.each(TEMPLATES.map((t) => [t.id, t] as const))('%s', (id, t) => {
    const symmetric = isSymmetric(t);
    const fitsExpected = t.cells.every((c) => c.d < 1 || c.y >= -1);
    for (const palette of palettesFor(t)) {
      for (const version of VERSIONS) {
        const plainHash = new Map<HorizontalDirection, string>();
        for (const mirror of [false, true]) {
          const counts = new Set<string>();
          for (const outward of DIRECTIONS) {
            const ctx = `${id} ${palette.id} ${version} ${outward}${mirror ? ' gespiegelt' : ''}`;
            const scene = buildScene(t, palette, outward, mirror, version);
            expect(scene.repairs, ctx).toEqual([]);
            for (const state of scene.model.palette) expect(checkBlockState(state, version), `${ctx}: ${state}`).toMatchObject({ ok: true });
            if (fitsExpected) expect(scene.fits, `${ctx}: templateFits`).toBe(true);

            for (const c of t.cells) {
              // The forced air above a lower door half receives the upper half from the resolver.
              const upperHalf = t.cells.some((o) => o.form === 'door' && o.x === c.x && o.y === c.y - 1 && o.d === c.d);
              if (c.role === 'air' && !c.block && !upperHalf) expect(stateAt(t, scene, c.x, c.y, c.d), `${ctx}: Luft ${c.x},${c.y},${c.d}`).toBe(AIR);
            }
            if (t.kind === 'window') {
              const glass = t.cells.filter((c) => c.role === 'glass').map((c) => stateAt(t, scene, c.x, c.y, c.d));
              expect(glass.some((s) => blockIdOf(s).includes('glass')), `${ctx}: Glas`).toBe(true);
            } else {
              for (const c of t.cells.filter((cell) => cell.form === 'door')) {
                const lower = stateAt(t, scene, c.x, 0, 0);
                const upper = stateAt(t, scene, c.x, 1, 0);
                expect(blockIdOf(lower), ctx).toMatch(/_door$/);
                expect(propsOf(lower).half, ctx).toBe('lower');
                expect(blockIdOf(upper), ctx).toBe(blockIdOf(lower));
                expect(propsOf(upper).half, ctx).toBe('upper');
                expect(propsOf(upper).hinge, ctx).toBe(propsOf(lower).hinge);
                for (const y of [0, 1]) expect(stateAt(t, scene, c.x, y, 1), `${ctx}: frei vor der Tür`).toBe(AIR);
              }
            }
            counts.add(idCounts(scene.model));

            if (!mirror) plainHash.set(outward, scene.model.hash);
            else if (symmetric) expect(scene.model.hash, `${ctx}: symmetrisch`).toBe(plainHash.get(outward));
            else expect(scene.model.hash, `${ctx}: Spiegelung ändert asymmetrische Vorlage`).not.toBe(plainHash.get(outward));
          }
          expect(counts.size, `${id} ${palette.id} ${version}: gleiche Blockanzahlen in allen 4 Richtungen`).toBe(1);
        }
      }
    }
  });
});

describe('Bögen aus der Geometriebibliothek', () => {
  const arch = (id: string, d: number) =>
    getTemplate(id)
      .cells.filter((c) => c.d === d && c.y >= 0 && (c.form === 'stairs' || c.form === 'slab'))
      .map((c) => `${c.x},${c.y},${c.form},${c.props?.facing ?? c.props?.type}`)
      .sort();
  it('Rundbogenfenster, Bogenfenster und Portalnische folgen roundArch (Treppe–Platte–Treppe bzw. offener Scheitel)', () => {
    expect(arch('W07b', 1)).toEqual(['0,3,stairs,west', '1,3,slab,top', '2,3,stairs,east']);
    expect(arch('W17b', 1)).toEqual(['0,2,stairs,west', '2,2,stairs,east']);
    expect(arch('T04', 1)).toEqual(['-1,2,stairs,west', '0,2,slab,top', '1,2,stairs,east']);
  });
});
