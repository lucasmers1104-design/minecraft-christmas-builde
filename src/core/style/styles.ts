/**
 * Styles as data: which palettes, roof types and profiles (priors), proportions, symmetry
 * default, window/door templates (2–3 recurring detail types), detail density and forbidden
 * materials a style uses, plus a short description that the local AI receives as "function
 * documentation". Winter/Christmas is not a style but a theme axis on top of every style.
 *
 * Palettes and priors follow reports/Minecraft Bautechniken für Generator.md; the fantasy,
 * cherry and mediterranean palettes are derived from thin sources and are marked as such in
 * the docs ("abgeleitet, im Spiel ungetestet").
 */

export const STYLE_IDS = ['medieval', 'fantasy', 'rustic', 'nordic', 'japanese', 'cherry', 'modern', 'mediterranean'] as const;
export type StyleId = (typeof STYLE_IDS)[number];

export const THEMES = ['none', 'winter', 'christmas'] as const;
export type Theme = (typeof THEMES)[number];

export const ROOF_TYPES = ['gable', 'hip', 'half_hip', 'pyramid', 'mansard', 'gambrel', 'saltbox', 'a_frame', 'flat', 'pagoda'] as const;
export type RoofType = (typeof ROOF_TYPES)[number];

export const ROOF_PROFILES = ['standard', 'steep', 'shallow', 'flared', 'bell', 'convex', 'ogee'] as const;
export type RoofProfile = (typeof ROOF_PROFILES)[number];

export type SizeClass = 'small' | 'medium' | 'large' | 'huge';

export interface StyleDef {
  id: StyleId;
  label: string;
  /** One sentence for the UI. */
  summary: string;
  llm: { description: string; keywords: readonly string[] };
  palettes: readonly string[];
  roofTypes: Readonly<Partial<Record<RoofType, number>>>;
  roofProfiles: Readonly<Partial<Record<RoofProfile, number>>>;
  proportions: {
    /** Storey height including the floor/ceiling layer (blocks). */
    floorHeight: readonly [number, number];
    overhang: readonly [number, number];
    plinth: readonly [number, number];
    /** Default footprint (odd width × odd depth) and storeys per size class. */
    size: Readonly<Record<SizeClass, { width: number; depth: number; floors: number }>>;
  };
  /** Style default when the text says nothing about symmetry. */
  symmetric: boolean;
  /** Timber framing: none, only upper storeys, or every storey. */
  timber: 'none' | 'upper' | 'all';
  /** Upper storeys overhang on consoles. */
  jetty: boolean;
  windows: readonly string[];
  doors: readonly string[];
  lantern: 'lantern' | 'soul_lantern';
  /** Probabilities 0..1 for optional features at detail level 2. */
  details: Readonly<{ shutters: number; flowerBoxes: number; porch: number; chimney: number; dormers: number; annex: number }>;
  /** Block id fragments the style must never use (e.g. saturated woods next to grey stone). */
  forbidden: readonly string[];
}

const W = (width: number, depth: number, floors: number) => ({ width, depth, floors });

