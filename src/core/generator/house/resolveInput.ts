import type { SeededRandom } from '@/core/generator/seededRandom';
import { getPalette, ROLES, type Role } from '@/core/style/palettes';
import { getStyle, type RoofProfile, type RoofType, type SizeClass, type StyleId, type Theme } from '@/core/style/styles';
import type { HouseInput, Symmetry, TowerKind, TowerPosition, Wings } from '@/core/generator/house/plan';
import type { DoorFamily, WindowFamily } from '@/core/schema/buildOptions';
import { DOOR_FAMILY_TEMPLATES, WINDOW_FAMILY_TEMPLATES } from '@/core/templates/catalog';
import { resolveComposition } from '@/core/generator/house/composition';
import type { CompositionId, CompositionOption } from '@/core/style/compositions';

/**
 * Resolves the house input from a style and optional wishes: every value the user (text, AI
 * or UI) did not set comes from the style data (priors, proportions, detail probabilities),
 * drawn from forked random streams so the same seed always gives the same house.
 */

export interface HouseWishes {
  /** Archetype of the masses; 'none' = classic single body (towers, station). */
  composition?: CompositionOption | 'none';
  palette?: string;
  materials?: Partial<Record<Role, string>>;
  width?: number;
  depth?: number;
  floors?: number;
  floorHeight?: number;
  roofType?: RoofType;
  roofProfile?: RoofProfile;
  overhang?: number;
  wings?: Wings;
  annex?: 'none' | 'left' | 'right';
  tower?: TowerKind;
  towerPosition?: TowerPosition;
  symmetry?: 'auto' | Symmetry;
  windows?: 'few' | 'normal' | 'many';
  windowFamily?: WindowFamily;
  doorFamily?: DoorFamily;
  jetty?: boolean;
  porch?: boolean;
  oriel?: boolean;
  balcony?: boolean;
  chimney?: boolean;
  dormers?: number;
  lanternDensity?: 'none' | 'few' | 'normal' | 'many';
  soulLanterns?: boolean;
  garden?: boolean;
  garland?: boolean;
  christmasTree?: boolean;
  presents?: boolean;
  snow?: boolean;
}

const odd = (n: number) => (n % 2 === 0 ? n + 1 : n);

