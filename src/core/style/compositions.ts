import type { SizeClass, StyleId } from '@/core/style/styles';

/**
 * Compositions (archetypes) as data: how the building masses of a house are arranged – main
 * body, cross gable, cross wing, annex, porch, tower, pagoda tiers – instead of a single box.
 * Derived from the creative director's reference builds and research 08–13 and 19 (T1/T2:
 * one dominant main body with one to three subordinate masses, lower ridges and eaves, never
 * flush with the front). The generator side (sizes, parts) is in
 * src/core/generator/house/composition.ts; this file holds what parser, AI plan and UI need.
 *
 * `weights` is the prior per style and size: `auto` draws from it; an archetype without a
 * weight for a style is never drawn automatically for it, but may still be wished (then the
 * nearest fitting form of that style is built, with a hint).
 */

export const COMPOSITIONS = [
  'auto',
  'simple',
  'cross_gable',
  'cross_wing',
  'town_house',
  'stair_tower',
  'chapel',
  'chalet',
  'log_cabin',
  'cottage',
  'witch_house',
  'longhouse',
  'pagoda',
  'engawa_house',
  'offset_cubes',
  'villa_tower',
] as const;

export type CompositionOption = (typeof COMPOSITIONS)[number];
export type CompositionId = Exclude<CompositionOption, 'auto'>;

export interface CompositionInfo {
  id: CompositionId;
  label: string;
  /** One German sentence for the UI and the AI catalogue. */
  summary: string;
  /** Word stems for the rule parser (lower case, without umlaut variants – the parser folds). */
  keywords: readonly string[];
  weights: Readonly<Partial<Record<StyleId, Readonly<Partial<Record<SizeClass, number>>>>>>;
}

const w = (small: number, medium: number, large: number, huge: number) => ({ small, medium, large, huge });