export const STYLES: Readonly<Record<StyleId, StyleDef>> = {
  medieval: {
    id: 'medieval',
    label: 'Mittelalter',
    summary: 'Steinernes Erdgeschoss, Fachwerk-Obergeschoss mit Auskragung, steiles Dach, Eckpfosten aus Stämmen.',
    llm: {
      description:
        'Mittelalterliches Haus: Erdgeschoss aus Steinziegeln oder Bruchstein, Obergeschoss als Fachwerk (dunkle Balken, helle Füllung) mit Auskragung, steiles Sattel- oder Krüppelwalmdach aus Fichte, Schwarzeiche oder Schiefer, Eckpfosten aus Stämmen.',
      keywords: ['mittelalter', 'mittelalterlich', 'fachwerk', 'tudor', 'burg', 'dorf', 'taverne', 'gasthaus', 'schmiede', 'zunft'],
    },
    palettes: ['medieval_timber', 'medieval_tudor', 'medieval_stone'],
    roofTypes: { gable: 0.55, half_hip: 0.25, hip: 0.1, gambrel: 0.1 },
    roofProfiles: { steep: 0.5, standard: 0.35, flared: 0.15 },
    proportions: {
      floorHeight: [4, 5],
      overhang: [1, 1],
      plinth: [1, 2],
      size: { small: W(7, 7, 1), medium: W(9, 9, 2), large: W(11, 11, 2), huge: W(15, 13, 3) },
    },
    symmetric: false,
    timber: 'upper',
    jetty: true,
    windows: ['W02', 'W04', 'W06', 'W03'],
    doors: ['T03', 'T01', 'T02'],
    lantern: 'lantern',
    details: { shutters: 0.6, flowerBoxes: 0.2, porch: 0.2, chimney: 0.8, dormers: 0.4, annex: 0.4 },
    forbidden: ['acacia', 'bamboo', 'concrete'],
  },
  fantasy: {
    id: 'fantasy',
    label: 'Fantasy / Märchen',
    summary: 'Geschwungene Glockendächer, Türmchen, runde und Bogenfenster, Moos und Ranken, asymmetrisch.',
    llm: {
      description:
        'Märchen- oder Hexenhaus: helle Putzwände, dunkle krumme Balken, geschwungenes Glocken- oder Steildach in Dunkeleiche, Karmesin oder Wirrholz, Türmchen, runde Fenster und Bogentüren, Moos am Sockel, verspielt und asymmetrisch.',
      keywords: ['märchen', 'maerchen', 'fantasy', 'hexe', 'hexenhaus', 'zauber', 'zauberer', 'fee', 'feen', 'elfen', 'hobbit', 'verwunschen', 'storybook'],
    },
    palettes: ['fantasy_storybook', 'fantasy_crimson', 'fantasy_warped'],
    roofTypes: { gable: 0.45, half_hip: 0.25, hip: 0.15, gambrel: 0.15 },
    roofProfiles: { bell: 0.4, flared: 0.35, steep: 0.25 },
    proportions: {
      floorHeight: [4, 5],
      overhang: [1, 2],
      plinth: [1, 2],
      size: { small: W(7, 7, 1), medium: W(9, 9, 2), large: W(11, 11, 2), huge: W(13, 13, 3) },
    },
    symmetric: false,
    timber: 'all',
    jetty: true,
    windows: ['W07', 'W05', 'W08', 'W13'],
    doors: ['T04', 'T02'],
    lantern: 'soul_lantern',
    details: { shutters: 0.4, flowerBoxes: 0.5, porch: 0.2, chimney: 0.7, dormers: 0.5, annex: 0.6 },
    forbidden: ['concrete', 'acacia'],
  },
  rustic: {
    id: 'rustic',
    label: 'Rustikal',
    summary: 'Holzhütte mit Veranda, Steinkamin, Fensterläden und Blumenkästen.',
    llm: {
      description:
        'Rustikale Holzhütte oder Landhaus: Wände aus Fichten- oder Eichenbrettern mit Stammrahmen, Bruchsteinsockel, Satteldach aus Schwarzeiche, Veranda mit Zaun-Geländer, Steinkamin, Fensterläden und Blumenkästen, gemütlich und etwas unregelmäßig.',
      keywords: ['rustikal', 'hütte', 'huette', 'blockhaus', 'landhaus', 'bauernhaus', 'cottage', 'chalet', 'holzhaus', 'gemütlich', 'gemuetlich', 'jagdhütte', 'berghütte'],
    },
    palettes: ['rustic_spruce', 'rustic_oak', 'rustic_logs'],
    roofTypes: { gable: 0.6, half_hip: 0.15, saltbox: 0.15, gambrel: 0.1 },
    roofProfiles: { standard: 0.6, flared: 0.25, steep: 0.15 },
    proportions: {
      floorHeight: [4, 5],
      overhang: [1, 2],
      plinth: [1, 2],
      size: { small: W(7, 7, 1), medium: W(9, 9, 1), large: W(11, 9, 2), huge: W(15, 11, 2) },
    },
    symmetric: false,
    timber: 'none',
    jetty: false,
    windows: ['W04', 'W02', 'W05', 'W03'],
    doors: ['T02', 'T01', 'T06', 'T05'],
    lantern: 'lantern',
    details: { shutters: 0.8, flowerBoxes: 0.6, porch: 0.7, chimney: 0.9, dormers: 0.3, annex: 0.5 },
    forbidden: ['concrete', 'quartz'],
  },
  nordic: {
    id: 'nordic',
    label: 'Nordisch',
    summary: 'Dunkles Fichten- und Schwarzeichenholz auf schwerem Steinsockel, steiles Dach mit großem Überstand, Firstbalken, Langhaus.',
    llm: {
      description:
        'Nordisches Langhaus oder Wikingerhalle: dunkles Fichten- und Schwarzeichenholz, schwerer dunkler Steinsockel, langgestreckt, steiles Satteldach mit 2–3 Block Überstand und Firstbalken aus Stämmen, kleine dunkle Fenster.',
      keywords: ['nordisch', 'skandinavisch', 'wikinger', 'viking', 'langhaus', 'halle', 'met', 'norden', 'fjord', 'skandinavien'],
    },
    palettes: ['nordic_longhouse', 'nordic_dark'],
    roofTypes: { gable: 0.75, a_frame: 0.1, half_hip: 0.15 },
    roofProfiles: { steep: 0.55, standard: 0.3, flared: 0.15 },
    proportions: {
      floorHeight: [4, 5],
      overhang: [2, 3],
      plinth: [2, 3],
      size: { small: W(7, 9, 1), medium: W(9, 15, 1), large: W(11, 19, 1), huge: W(13, 25, 2) },
    },
    symmetric: true,
    timber: 'none',
    jetty: false,
    windows: ['W02', 'W04', 'W03', 'W06'],
    doors: ['T01', 'T06'],
    lantern: 'lantern',
    details: { shutters: 0.5, flowerBoxes: 0, porch: 0.4, chimney: 0.5, dormers: 0.1, annex: 0.2 },
    forbidden: ['acacia', 'bamboo', 'concrete', 'birch'],
  },
  japanese: {
    id: 'japanese',
    label: 'Japanisch',
    summary: 'Erhöhter Sockel, dunkler Holzrahmen, Shoji-Wände, geschwungenes Dach mit großem Überstand, optional Pagode.',
    llm: {
      description:
        'Japanisches Haus oder Tempel: erhöhter Steinsockel, weiße Wände zwischen dunklen Holzständern, Shoji-Fenster aus weißen Scheiben, geschwungenes Walm- oder Pagodendach aus Schiefer oder Schwarzeiche mit großem Überstand, Laternen unter der Traufe, ruhig und symmetrisch.',
      keywords: ['japanisch', 'japan', 'pagode', 'tempel', 'schrein', 'dojo', 'shoji', 'asiatisch', 'teehaus', 'zen'],
    },
    palettes: ['japanese_classic', 'japanese_temple'],
    // Irimoya-like half-hip first: on a wider-than-deep plan it keeps a ridge (a hip on a
    // near-square plan reads as a stepped pyramid).
    roofTypes: { half_hip: 0.4, hip: 0.3, pagoda: 0.2, gable: 0.1 },
    roofProfiles: { flared: 0.55, bell: 0.45 },
    proportions: {
      floorHeight: [4, 5],
      overhang: [2, 3],
      plinth: [1, 2],
      size: { small: W(9, 7, 1), medium: W(13, 9, 1), large: W(15, 11, 2), huge: W(19, 15, 3) },
    },
    symmetric: true,
    timber: 'all',
    jetty: false,
    windows: ['W15'],
    doors: ['T09'],
    lantern: 'lantern',
    details: { shutters: 0, flowerBoxes: 0, porch: 0.6, chimney: 0, dormers: 0, annex: 0.2 },
    forbidden: ['cobblestone', 'acacia', 'mossy'],
  },
  cherry: {
    id: 'cherry',
    label: 'Kirschblüte',
    summary: 'Kirschholz mit dunklem Rahmen oder Dach, rosa Laub und Blütenblätter.',
    llm: {
      description:
        'Kirschblüten-Haus: rosa Kirschholzwände oder weiße Wände mit sehr dunklen Kirschstämmen als Rahmen, dunkles Schiefer- oder Kirschdach mit geschwungener Traufe, Kirschlaub und rosa Blütenblätter im Garten, Shoji- oder Rahmenfenster.',
      keywords: ['kirsch', 'kirschblüte', 'kirschbluete', 'sakura', 'rosa', 'pink', 'blüten', 'blueten', 'frühling', 'fruehling'],
    },
    palettes: ['cherry_slate', 'cherry_white'],
    roofTypes: { half_hip: 0.35, gable: 0.35, hip: 0.3 },
    roofProfiles: { flared: 0.5, bell: 0.3, standard: 0.2 },
    proportions: {
      floorHeight: [4, 5],
      overhang: [1, 2],
      plinth: [1, 2],
      size: { small: W(9, 7, 1), medium: W(11, 9, 1), large: W(13, 11, 2), huge: W(17, 13, 2) },
    },
    symmetric: true,
    timber: 'all',
    jetty: false,
    windows: ['W15', 'W03', 'W05'],
    doors: ['T09', 'T01'],
    lantern: 'lantern',
    details: { shutters: 0.2, flowerBoxes: 0.3, porch: 0.5, chimney: 0.2, dormers: 0.1, annex: 0.3 },
    forbidden: ['acacia', 'cobblestone'],
  },
  modern: {
    id: 'modern',
    label: 'Modern',
    summary: 'Kuben mit Flachdach und Attika, große Glasflächen, weiß, schwarz und grau, wenige Blocktypen.',
    llm: {
      description:
        'Modernes Haus: klare Kuben aus weißem Beton mit schwarzen oder grauen Kanten, Flachdach mit Attika, große Fensterbänder, versetzte Baukörper, nur 3–4 Blocktypen, keine Treppendächer, ruhig und symmetrisch.',
      keywords: ['modern', 'bungalow', 'villa', 'kubus', 'würfel', 'wuerfel', 'flachdach', 'minimalistisch', 'beton', 'glas', 'zeitgenössisch', 'bauhaus'],
    },
    palettes: ['modern_white', 'modern_wood'],
    roofTypes: { flat: 1 },
    roofProfiles: { standard: 1 },
    proportions: {
      floorHeight: [4, 5],
      overhang: [0, 1],
      plinth: [1, 1],
      size: { small: W(9, 7, 1), medium: W(11, 9, 2), large: W(15, 11, 2), huge: W(19, 15, 3) },
    },
    symmetric: true,
    timber: 'none',
    jetty: false,
    windows: ['W16', 'W01'],
    doors: ['T01'],
    lantern: 'lantern',
    details: { shutters: 0, flowerBoxes: 0, porch: 0.3, chimney: 0, dormers: 0, annex: 0.6 },
    forbidden: ['cobblestone', 'mossy', 'log', 'acacia'],
  },
  mediterranean: {
    id: 'mediterranean',
    label: 'Mediterran',
    summary: 'Weiße Wände, Bogenfenster und Arkaden, flaches rotes Ziegeldach, Töpfe und Fensterläden.',
    llm: {
      description:
        'Mediterranes Haus oder toskanische Villa: weiße oder sandfarbene Wände, flaches Walm- oder Satteldach aus roten Ziegeln mit wenig Überstand, Bogenfenster und Arkaden, türkise Fensterläden, Blumentöpfe, ruhig und symmetrisch.',
      keywords: ['mediterran', 'toskana', 'toskanisch', 'italienisch', 'griechisch', 'spanisch', 'villa', 'süden', 'sueden', 'meer', 'santorini', 'finca'],
    },
    palettes: ['mediterranean_white', 'mediterranean_warm'],
    roofTypes: { hip: 0.5, gable: 0.4, flat: 0.1 },
    roofProfiles: { shallow: 0.6, standard: 0.4 },
    proportions: {
      floorHeight: [4, 5],
      overhang: [1, 1],
      plinth: [1, 1],
      size: { small: W(7, 7, 1), medium: W(11, 9, 2), large: W(13, 11, 2), huge: W(17, 13, 3) },
    },
    symmetric: true,
    timber: 'none',
    jetty: false,
    windows: ['W17', 'W04', 'W05'],
    doors: ['T04', 'T05'],
    lantern: 'lantern',
    details: { shutters: 0.8, flowerBoxes: 0.6, porch: 0.4, chimney: 0.3, dormers: 0, annex: 0.4 },
    forbidden: ['cobblestone', 'mossy', 'deepslate_tiles'],
  },
};

export function getStyle(id: StyleId): StyleDef {
  return STYLES[id];
}

export const STYLE_LABELS: Readonly<Record<StyleId, string>> = Object.fromEntries(STYLE_IDS.map((id) => [id, STYLES[id].label])) as Record<StyleId, string>;

export const THEME_LABELS: Readonly<Record<Theme, string>> = { none: 'Kein Thema', winter: 'Winter', christmas: 'Weihnachten' };