export function resolveHouseInput(
  styleId: StyleId,
  theme: Theme,
  size: SizeClass,
  detailLevel: 1 | 2 | 3,
  seed: number,
  minecraftVersion: string,
  wishes: HouseWishes,
  rng: SeededRandom,
  /** Archetypes the automatic choice should avoid (variant search, phase 5). */
  exclude: readonly CompositionId[] = [],
): HouseInput {
  const style = getStyle(styleId);
  const r = rng.fork('input');
  // The composition comes first: it sets the default masses and may prefer palettes.
  const comp = wishes.composition === 'none' ? null : resolveComposition(styleId, style, size, wishes.composition ?? 'auto', r, exclude);
  const preferred = (comp?.palettes ?? []).filter((p) => style.palettes.includes(p));
  const paletteId = wishes.palette && style.palettes.includes(wishes.palette) ? wishes.palette : r.fork('palette').pick(preferred.length > 0 ? preferred : style.palettes);
  const palette = getPalette(paletteId);
  const pr = r.fork('materials');
  const materials = Object.fromEntries(ROLES.map((role) => [role, wishes.materials?.[role] ?? pr.weighted(palette.roles[role])])) as Record<Role, string>;

  const base = comp?.main ?? style.proportions.size[size];
  const symmetry: Symmetry = !wishes.symmetry || wishes.symmetry === 'auto' ? (comp?.symmetry ?? (style.symmetric ? 'symmetric' : 'asymmetric')) : wishes.symmetry;
  const detail = (p: number) => Math.min(1, p * (detailLevel === 1 ? 0.5 : detailLevel === 3 ? 1.4 : 1));
  const feature = (name: keyof typeof style.details, label: string) => r.fork(label).chance(detail(style.details[name]));
  const roofType = wishes.roofType ?? comp?.roofType ?? r.fork('roofType').weighted(Object.entries(style.roofTypes) as [RoofType, number][]);
  const roofProfile = wishes.roofProfile ?? comp?.roofProfile ?? r.fork('roofProfile').weighted(Object.entries(style.roofProfiles) as [RoofProfile, number][]);
  const [ohMin, ohMax] = style.proportions.overhang;
  const [fhMin, fhMax] = style.proportions.floorHeight;
  const [pMin, pMax] = style.proportions.plinth;
  // An oriel or a balcony sits on an upper storey: the wish implies one.
  const floors = wishes.floors ?? Math.max(base.floors, wishes.oriel || wishes.balcony ? 2 : 1);
  const asym = symmetry !== 'symmetric';
  // Archetypes bring their own secondary masses; the classic rules only fill in for the plain
  // body ("simple") and for buildings without composition.
  const classic = !comp || comp.id === 'simple';

  const wings: Wings = wishes.wings ?? comp?.wings ?? (symmetry === 'rambling' ? 'L' : classic && size === 'huge' ? (asym ? 'L' : 'T') : 'none');
  const classicAnnex = (asym && feature('annex', 'annex')) || (styleId === 'modern' && size !== 'small') ? (r.fork('annexSide').chance(0.5) ? 'left' : 'right') : 'none';
  const porchKind = comp?.porch ?? 'canopy';
  return {
    styleId,
    style,
    paletteId,
    materials,
    theme,
    seed,
    minecraftVersion,
    width: odd(wishes.width ?? base.width),
    depth: odd(wishes.depth ?? base.depth),
    floors,
    floorHeight: wishes.floorHeight ?? r.fork('floorHeight').int(fhMin, fhMax),
    plinth: comp?.plinth ?? r.fork('plinth').int(pMin, pMax),
    roofType,
    roofProfile,
    // Pitched roofs always overhang (modern flat roofs may sit flush with the parapet).
    overhang: wishes.overhang ?? comp?.overhang ?? Math.max(roofType === 'flat' ? 0 : 1, r.fork('overhang').int(ohMin, ohMax)),
    wings,
    // Modern houses from medium on are two offset cubes, never a single box (research 12/19).
    annex: wishes.annex ?? (comp?.annex ? comp.annex.side : classic ? classicAnnex : 'none'),
    tower: wishes.tower ?? comp?.tower?.kind ?? 'none',
    towerPosition: wishes.towerPosition ?? comp?.tower?.position ?? 'front_right',
    symmetry,
    windows: wishes.windows ?? 'normal',
    // A chosen family comes first; the style's own templates stay as fallback where it does not fit.
    windowTemplates: wishes.windowFamily && wishes.windowFamily !== 'auto' ? [...WINDOW_FAMILY_TEMPLATES[wishes.windowFamily], ...style.windows] : style.windows,
    doorTemplates: wishes.doorFamily && wishes.doorFamily !== 'auto' ? [...DOOR_FAMILY_TEMPLATES[wishes.doorFamily], ...style.doors] : style.doors,
    windowWish: wishes.windowFamily && wishes.windowFamily !== 'auto' ? WINDOW_FAMILY_TEMPLATES[wishes.windowFamily] : [],
    doorWish: wishes.doorFamily && wishes.doorFamily !== 'auto' ? DOOR_FAMILY_TEMPLATES[wishes.doorFamily] : [],
    timber: style.timber,
    jetty: wishes.jetty ?? comp?.jetty ?? (style.jetty && floors > 1),
    porch: wishes.porch ?? (comp && comp.porch !== undefined ? comp.porch !== null : feature('porch', 'porch')),
    porchKind,
    oriel: wishes.oriel ?? false,
    balcony: wishes.balcony ?? comp?.balcony ?? false,
    chimney: wishes.chimney ?? comp?.chimney ?? feature('chimney', 'chimney'),
    dormers: wishes.dormers ?? comp?.dormers ?? (feature('dormers', 'dormers') && roofType !== 'flat' ? (size === 'small' ? 1 : 2) : 0),
    lanternDensity: wishes.lanternDensity ?? (theme === 'none' ? 'few' : 'normal'),
    lantern: wishes.soulLanterns ? 'soul_lantern' : style.lantern,
    detailLevel,
    garden: wishes.garden ?? detailLevel >= 2,
    festive: {
      garland: wishes.garland ?? theme === 'christmas',
      christmasTree: wishes.christmasTree ?? (theme === 'christmas' && detailLevel >= 2),
      presents: wishes.presents ?? (theme === 'christmas' && detailLevel >= 2),
      snow: wishes.snow ?? false,
    },
    composition: comp,
  };
}
