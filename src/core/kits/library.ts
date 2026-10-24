import { kitSupports, kitTemplate } from '@/core/kits/kitTemplate';
import { KIT_SCOPE_ALL, type DetailKit, type FacadeKitPart, type KitPart, type KitSide, type KitStorey } from '@/core/kits/types';
import type { StyleId } from '@/core/style/styles';
import type { FacadeTemplate } from '@/core/templates/types';
import { Sha256, toHex, utf8 } from '@/lib/utils/hash';

/**
 * Kit library: an immutable, deterministically ordered list of parsed kits (sorted by id), plain
 * data (JSON-serialisable), plus a fingerprint of its content. Same kit files → same library →
 * same buildings. The empty library is the default: without kits nothing changes.
 */

export interface KitLibrary {
  readonly kits: readonly DetailKit[];
  /** SHA-256 over the canonical kit data; changes whenever a kit changes. */
  readonly fingerprint: string;
}

const byCodeUnits = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function createKitLibrary(kits: readonly DetailKit[]): KitLibrary {
  const sorted = [...kits].sort((a, b) => byCodeUnits(a.id, b.id));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.id === sorted[i - 1]!.id) throw new Error(`Doppelte Kit-ID in der Bibliothek: ${sorted[i]!.id}`);
  }
  const fingerprint = toHex(new Sha256().update(utf8(`mcb-kits-v1\n${JSON.stringify(sorted)}`)).digest());
  return Object.freeze({ kits: Object.freeze(sorted), fingerprint });
}

export const EMPTY_KIT_LIBRARY: KitLibrary = createKitLibrary([]);

/** Where the generator wants to place a part; unset fields do not filter. */
export interface KitQuery {
  storey?: KitStorey;
  side?: KitSide;
  /** Length of the facade (blocks), checked against `fits.minFacadeLength`. */
  facadeLength?: number;
  /** Target version: kits with blocks missing there are skipped. */
  minecraftVersion?: string;
}

function fits(kit: DetailKit, query: KitQuery): boolean {
  if (query.storey && !kit.fits.storeys.includes(query.storey)) return false;
  if (query.side && !kit.fits.sides.includes(query.side)) return false;
  if (query.facadeLength !== undefined && query.facadeLength < kit.fits.minFacadeLength) return false;
  if (query.minecraftVersion && !kitSupports(kit, query.minecraftVersion)) return false;
  return true;
}

/**
 * Kits of a part for a style, in the order the generator should try them: the style's own
 * folder first, then `alle`; within each, higher `fits.weight` first, then by id. Filtered by
 * `fits` and version (see KitQuery).
 */
export function kitsFor(library: KitLibrary, part: KitPart, style: StyleId, query: KitQuery = {}): readonly DetailKit[] {
  const rank = (kit: DetailKit) => (kit.scope === style ? 0 : 1);
  return library.kits
    .filter((k) => k.part === part && (k.scope === style || k.scope === KIT_SCOPE_ALL) && fits(k, query))
    .sort((a, b) => rank(a) - rank(b) || b.fits.weight - a.fits.weight || byCodeUnits(a.id, b.id));
}

/**
 * Facade templates of the fitting kits, ready to be tried before the procedural templates
 * (`placeIfFits` keeps checking that they fit). Empty for an empty library.
 */
export function kitTemplates(library: KitLibrary, part: FacadeKitPart, style: StyleId, query: KitQuery = {}): FacadeTemplate[] {
  return kitsFor(library, part, style, query)
    .map(kitTemplate)
    .filter((t): t is FacadeTemplate => t !== null);
}
