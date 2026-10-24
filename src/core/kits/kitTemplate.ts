import { clockwise, type HorizontalDirection } from '@/core/blocks/directions';
import { AIR, blockState, getBlockDefinition, profileBlockId } from '@/core/blocks/registry';
import { mirrorState, rotateState } from '@/core/blocks/transform';
import { DEFAULT_PROFILE } from '@/core/compat/profile';
import { isFacadeKitPart, KIT_SCOPE_ALL, type DetailKit, type KitCell, type KitScope } from '@/core/kits/types';
import { STYLE_IDS, type StyleId } from '@/core/style/styles';
import type { FacadeTemplate, TemplateCell } from '@/core/templates/types';

/**
 * A parsed kit in the generator's terms:
 * - facade parts (window, door, balcony, dormer front) become a real `FacadeTemplate`, so they
 *   go through the existing placement path (`placeIfFits` / `placeTemplate` → `cellState`:
 *   rotation to any facade, mirroring, `profileBlockId` for 1.21.1) like W01–W18 and T01–T10;
 * - every kit (in particular the chimney head) can also be turned into world-relative cells
 *   with `kitCells` for callers outside the facade path.
 */

/** Style ids a kit of this scope serves. */
export function stylesOfScope(scope: KitScope): readonly StyleId[] {
  return scope === KIT_SCOPE_ALL ? STYLE_IDS : [scope];
}

/** True if every block of the kit exists (or has a stand-in) in that Minecraft version. */
export function kitSupports(kit: DetailKit, minecraftVersion: string): boolean {
  return kit.versions.some((v) => v.minecraftVersion === minecraftVersion && v.placeable);
}

const TEMPLATES = new WeakMap<DetailKit, FacadeTemplate>();

/**
 * Facade template of a kit (null for chimney heads). Kit blocks are fixed cells with role
 * `accent` (full namespaced id, so `placeIfFits` does not swap a kit lantern for the style's
 * lantern), forced air cells have role `air`. Opening size from the kit description, spacing 1.
 * Balconies are `kind: 'door'` like the procedural balconies (src/core/templates/balcony.ts).
 */
export function kitTemplate(kit: DetailKit): FacadeTemplate | null {
  if (!isFacadeKitPart(kit.part) || !kit.opening) return null;
  const cached = TEMPLATES.get(kit);
  if (cached) return cached;
  const cells: TemplateCell[] = [
    ...kit.cells.map((c): TemplateCell => ({ x: c.x, y: c.y, d: c.d, role: 'accent', block: c.block, props: c.props })),
    ...kit.air.map((a): TemplateCell => ({ x: a.x, y: a.y, d: a.d, role: 'air' })),
  ];
  const template: FacadeTemplate = Object.freeze({
    id: kit.id,
    kind: kit.part === 'door' || kit.part === 'balcony' ? 'door' : 'window',
    label: kit.label,
    width: kit.opening.width,
    height: kit.opening.height,
    cells: Object.freeze(cells),
    styles: stylesOfScope(kit.scope),
    spacing: 1,
    note: `Detail-Kit aus kits/${kit.scope}/${kit.name}.schem (eigener Build, ${kit.source.minecraftVersion}).`,
  });
  TEMPLATES.set(kit, template);
  return template;
}

// ---------------------------------------------------------------------------------------------
// World-relative cells (chimney head and any other caller outside the facade path)

export interface KitWorldCell {
  /** Offset from the anchor's world position. */
  x: number;
  y: number;
  z: number;
  /** Full block state for the target version (AIR for forced air). */
  state: string;
}

/** Quarter turns that take the canonical south facing to `outward` (as in templates/place.ts). */
function turnsFromSouth(outward: HorizontalDirection): number {
  return [0, 1, 2, 3].find((n) => clockwise('south', n) === outward)!;
}

function rotateVector(dx: number, dz: number, turns: number): [number, number] {
  let x = dx;
  let z = dz;
  for (let i = 0; i < turns; i++) [x, z] = [-z, x];
  return [x, z];
}

/**
 * Block state of one kit cell for a facade facing `outward`, same steps as `cellState`:
 * version spelling (`profileBlockId`), registry defaults, mirror across x, rotate.
 */
export function kitCellState(cell: KitCell, outward: HorizontalDirection, mirror: boolean, minecraftVersion: string): string {
  const id = profileBlockId(cell.block, minecraftVersion);
  const def = getBlockDefinition(id);
  if (!def) throw new Error(`Block nicht in der Registry: ${id}`);
  const props = Object.fromEntries(Object.entries(cell.props).filter(([k]) => k in def.properties));
  let state = blockState(id, props);
  if (mirror) state = mirrorState(state, 'x');
  return rotateState(state, turnsFromSouth(outward));
}

/**
 * All cells of a kit relative to its anchor, turned so the kit's outside faces `outward` and
 * optionally mirrored left/right. Positions follow `cellPosition` (templates/place.ts) with the
 * origin at the anchor: mirroring maps x to `openingWidth − 1 − x` (chimney heads: −x, i.e.
 * across the flue column). Forced air cells come last with state AIR. Throws if the kit has
 * blocks that do not exist in `minecraftVersion` – filter with `kitsFor(…, { minecraftVersion })`.
 *
 * Chimney head: anchor = flue cell of the lowest kit row; place it at (flue x, lowest head
 * row, flue z) with `outward` = the side the chimney faces away from the house.
 */
export function kitCells(
  kit: DetailKit,
  outward: HorizontalDirection,
  mirror = false,
  minecraftVersion: string = DEFAULT_PROFILE.minecraftVersion,
): KitWorldCell[] {
  if (!kitSupports(kit, minecraftVersion)) throw new Error(`Kit ${kit.id} ist in Minecraft ${minecraftVersion} nicht verwendbar`);
  const turns = turnsFromSouth(outward);
  const width = kit.opening?.width ?? 1;
  const [rx, rz] = rotateVector(1, 0, turns);
  const [ox, oz] = rotateVector(0, 1, turns);
  const at = (x: number, y: number, d: number) => {
    const cx = mirror ? width - 1 - x : x;
    // `+ 0` turns −0 (from 0 × −1) into 0.
    return { x: cx * rx + d * ox + 0, y, z: cx * rz + d * oz + 0 };
  };
  return [
    ...kit.cells.map((c) => ({ ...at(c.x, c.y, c.d), state: kitCellState(c, outward, mirror, minecraftVersion) })),
    ...kit.air.map((a) => ({ ...at(a.x, a.y, a.d), state: AIR })),
  ];
}
