import type { BuildSize, BuildStyle, BuildingType, ColorTheme, DetailLevel, MaterialTheme } from '@/core/schema/buildSpec';

export const BUILDING_TYPE_LABELS: Record<BuildingType, string> = {
  house: 'Haus',
  tree: 'Weihnachtsbaum',
  market_stall: 'Marktstand',
  station: 'Bahnhof',
};

export const STYLE_LABELS: Record<BuildStyle, string> = {
  christmas: 'Weihnachtlich',
  fairytale: 'Märchenhaft',
  realistic: 'Realistisch',
};

export const SIZE_LABELS: Record<BuildSize, string> = {
  small: 'Klein',
  medium: 'Mittel',
  large: 'Groß',
};

export const MATERIAL_LABELS: Record<MaterialTheme, string> = {
  spruce: 'Fichte',
  oak: 'Eiche',
  stone: 'Stein',
};

export const COLOR_LABELS: Record<ColorTheme, string> = {
  red_green: 'Rot-Grün',
  ice_blue: 'Eisblau',
  natural: 'Natur',
};

export const DETAIL_LABELS: Record<DetailLevel, string> = {
  1: 'Schlicht',
  2: 'Dekoriert',
  3: 'Festlich',
};

export function buildingTitle(kind: BuildingType, style: BuildStyle): string {
  if (kind === 'house') return style === 'christmas' ? 'Weihnachtshaus' : `${STYLE_LABELS[style]}es Winterhaus`;
  return BUILDING_TYPE_LABELS[kind];
}
