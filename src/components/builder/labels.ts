import type { BuildSize, BuildingType, DetailLevel } from '@/core/schema/buildSpec';
import { STYLE_LABELS, THEME_LABELS, type StyleId, type Theme } from '@/core/style/styles';

export { STYLE_LABELS, THEME_LABELS };

export const BUILDING_TYPE_LABELS: Record<BuildingType, string> = {
  house: 'Haus',
  tree: 'Weihnachtsbaum',
  market_stall: 'Marktstand',
  station: 'Bahnhof',
  tower: 'Turm',
};

export const SIZE_LABELS: Record<BuildSize, string> = {
  small: 'Klein',
  medium: 'Mittel',
  large: 'Groß',
  huge: 'Riesig',
};

export const DETAIL_LABELS: Record<DetailLevel, string> = {
  1: 'Schlicht',
  2: 'Dekoriert',
  3: 'Festlich',
};

/** Title like "Weihnachtliches Haus · Mittelalter". */
export function buildingTitle(kind: BuildingType, style: StyleId, theme: Theme = 'none'): string {
  if (kind === 'tree') return theme === 'none' ? 'Tannenbaum' : 'Weihnachtsbaum';
  const nouns: Record<Exclude<BuildingType, 'tree'>, [string, string]> = {
    house: ['es', 'Haus'],
    market_stall: ['er', 'Marktstand'],
    station: ['er', 'Bahnhof'],
    tower: ['er', 'Turm'],
  };
  const [ending, noun] = nouns[kind];
  const prefix = theme === 'christmas' ? `Weihnachtlich${ending} ` : theme === 'winter' ? `Winterlich${ending} ` : '';
  return `${prefix}${noun} · ${STYLE_LABELS[style]}`;
}
