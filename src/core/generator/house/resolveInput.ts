import type { SeededRandom } from '@/core/generator/seededRandom';
import { getPalette, ROLES, type Role } from '@/core/style/palettes';
import { getStyle, type RoofProfile, type RoofType, type SizeClass, type StyleId, type Theme } from '@/core/style/styles';
import type { HouseInput, Symmetry, TowerKind, TowerPosition, Wings } from '@/core/generator/house/plan';
import type { DoorFamily, WindowFamily } from '@/core/schema/buildOptions';
import { DOOR_FAMILY_TEMPLATES, WINDOW_FAMILY_TEMPLATES } from '@/core/templates/catalog';

/**
 * Resolves the house input from a style and optional wishes: every value the user (text, AI
 * or UI) did not set comes from the style data (priors, proportions, detail probabilities),
 * drawn from forked random streams so the same seed always gives the same house.
 */

export interface HouseWishes {
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
): HouseInput {
  const style = getStyle(styleId);
  const r = rng.fork('input');
  const paletteId = wishes.palette && style.palettes.includes(wishes.palette) ? wishes.palette : r.fork('palette').pick(style.palettes);
  const palette = getPalette(paletteId);
  const pr = r.fork('materials');
  const materials = Object.fromEntries(ROLES.map((role) => [role, wishes.materials?.[role] ?? pr.weighted(palette.roles[role])])) as Record<Role, string>;

  const base = style.proportions.size[size];
  const symmetry: Symmetry = !wishes.symmetry || wishes.symmetry === 'auto' ? (style.symmetric ? 'symmetric' : 'asymmetric') : wishes.symmetry;
  const detail = (p: number) => Math.min(1, p * (detailLevel === 1 ? 0.5 : detailLevel === 3 ? 1.4 : 1));
  const feature = (name: keyof typeof style.details, label: string) => r.fork(label).chance(detail(style.details[name]));
  const roofType = wishes.roofType ?? r.fork('roofType').weighted(Object.entries(style.roofTypes) as [RoofType, number][]);
  const roofProfile = wishes.roofProfile ?? r.fork('roofProfile').weighted(Object.entries(style.roofProfiles) as [RoofProfile, number][]);
  const [ohMin, ohMax] = style.proportions.overhang;
  const [fhMin, fhMax] = style.proportions.floorHeight;
  const [pMin, pMax] = style.proportions.plinth;
  // An oriel or a balcony sits on an upper storey: the wish implies one.
  const floors = wishes.floors ?? Math.max(base.floors, wishes.oriel || wishes.balcony ? 2 : 1);
  const asym = symmetry !== 'symmetric';

  const wings: Wings = wishes.wings ?? (symmetry === 'rambling' ? 'L' : size === 'huge' ? (asym ? 'L' : 'T') : 'none');
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
    plinth: r.fork('plinth').int(pMin, pMax),
    roofType,
    roofProfile,
    // Pitched roofs always overhang (modern flat roofs may sit flush with the parapet).
    overhang: wishes.overhang ?? Math.max(roofType === 'flat' ? 0 : 1, r.fork('overhang').int(ohMin, ohMax)),
    wings,
    annex: wishes.annex ?? (asym && feature('annex', 'annex') ? (r.fork('annexSide').chance(0.5) ? 'left' : 'right') : 'none'),
    tower: wishes.tower ?? 'none',
    towerPosition: wishes.towerPosition ?? 'front_right',
    symmetry,
    windows: wishes.windows ?? 'normal',
    // A chosen family comes first; the style's own templates stay as fallback where it does not fit.
    windowTemplates: wishes.windowFamily && wishes.windowFamily !== 'auto' ? [...WINDOW_FAMILY_TEMPLATES[wishes.windowFamily], ...style.windows] : style.windows,
    doorTemplates: wishes.doorFamily && wishes.doorFamily !== 'auto' ? [...DOOR_FAMILY_TEMPLATES[wishes.doorFamily], ...style.doors] : style.doors,
    windowWish: wishes.windowFamily && wishes.windowFamily !== 'auto' ? WINDOW_FAMILY_TEMPLATES[wishes.windowFamily] : [],
    doorWish: wishes.doorFamily && wishes.doorFamily !== 'auto' ? DOOR_FAMILY_TEMPLATES[wishes.doorFamily] : [],
    timber: style.timber,
    jetty: wishes.jetty ?? (style.jetty && floors > 1),
    porch: wishes.porch ?? feature('porch', 'porch'),
    oriel: wishes.oriel ?? false,
    balcony: wishes.balcony ?? false,
    chimney: wishes.chimney ?? feature('chimney', 'chimney'),
    dormers: wishes.dormers ?? (feature('dormers', 'dormers') && roofType !== 'flat' ? (size === 'small' ? 1 : 2) : 0),
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
  };
}
