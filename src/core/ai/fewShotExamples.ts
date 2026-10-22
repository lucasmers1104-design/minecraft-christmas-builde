import type { PlanDraft } from '@/core/ai/planSchema';

/**
 * Curated German wish → plan pairs for the planner prompt (2–4 are picked per request by
 * keyword overlap, see fewShot.ts). Plans only list the decided fields; everything else is
 * "auto"/null. Each example is validated against the plan schema in the tests, and the
 * rule-based parser must agree on building type, style and theme.
 *
 * Keep the wishes different from the test set (tests/fixtures/planTestset.ts), otherwise the
 * measured accuracy of the real model would be inflated.
 */

export interface FewShotExample {
  id: string;
  wish: string;
  /** Word stems (lower case) that make this example relevant for a request. */
  keywords: readonly string[];
  plan: PlanDraft & { explanation: string; unsupported: string[] };
}

export const FEW_SHOT_EXAMPLES: readonly FewShotExample[] = [
  {
    id: 'christmas-cabin',
    wish: 'Baue ein gemütliches Weihnachtshaus aus Fichtenholz mit steilem Dach und vielen Laternen',
    keywords: ['weihnacht', 'gemütlich', 'fichte', 'holz', 'steil', 'laterne'],
    plan: {
      explanation: 'Gemütliches rustikales Weihnachtshaus mit Wänden aus Fichtenholz, steilem Dach und vielen Laternen.',
      unsupported: [],
      kind: 'house',
      style: 'rustic',
      theme: 'christmas',
      roofProfile: 'steep',
      lanternDensity: 'many',
      wallMaterial: 'spruce_planks',
    },
  },
  {
    id: 'tavern',
    wish: 'Mittelalterliche Taverne mit Fachwerk und Krüppelwalmdach',
    keywords: ['mittelalter', 'taverne', 'fachwerk', 'krüppelwalm', 'gasthaus', 'gasthof'],
    plan: {
      explanation: 'Mittelalterliches Gasthaus mit Fachwerk und Krüppelwalmdach.',
      unsupported: [],
      kind: 'house',
      style: 'medieval',
      roofType: 'half_hip',
    },
  },
  {
    id: 'teahouse',
    wish: 'Japanisches Teehaus mit geschwungenem Dach',
    keywords: ['japan', 'teehaus', 'geschwungen', 'asiatisch', 'zen'],
    plan: {
      explanation: 'Japanisches Teehaus mit geschwungenem Dach.',
      unsupported: [],
      kind: 'house',
      style: 'japanese',
      roofProfile: 'bell',
    },
  },
  {
    id: 'modern-villa',
    wish: 'Moderne Villa mit Flachdach, ohne Weihnachtsdeko',
    keywords: ['modern', 'villa', 'flachdach', 'bungalow', 'beton', 'glas'],
    plan: {
      explanation: 'Moderne Villa mit Flachdach, ohne weihnachtliches Thema.',
      unsupported: [],
      kind: 'house',
      style: 'modern',
      theme: 'none',
      roofType: 'flat',
    },
  },
  {
    id: 'big-tree',
    wish: 'Großer geschmückter Weihnachtsbaum mit Geschenken',
    keywords: ['weihnachtsbaum', 'tannenbaum', 'christbaum', 'tanne', 'baum', 'geschenk', 'geschmückt'],
    plan: {
      explanation: 'Großer, festlich geschmückter Weihnachtsbaum mit Geschenken.',
      unsupported: [],
      kind: 'tree',
      theme: 'christmas',
      size: 'large',
      detailLevel: 3,
      presents: true,
    },
  },
  {
    id: 'market',
    wish: 'Weihnachtsmarkt mit Glühweinbuden und Seelenlaternen',
    keywords: ['markt', 'bude', 'stand', 'glühwein', 'seelenlatern'],
    plan: {
      explanation: 'Weihnachtsmarkt mit Buden und blauen Seelenlaternen.',
      unsupported: [],
      kind: 'market_stall',
      theme: 'christmas',
      soulLanterns: true,
    },
  },
  {
    id: 'winter-station',
    wish: 'Kleiner Bahnhof im Winter',
    keywords: ['bahnhof', 'zug', 'gleis', 'station', 'winter', 'schnee'],
    plan: {
      explanation: 'Kleiner Bahnhof mit Winterthema. Schnee auf dem Dach wurde nicht ausdrücklich gewünscht.',
      unsupported: [],
      kind: 'station',
      theme: 'winter',
      size: 'small',
    },
  },
  {
    id: 'keep',
    wish: 'Burgturm aus Stein mit Pyramidendach',
    keywords: ['turm', 'burg', 'wachturm', 'stein', 'pyramide', 'bergfried'],
    plan: {
      explanation: 'Freistehender mittelalterlicher Turm aus Stein mit Pyramidendach.',
      unsupported: [],
      kind: 'tower',
      style: 'medieval',
      roofType: 'pyramid',
      wallMaterial: 'stone_bricks',
    },
  },
  {
    id: 'unsupported',
    wish: 'Haus mit Pool, Garage und Inneneinrichtung',
    keywords: ['pool', 'garage', 'möbel', 'keller', 'einrichtung', 'zimmer', 'brunnen', 'teich'],
    plan: {
      explanation: 'Haus im Stil-Standard. Pool, Garage und Inneneinrichtung kann der Generator nicht bauen.',
      unsupported: ['Pool', 'Garage', 'Inneneinrichtung'],
      kind: 'house',
    },
  },
  {
    id: 'fairy-rambling',
    wish: 'Verwinkeltes Märchenhaus mit Türmchen',
    keywords: ['märchen', 'hexe', 'fantasy', 'verwinkelt', 'türmchen', 'zauber'],
    plan: {
      explanation: 'Verwinkeltes Märchenhaus mit einem runden Türmchen.',
      unsupported: [],
      kind: 'house',
      style: 'fantasy',
      symmetry: 'rambling',
      tower: 'round',
    },
  },
  {
    id: 'nordic-hall',
    wish: 'Nordische Halle mit großem Überstand',
    keywords: ['nordisch', 'wikinger', 'halle', 'skandinav', 'überstand'],
    plan: {
      explanation: 'Nordische Halle mit weit überstehendem Dach.',
      unsupported: [],
      kind: 'house',
      style: 'nordic',
      overhang: 2,
    },
  },
  {
    id: 'cherry-garden',
    wish: 'Kirschblütenhaus mit Garten',
    keywords: ['kirsch', 'sakura', 'rosa', 'garten', 'blüte'],
    plan: {
      explanation: 'Haus im Kirschblüten-Stil mit Garten.',
      unsupported: [],
      kind: 'house',
      style: 'cherry',
      garden: true,
    },
  },
  {
    id: 'mediterranean-arches',
    wish: 'Mediterranes Haus mit Bogenfenstern und rotem Ziegeldach',
    keywords: ['mediterran', 'toskan', 'griechisch', 'bogen', 'ziegel', 'süden', 'italien'],
    plan: {
      explanation: 'Mediterranes Haus mit Bogenfenstern und rotem Ziegeldach.',
      unsupported: [],
      kind: 'house',
      style: 'mediterranean',
      windowFamily: 'arched',
      roofMaterial: 'bricks',
    },
  },
  {
    id: 'negations',
    wish: 'Haus ohne Schornstein und ohne Veranda, dafür mit vielen Fenstern',
    keywords: ['ohne', 'kein', 'schornstein', 'kamin', 'veranda', 'fenster'],
    plan: {
      explanation: 'Haus mit vielen Fenstern, ausdrücklich ohne Schornstein und ohne Veranda.',
      unsupported: [],
      kind: 'house',
      windows: 'many',
      porch: false,
      chimney: false,
    },
  },
  {
    id: 'timber-oriel',
    wish: 'Dreistöckiges Fachwerkhaus mit Erker',
    keywords: ['stöckig', 'stockwerk', 'geschoss', 'etage', 'fachwerk', 'erker'],
    plan: {
      explanation: 'Mittelalterliches Fachwerkhaus mit drei Geschossen und einem Erker.',
      unsupported: [],
      kind: 'house',
      style: 'medieval',
      floors: 3,
      oriel: true,
    },
  },
  {
    id: 'snow-roof',
    wish: 'Hütte mit Schnee auf dem Dach',
    keywords: ['schnee', 'verschneit', 'hütte', 'winter'],
    plan: {
      explanation: 'Rustikale Hütte im Winter mit ausdrücklich gewünschtem Schnee auf dem Dach.',
      unsupported: [],
      kind: 'house',
      style: 'rustic',
      theme: 'winter',
      snow: true,
    },
  },
  {
    id: 'symmetric-dims',
    wish: 'Symmetrisches Landhaus 13 x 9 mit zwei Gauben',
    keywords: ['symmetrisch', 'landhaus', 'gaube', 'breit', 'tief', 'blöcke'],
    plan: {
      explanation: 'Symmetrisches Landhaus mit 13 × 9 Blöcken Grundfläche und zwei Gauben.',
      unsupported: [],
      kind: 'house',
      style: 'rustic',
      symmetry: 'symmetric',
      width: 13,
      depth: 9,
      dormers: 2,
    },
  },
  {
    id: 'u-tower',
    wish: 'Haus in U-Form mit rundem Turm hinten links',
    keywords: ['form', 'flügel', 'innenhof', 'turm', 'links', 'rechts', 'hinten', 'vorne', 'rund', 'eckig'],
    plan: {
      explanation: 'Haus mit U-förmigem Grundriss und rundem Turm an der hinteren linken Ecke.',
      unsupported: [],
      kind: 'house',
      wings: 'U',
      tower: 'round',
      towerPosition: 'back_left',
    },
  },
  {
    id: 'chalet-balcony',
    wish: 'Chalet aus Eiche mit Balkon',
    keywords: ['chalet', 'eiche', 'balkon', 'alpen', 'berg'],
    plan: {
      explanation: 'Rustikales Chalet aus Eichenholz mit ausgestellter Traufe und Balkon.',
      unsupported: [],
      kind: 'house',
      style: 'rustic',
      roofProfile: 'flared',
      balcony: true,
      wallMaterial: 'oak_planks',
    },
  },
  {
    id: 'longhouse-slate',
    wish: 'Wikinger-Langhaus mit Schieferdach',
    keywords: ['wikinger', 'langhaus', 'schiefer'],
    plan: {
      explanation: 'Nordisches Langhaus mit Schieferdach.',
      unsupported: [],
      kind: 'house',
      style: 'nordic',
      palette: 'nordic_longhouse',
      roofMaterial: 'deepslate_tiles',
    },
  },
  {
    id: 'plain-few-windows',
    wish: 'Schlichtes Haus mit wenigen Fenstern',
    keywords: ['schlicht', 'einfach', 'wenig', 'minimal', 'fenster'],
    plan: {
      explanation: 'Schlichtes Haus mit wenig Dekoration und wenigen Fenstern.',
      unsupported: [],
      kind: 'house',
      detailLevel: 1,
      windows: 'few',
    },
  },
  {
    id: 'witch-door',
    wish: 'Hexenhaus mit Bogentür und Rundfenstern',
    keywords: ['hexe', 'bogentür', 'rundfenster', 'tür', 'rund'],
    plan: {
      explanation: 'Märchenhaftes Hexenhaus mit Rundbogentür und runden Fenstern.',
      unsupported: [],
      kind: 'house',
      style: 'fantasy',
      doorFamily: 'arched',
      windowFamily: 'round',
    },
  },
  {
    id: 'tree-beside',
    wish: 'Haus mit Weihnachtsbaum davor und Girlanden',
    keywords: ['weihnachtsbaum', 'davor', 'neben', 'girlande', 'garten'],
    plan: {
      explanation: 'Weihnachtliches Haus mit Girlanden und einem Weihnachtsbaum vor dem Haus.',
      unsupported: [],
      kind: 'house',
      theme: 'christmas',
      christmasTree: true,
      garland: true,
    },
  },
  {
    id: 'mansard-brick',
    wish: 'Mansardenhaus mit Backsteinwänden',
    keywords: ['mansard', 'backstein', 'ziegelstein', 'klinker'],
    plan: {
      explanation: 'Haus mit Mansarddach und Wänden aus Backstein.',
      unsupported: [],
      kind: 'house',
      roofType: 'mansard',
      wallMaterial: 'bricks',
    },
  },
  {
    id: 'pagoda-temple',
    wish: 'Japanischer Tempel als Pagode mit vielen Laternen',
    keywords: ['pagode', 'tempel', 'schrein', 'japan', 'laterne'],
    plan: {
      explanation: 'Japanischer Tempel mit Pagodendach und vielen Laternen.',
      unsupported: [],
      kind: 'house',
      style: 'japanese',
      palette: 'japanese_temple',
      roofType: 'pagoda',
      lanternDensity: 'many',
    },
  },
  {
    id: 'cottage-shutters',
    wish: 'Cottage mit Fensterläden und Vordach',
    keywords: ['cottage', 'fensterläden', 'läden', 'vordach', 'veranda'],
    plan: {
      explanation: 'Unregelmäßiges rustikales Cottage mit Fensterläden und Vordach.',
      unsupported: [],
      kind: 'house',
      style: 'rustic',
      symmetry: 'asymmetric',
      windowFamily: 'shuttered',
      porch: true,
    },
  },
];

/** Used when a request shares no keyword with any example (general format and restraint). */
export const DEFAULT_FEW_SHOT_IDS: readonly string[] = ['christmas-cabin', 'unsupported', 'negations'];
