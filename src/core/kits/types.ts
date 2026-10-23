import type { StyleId } from '@/core/style/styles';

/**
 * Detail kits (assignment Profi-Builds, phase 6): details the creative director builds himself
 * in Minecraft (window, door, balcony, chimney head, dormer front), exports with WorldEdit as a
 * Sponge v3 `.schem` and drops into `kits/<style>/<name>.schem` + `<name>.json`
 * (`kits/alle/` for every style). The generator prefers them over its procedural templates
 * where they fit; without kits nothing changes. User guide: docs/DETAIL_KITS.md.
 *
 * Coordinates of a parsed kit are canonical and relative to its anchor, exactly like the
 * facade templates (src/core/templates/types.ts): the outside faces SOUTH,
 *
 *   x = to the right when looking at the detail from outside, 0 = anchor column,
 *   y = up, 0 = anchor row,
 *   d = towards the outside, 0 = anchor plane (the wall plane for facade parts).
 *
 * Kits are built with their outside facing NORTH (fixed convention), so parsing rotates them by
 * 180° (positions and block states). Everything here is plain, JSON-serialisable data.
 */

export const KIT_PARTS = ['window', 'door', 'balcony', 'chimney_head', 'dormer_front'] as const;
export type KitPart = (typeof KIT_PARTS)[number];

/** Parts that become a facade template (everything but the chimney head). */
export const FACADE_KIT_PARTS = ['window', 'door', 'balcony', 'dormer_front'] as const satisfies readonly KitPart[];
export type FacadeKitPart = (typeof FACADE_KIT_PARTS)[number];

export function isFacadeKitPart(part: KitPart): part is FacadeKitPart {
  return part !== 'chimney_head';
}

export const KIT_PART_LABELS: Readonly<Record<KitPart, string>> = {
  window: 'Fenster',
  door: 'Tür',
  balcony: 'Balkon',
  chimney_head: 'Kaminkopf',
  dormer_front: 'Gaubenfront',
};

/** Folder for kits that every style may use. */
export const KIT_SCOPE_ALL = 'alle';
/** Folder below kits/: a style id or "alle". */
export type KitScope = StyleId | typeof KIT_SCOPE_ALL;

export const KIT_STOREYS = ['ground', 'upper'] as const;
export type KitStorey = (typeof KIT_STOREYS)[number];
export const KIT_SIDES = ['front', 'side', 'back'] as const;
export type KitSide = (typeof KIT_SIDES)[number];

/**
 * Size limits of one kit (schematic box, X × Y × Z as built, and non-air blocks). Chosen for
 * details, not buildings: the largest procedural detail (porch T06, 5 wide × 2 deep, bay W09)
 * fits with room to spare, a 9 × 12 × 9 box still holds a tall chimney head with corbels.
 * Facade parts may reach at most one block behind the wall plane (into the room).
 */
export const KIT_LIMITS = {
  width: 9,
  height: 12,
  length: 9,
  blocks: 600,
  /** Largest opening of a facade part (blocks). */
  openingWidth: 7,
  openingHeight: 8,
  /** Facade parts: non-air blocks allowed down to d = −1. */
  maxBehindWall: 1,
} as const;

/** One block of a kit in canonical coordinates. */
export interface KitCell {
  x: number;
  y: number;
  d: number;
  /** Namespaced block id valid in Minecraft 1.21.11 (older files are mapped, e.g. chain → iron_chain). */
  block: string;
  /**
   * Canonical (south-facing) properties that carry intent. Neighbour-dependent properties
   * (stairs shape, fence/pane/wall connections, gate in_wall, leaves distance, …) and
   * `waterlogged` are dropped: registry defaults fill them and the state resolver recomputes
   * them in the finished building, like for every procedural template.
   */
  props: Readonly<Record<string, string>>;
}

/** Cell the kit forces to air (opening, room side behind it, door upper half, chimney flue). */
export interface KitAirCell {
  x: number;
  y: number;
  d: number;
}

export interface KitFits {
  storeys: readonly KitStorey[];
  sides: readonly KitSide[];
  /** Smallest facade length (blocks) the kit may be used on. */
  minFacadeLength: number;
  /** Priority among fitting kits: higher is tried first. */
  weight: number;
}

/** Whether a kit can be placed in a Minecraft version and which blocks are swapped there. */
export interface KitVersionSupport {
  minecraftVersion: string;
  placeable: boolean;
  /** "minecraft:a → minecraft:b": renamed blocks and stand-ins (see `profileBlockId`). */
  replacements: readonly string[];
  /** Blocks that do not exist in that version and have no stand-in. */
  missing: readonly string[];
}

export interface DetailKit {
  /** `kit:<scope>/<name>` – also the template id. */
  id: string;
  scope: KitScope;
  name: string;
  part: KitPart;
  label: string;
  /** Opening in the wall (window glass, door leaf, balcony access); null for chimney heads. */
  opening: { width: number; height: number } | null;
  fits: KitFits;
  /** Non-air blocks, sorted by y, d, x. */
  cells: readonly KitCell[];
  /** Forced air, sorted by y, d, x. Any other air in the schematic means "leave as is". */
  air: readonly KitAirCell[];
  versions: readonly KitVersionSupport[];
  source: {
    dataVersion: number;
    /** Minecraft version of the file's DataVersion. */
    minecraftVersion: string;
    /** Schematic box as built (X × Y × Z). */
    size: { width: number; height: number; length: number };
    /** Anchor in schematic coordinates (0-based from the box's minimum corner). */
    anchor: readonly [number, number, number];
    anchorFrom: 'json' | 'offset';
    /** Sponge `Offset` of the file (WorldEdit: minimum corner minus player position at //copy). */
    offset: readonly [number, number, number];
  };
  /** German notes for the user (ignored block entities, normalised properties, …). */
  notes: readonly string[];
}