export const COMPOSITION_INFO: Readonly<Record<CompositionId, CompositionInfo>> = {
  simple: {
    id: 'simple',
    label: 'Einfacher Baukörper',
    summary: 'Ein klarer Baukörper mit Dach – für kleine Häuser.',
    keywords: [],
    weights: {
      medieval: w(0.45, 0, 0, 0),
      fantasy: w(0.15, 0, 0, 0),
      rustic: w(0.2, 0, 0, 0),
      nordic: w(0.3, 0, 0, 0),
      japanese: w(0.4, 0.1, 0, 0),
      cherry: w(0.4, 0.1, 0, 0),
      modern: w(0.6, 0.25, 0.2, 0.15),
      mediterranean: w(0.7, 0.15, 0.1, 0),
    },
  },
  cross_gable: {
    id: 'cross_gable',
    label: 'Haus mit Zwerchgiebel',
    summary: 'Hauptbau mit vorspringendem Quergiebel über dem Eingang als Blickfang.',
    keywords: ['zwerchgiebel', 'zwerchhaus', 'quergiebel', 'mittelrisalit', 'risalit', 'giebelvorbau'],
    weights: {
      medieval: w(0, 0.3, 0.3, 0.25),
      fantasy: w(0, 0.2, 0.25, 0.25),
      nordic: w(0.2, 0.2, 0.2, 0.2),
      japanese: w(0, 0.15, 0.2, 0.25),
      cherry: w(0, 0.1, 0.2, 0.25),
      modern: w(0.2, 0.15, 0.15, 0.15),
      mediterranean: w(0, 0.2, 0.2, 0.2),
    },
  },
  cross_wing: {
    id: 'cross_wing',
    label: 'Winkelhaus mit Querflügel',
    summary: 'L-förmig: niedrigerer Querflügel mit eigenem Giebel zur Straße, Eingang im Winkel.',
    keywords: ['querflügel', 'winkelhaus', 'eckhaus', 'winkelbau'],
    weights: {
      medieval: w(0, 0.25, 0.25, 0.25),
      rustic: w(0, 0.15, 0.2, 0.25),
      modern: w(0.2, 0.2, 0.2, 0.2),
      mediterranean: w(0, 0.25, 0.25, 0.25),
    },
  },
  town_house: {
    id: 'town_house',
    label: 'Schmales Stadthaus',
    summary: 'Schmal und hoch, steiler Spitzgiebel zur Straße, niedriger Anbau mit Pultdach.',
    keywords: ['stadthaus', 'bürgerhaus', 'giebelhaus', 'schmales haus', 'reihenhaus', 'altstadthaus'],
    weights: {
      medieval: w(0.35, 0.25, 0.15, 0),
      fantasy: w(0.2, 0.1, 0.1, 0),
      mediterranean: w(0.3, 0.1, 0, 0),
    },
  },
  stair_tower: {
    id: 'stair_tower',
    label: 'Haus mit Treppenturm',
    summary: 'Hauptbau mit schlankem Eckturm, der deutlich über den First ragt.',
    keywords: ['treppenturm', 'turmhaus'],
    weights: {
      medieval: w(0, 0.1, 0.2, 0.25),
      fantasy: w(0, 0, 0.1, 0.2),
    },
  },
  chapel: {
    id: 'chapel',
    label: 'Kapelle mit Turm',
    summary: 'Giebel zur Front, Turm mit gestaffelter Haube, Vordach über dem Eingang.',
    keywords: ['kapelle', 'kirche', 'kirchlein', 'glockenturm'],
    weights: {
      medieval: w(0, 0.05, 0.1, 0.1),
      rustic: w(0, 0.1, 0.15, 0.2),
      nordic: w(0, 0, 0.1, 0.2),
    },
  },
  chalet: {
    id: 'chalet',
    label: 'Chalet mit Balkon',
    summary: 'Steinernes Erdgeschoss, Holz-Obergeschoss mit Balkon, Giebel zur Front, Pultdach-Anbau.',
    keywords: ['chalet', 'berghaus', 'almhaus', 'alpenhaus', 'balkonhaus'],
    weights: {
      rustic: w(0, 0.3, 0.3, 0.3),
      nordic: w(0, 0.1, 0.1, 0.1),
    },
  },
  log_cabin: {
    id: 'log_cabin',
    label: 'Blockhütte mit Veranda',
    summary: 'Niedrige Hütte, Traufe zur Front, überdachte Veranda auf Pfosten, Steinkamin.',
    keywords: ['blockhütte', 'blockhaus', 'holzhütte', 'jagdhütte', 'berghütte', 'waldhütte'],
    weights: {
      rustic: w(0.5, 0.3, 0.2, 0.1),
      nordic: w(0.4, 0.25, 0.2, 0.1),
    },
  },
  cottage: {
    id: 'cottage',
    label: 'Häuschen mit lebendem Dach',
    summary: 'Kleines Häuschen mit großem, bewachsenem Dach (Moos, blühende Azalee), runde Fenster.',
    keywords: ['cottage', 'hobbit', 'moosdach', 'gründach', 'lebendes dach'],
    weights: {
      fantasy: w(0.5, 0.25, 0.1, 0),
      rustic: w(0.3, 0.15, 0.1, 0),
      cherry: w(0.3, 0.2, 0, 0),
    },
  },
  witch_house: {
    id: 'witch_house',
    label: 'Märchenhaus mit Hexenhut-Turm',
    summary: 'Asymmetrisches Märchenhaus mit rundem Turm und schiefem Hexenhut an der Front.',
    keywords: ['hexenhaus', 'hexenhäuschen', 'hexenhut', 'zauberhaus', 'märchenhaus'],
    weights: {
      fantasy: w(0.15, 0.45, 0.45, 0.35),
    },
  },
  longhouse: {
    id: 'longhouse',
    label: 'Langhaus mit Anbau',
    summary: 'Langgestreckte Halle mit hohem Dach, Eingangsvorbau und Anbau unter der Traufe.',
    keywords: ['langhaus', 'wikingerhalle', 'methalle'],
    weights: {
      nordic: w(0, 0.45, 0.5, 0.4),
    },
  },
  pagoda: {
    id: 'pagoda',
    label: 'Pagode',
    summary: 'Zwei gestaffelte Geschosse mit je eigenem Dach, hochgezogene Ecken mit Laternen, Steinsockel.',
    keywords: ['pagode', 'turmtempel'],
    weights: {
      japanese: w(0.2, 0.3, 0.4, 0.4),
      cherry: w(0.1, 0.2, 0.3, 0.3),
    },
  },
  engawa_house: {
    id: 'engawa_house',
    label: 'Haus mit Engawa',
    summary: 'Japanisches Haus mit umlaufendem Holzdeck unter dem weiten Dachüberstand.',
    keywords: ['engawa', 'holzdeck', 'teehaus', 'minka'],
    weights: {
      japanese: w(0.4, 0.45, 0.4, 0.35),
      cherry: w(0.2, 0.4, 0.5, 0.45),
    },
  },
  offset_cubes: {
    id: 'offset_cubes',
    label: 'Versetzte Kuben',
    summary: 'Flacher Unterbau mit versetzt aufgesetztem, teils auskragendem Obergeschoss und Dachterrasse.',
    keywords: ['versetzte kuben', 'kuben', 'dachterrasse', 'gestapelte'],
    weights: {
      modern: w(0, 0.4, 0.45, 0.5),
    },
  },
  villa_tower: {
    id: 'villa_tower',
    label: 'Villa mit Turm und Flügel',
    summary: 'Hauptbau mit niedrigerem Seitenflügel und schlankem Turm mit flachem Zeltdach.',
    keywords: ['villa mit turm', 'turmvilla', 'landgut', 'gutshaus'],
    weights: {
      mediterranean: w(0, 0.3, 0.35, 0.4),
    },
  },
};

export const COMPOSITION_LABELS: Readonly<Record<CompositionOption, string>> = {
  auto: 'Automatisch',
  ...(Object.fromEntries(Object.values(COMPOSITION_INFO).map((c) => [c.id, c.label])) as Record<CompositionId, string>),
};

/** Archetypes a style draws from at a size, with their weights (deterministic order). */
export function compositionsFor(style: StyleId, size: SizeClass): [CompositionId, number][] {
  return COMPOSITIONS.filter((id): id is CompositionId => id !== 'auto')
    .map((id): [CompositionId, number] => [id, COMPOSITION_INFO[id].weights[style]?.[size] ?? 0])
    .filter(([, weight]) => weight > 0);
}

/** Archetypes that belong to a style at any size (UI list, AI catalogue). */
export function stylesCompositions(style: StyleId): CompositionId[] {
  return COMPOSITIONS.filter((id): id is CompositionId => id !== 'auto' && Object.values(COMPOSITION_INFO[id].weights[style] ?? {}).some((v) => (v ?? 0) > 0));
}
