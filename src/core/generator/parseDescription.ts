import {
  clampInt,
  clampOdd,
  FOOTPRINT_LIMITS,
  type BuildOptions,
  type MaterialPart,
} from '@/core/schema/buildOptions';
import {
  isImplementedBuildingType,
  type BuildingType,
  type BuildSize,
  type BuildStyle,
  type ColorTheme,
  type DetailLevel,
  type MaterialTheme,
} from '@/core/schema/buildSpec';

/**
 * Rule-based German free-text interpretation. It never invents geometry: it only fills the
 * same fields the UI offers. Everything it cannot map is reported as a warning instead of
 * being silently "implemented".
 */

export interface SpecPatch {
  kind?: BuildingType;
  style?: BuildStyle;
  size?: BuildSize;
  materialTheme?: MaterialTheme;
  colorTheme?: ColorTheme;
  detailLevel?: DetailLevel;
  options?: BuildOptions;
}

export interface RecognizedWish {
  /** Text as written by the user. */
  phrase: string;
  /** What it was mapped to, human readable. */
  effect: string;
}

export interface ParsedDescription {
  patch: SpecPatch;
  recognized: RecognizedWish[];
  warnings: string[];
}

const BUILDING_LABELS: Record<BuildingType, string> = {
  house: 'Haus',
  tree: 'Weihnachtsbaum',
  market_stall: 'Marktstand',
  station: 'Bahnhof',
};

/** Expands umlauts in a pattern so "grün" also matches "gruen" (and ß/ss). */
function de(pattern: string): string {
  return pattern.replace(/ä/g, '(?:ä|ae)').replace(/ö/g, '(?:ö|oe)').replace(/ü/g, '(?:ü|ue)').replace(/ß/g, '(?:ß|ss)');
}

const L = '\\p{L}\\p{N}';
/** Whole word (with optional German inflection endings). */
const word = (stem: string, endings = '(?:e|er|es|en|em|n|s)?') =>
  new RegExp(`(?<![${L}])(?:${de(stem)})${endings}(?![${L}])`, 'giu');
/** Substring inside compounds (e.g. "Fichtenholzhaus"). */
const part = (stem: string) => new RegExp(`(?:${de(stem)})`, 'giu');

interface Match {
  start: number;
  end: number;
  text: string;
}

function findAll(text: string, re: RegExp): Match[] {
  const out: Match[] = [];
  re.lastIndex = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    out.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
    if (m[0].length === 0) re.lastIndex++;
  }
  return out;
}

const NEGATION = new RegExp(`(?<![${L}])(?:ohne|kein|keine|keinen|keinem|keiner|nicht|nichts)(?![${L}])`, 'iu');

/** True if one of the two words before `start` is a negation ("ohne Schnee", "keinen Schornstein"). */
function isNegated(text: string, start: number): boolean {
  const before = text.slice(0, start).trim().split(/\s+/).slice(-2).join(' ');
  return NEGATION.test(before);
}

const CONNECTOR = new RegExp(`(?<![${L}])(?:mit|samt|inklusive|inkl|neben|plus|und|davor|daneben)(?![${L}])`, 'iu');
function isAttachment(text: string, start: number): boolean {
  const before = text.slice(0, start).trim().split(/\s+/).slice(-3).join(' ');
  return CONNECTOR.test(before);
}

interface Rule {
  re: RegExp;
  /** Returns the effect description, or null if the match should be ignored. */
  apply: (ctx: RuleContext, match: Match) => string | null;
}

interface RuleContext {
  /** Lower-cased text the rules match on (same length as the original). */
  text: string;
  /** Original text, for quoting the user's own words. */
  original: string;
  patch: SpecPatch;
  warnings: string[];
  options: BuildOptions;
  setMaterial: (part: MaterialPart, id: NonNullable<BuildOptions['materials']>[MaterialPart]) => void;
}

const setOnce = <K extends keyof SpecPatch>(patch: SpecPatch, key: K, value: NonNullable<SpecPatch[K]>): boolean => {
  if (patch[key] !== undefined) return false;
  patch[key] = value;
  return true;
};

/** The side word ("links"/"rechts") closest to the match, within a few words. */
function sideNear(text: string, m: Match): 'left' | 'right' | null {
  const from = Math.max(0, m.start - 24);
  const around = text.slice(from, Math.min(text.length, m.end + 24));
  let best: { side: 'left' | 'right'; distance: number } | null = null;
  const sideRe = /(?<![\p{L}])(?:(links|linke[nmrs]?|westlich)|(rechts|rechte[nmrs]?|östlich|oestlich))(?![\p{L}])/giu;
  for (let s = sideRe.exec(around); s; s = sideRe.exec(around)) {
    const pos = from + s.index;
    const distance = pos >= m.end ? pos - m.end : m.start - (pos + s[0].length);
    const side = s[1] ? 'left' : 'right';
    if (!best || distance < best.distance) best = { side, distance };
  }
  return best?.side ?? null;
}

const flagOption = (key: 'porch' | 'hedge', on: string, off: string) =>
  (ctx: RuleContext, m: Match): string => {
    const value = !isNegated(ctx.text, m.start);
    ctx.options[key] = value;
    return value ? on : off;
  };

const flag = (key: 'snow' | 'chimney' | 'lights' | 'garland' | 'presents' | 'christmasTree', on: string, off: string) =>
  (ctx: RuleContext, m: Match): string => {
    const value = !isNegated(ctx.text, m.start);
    ctx.options[key] = value;
    return value ? on : off;
  };

const COLOR_WORDS: { re: string; roof?: NonNullable<BuildOptions['materials']>['roof']; wall?: NonNullable<BuildOptions['materials']>['wall']; accent?: NonNullable<BuildOptions['materials']>['accent']; theme?: ColorTheme; label: string }[] = [
  { re: 'rot', roof: 'red_terracotta', accent: 'red_wool', theme: 'red_green', label: 'rot' },
  { re: 'grün', roof: 'green_terracotta', accent: 'green_wool', theme: 'red_green', label: 'grün' },
  { re: '(?:eis)?blau', roof: 'blue_terracotta', accent: 'light_blue_wool', theme: 'ice_blue', label: 'blau' },
  { re: 'weiß', wall: 'white_terracotta', accent: 'white_wool', label: 'weiß' },
  { re: 'schwarz', roof: 'black_terracotta', accent: 'black_wool', label: 'schwarz' },
  { re: 'grau', roof: 'gray_concrete', label: 'grau' },
  { re: 'gelb|golden', accent: 'yellow_wool', label: 'gelb/gold' },
  { re: 'lila|violett', accent: 'purple_wool', label: 'lila' },
  { re: 'orange', accent: 'orange_wool', label: 'orange' },
  { re: 'braun', theme: 'natural', label: 'braun' },
];

const ROOF_NOUN = '(?:dach|dächer|dachziegel|ziegeldach)';
const WALL_NOUN = '(?:wand|wände|wänden|fassade|mauern?)';
const ACCENT_NOUN = '(?:akzent\\w*|fensterläden|läden|details|verzierung\\w*|schleife\\w*|deko\\w*)';

function colorPartRules(): Rule[] {
  const rules: Rule[] = [];
  for (const c of COLOR_WORDS) {
    const adjective = `(?<![${L}])${de(c.re)}\\p{L}*\\s+`;
    if (c.roof) {
      const roof = c.roof;
      rules.push({
        re: new RegExp(`${adjective}${de(ROOF_NOUN)}`, 'giu'),
        apply: (ctx) => {
          ctx.setMaterial('roof', roof);
          return `Dach: ${c.label}`;
        },
      });
    }
    if (c.wall) {
      const wall = c.wall;
      rules.push({
        re: new RegExp(`${adjective}${de(WALL_NOUN)}`, 'giu'),
        apply: (ctx) => {
          ctx.setMaterial('wall', wall);
          return `Wände: ${c.label}`;
        },
      });
    }
    if (c.accent) {
      const accent = c.accent;
      rules.push({
        re: new RegExp(`${adjective}${de(ACCENT_NOUN)}`, 'giu'),
        apply: (ctx) => {
          ctx.setMaterial('accent', accent);
          if (c.theme) setOnce(ctx.patch, 'colorTheme', c.theme);
          return `Akzentfarbe: ${c.label}`;
        },
      });
    }
  }
  return rules;
}

/** Rules are applied in order; a character range consumed by one rule is not matched again. */
const RULES: Rule[] = [
  // Explicit dimensions first, so numbers are not misread.
  {
    re: new RegExp(`(\\d{1,2})\\s*(?:x|×|mal)\\s*(\\d{1,2})(?:\\s*(?:blöcke|bloecke|blocks?))?`, 'giu'),
    apply: (ctx, m) => {
      const [w, d] = m.text.match(/\d+/g)!.map(Number) as [number, number];
      ctx.options.width = clampOdd(w, FOOTPRINT_LIMITS.width);
      ctx.options.depth = clampOdd(d, FOOTPRINT_LIMITS.depth);
      if (ctx.options.width !== w || ctx.options.depth !== d) {
        ctx.warnings.push(`Grundfläche ${w}×${d} auf ${ctx.options.width}×${ctx.options.depth} angepasst (ungerade Maße für mittige Tür und First, Grenzen beachtet).`);
      }
      return `Grundfläche ${ctx.options.width}×${ctx.options.depth}`;
    },
  },
  {
    re: new RegExp(de(`(\\d{1,2})\\s*(?:blöcke?\\s*|bloecke?\\s*|blocks?\\s*)?breit`), 'giu'),
    apply: (ctx, m) => {
      const w = Number(m.text.match(/\d+/)![0]);
      ctx.options.width = clampOdd(w, FOOTPRINT_LIMITS.width);
      if (ctx.options.width !== w) ctx.warnings.push(`Breite ${w} auf ${ctx.options.width} angepasst (ungerade, Grenzen ${FOOTPRINT_LIMITS.width.min}–${FOOTPRINT_LIMITS.width.max}).`);
      return `Breite ${ctx.options.width}`;
    },
  },
  {
    re: new RegExp(de(`(\\d{1,2})\\s*(?:blöcke?\\s*|bloecke?\\s*|blocks?\\s*)?(?:tief|lang)`), 'giu'),
    apply: (ctx, m) => {
      const d = Number(m.text.match(/\d+/)![0]);
      ctx.options.depth = clampOdd(d, FOOTPRINT_LIMITS.depth);
      if (ctx.options.depth !== d) ctx.warnings.push(`Tiefe ${d} auf ${ctx.options.depth} angepasst (ungerade, Grenzen ${FOOTPRINT_LIMITS.depth.min}–${FOOTPRINT_LIMITS.depth.max}).`);
      return `Tiefe ${ctx.options.depth}`;
    },
  },
  {
    re: new RegExp(de(`(?:(\\d{1,2})\\s*(?:blöcke?\\s*)?hohe?n?\\s*wände|wandhöhe\\s*(?:von\\s*)?(\\d{1,2})|wände\\s*(?:mit\\s*)?(\\d{1,2})\\s*(?:blöcke?n?\\s*)?hoch)`), 'giu'),
    apply: (ctx, m) => {
      const h = Number(m.text.match(/\d+/)![0]);
      ctx.options.wallHeight = clampInt(h, FOOTPRINT_LIMITS.wallHeight);
      if (ctx.options.wallHeight !== h) ctx.warnings.push(`Wandhöhe ${h} auf ${ctx.options.wallHeight} begrenzt (${FOOTPRINT_LIMITS.wallHeight.min}–${FOOTPRINT_LIMITS.wallHeight.max}).`);
      return `Wandhöhe ${ctx.options.wallHeight}`;
    },
  },
  {
    re: new RegExp(de(`(?:zwei|2|drei|3)\\s*-?\\s*(?:stöckig\\w*|stockwerke?|etagen?|geschoss\\w*)|zweistöckig\\w*|dreistöckig\\w*|obergeschoss\\w*`), 'giu'),
    apply: (ctx) => {
      ctx.options.wallHeight = FOOTPRINT_LIMITS.wallHeight.max - 1;
      ctx.warnings.push('Mehrere Stockwerke: Eine echte Zwischendecke mit Treppe wird noch nicht gebaut – die Wände werden stattdessen höher.');
      return `höhere Wände (${ctx.options.wallHeight})`;
    },
  },

  // Colour + part combinations ("rotes Dach", "weiße Wände", "goldene Akzente").
  ...colorPartRules(),

  // Window wishes.
  {
    re: new RegExp(de(`(?:viele[nrs]?|große[nrs]?|grosse[nrs]?|breite[nrs]?|riesige[nrs]?|mehr)\\s+fenster\\w*|fensterfront|lichtdurchflutet\\w*`), 'giu'),
    apply: (ctx) => {
      ctx.options.windows = 'many';
      return 'Fenster: viele';
    },
  },
  {
    re: new RegExp(de(`(?:wenige[nrs]?|kleine[nrs]?|kaum)\\s+fenster\\w*`), 'giu'),
    apply: (ctx) => {
      ctx.options.windows = 'few';
      return 'Fenster: wenige';
    },
  },
  // Roof shape.
  {
    re: new RegExp(de(`(?:steile?[snrm]?|spitze?[snrm]?|hohe?[snrm]?)\\s+${ROOF_NOUN}|spitzdach|steildach`), 'giu'),
    apply: (ctx) => {
      ctx.options.roofShape = 'steep';
      return 'Dach: steil';
    },
  },
  {
    re: new RegExp(de(`(?:flache?[snrm]?)\\s+${ROOF_NOUN}|flachdach`), 'giu'),
    apply: (ctx) => {
      ctx.options.roofShape = 'gable';
      ctx.warnings.push('Flachdächer werden noch nicht gebaut – es bleibt beim normal geneigten Satteldach.');
      return 'Dach: normal geneigt (Flachdach nicht verfügbar)';
    },
  },

  // Feature switches (with negation: "ohne Schnee").
  { re: part('schnee|verschneit|winterlich'), apply: flag('snow', 'Schnee auf dem Dach', 'kein Schnee') },
  { re: part('schornstein|kamin|rauchfang|esse(?![nrs])'), apply: flag('chimney', 'Schornstein', 'kein Schornstein') },
  {
    re: new RegExp(`${part('leucht').source}|${part('beleucht').source}|${part('lichter').source}|${word('licht').source}|${part('lampe').source}|${part('laterne').source}|${part('erleuchtet').source}`, 'giu'),
    apply: flag('lights', 'Licht / Leuchtstein', 'keine Beleuchtung'),
  },
  {
    re: word('dunkel|dunkl'),
    apply: (ctx) => {
      ctx.options.lights = false;
      return 'keine Beleuchtung';
    },
  },
  { re: part('girlande'), apply: flag('garland', 'Girlanden', 'keine Girlanden') },
  { re: part('geschenk|päckchen|paket'), apply: flag('presents', 'Geschenke', 'keine Geschenke') },
  // Attached building parts (house only).
  {
    re: new RegExp(`${word('turm|türmchen|türme', '(?:e|en)?').source}|${part('glockenturm|uhrturm|kirchturm|eckturm').source}`, 'giu'),
    apply: (ctx, m) => {
      const side = sideNear(ctx.text, m) ?? 'left';
      if (isNegated(ctx.text, m.start)) {
        ctx.options.tower = 'none';
        return 'kein Turm';
      }
      ctx.options.tower = side;
      return `Turm ${side === 'left' ? 'links' : 'rechts'}`;
    },
  },
  {
    re: part('anbau|seitenflügel|flügel|nebengebäude'),
    apply: (ctx, m) => {
      const side = sideNear(ctx.text, m) ?? 'right';
      if (isNegated(ctx.text, m.start)) {
        ctx.options.annex = 'none';
        return 'kein Anbau';
      }
      ctx.options.annex = side;
      return `Anbau ${side === 'left' ? 'links' : 'rechts'}`;
    },
  },
  {
    re: part('veranda|vordach|terrasse|überdachung|vorbau'),
    apply: flagOption('porch', 'Vordach am Eingang', 'kein Vordach'),
  },
  {
    re: part('hecke|zaun|garten|grundstück'),
    apply: flagOption('hedge', 'Hecke ums Grundstück (Zäune werden als Hecke gebaut)', 'keine Hecke'),
  },
  {
    re: part('walmdach|walm'),
    apply: (ctx) => {
      ctx.options.roofShape = 'hip';
      return 'Dach: Walmdach';
    },
  },

  // Building type. The first type not attached with "mit/und …" is the main building.
  {
    re: part('weihnachtsbaum|tannenbaum|christbaum|baum'),
    apply: (ctx, m) => mainOrAttachment(ctx, m, 'tree'),
  },
  {
    re: new RegExp(`${part('marktstand|marktbude|glühweinstand|verkaufsstand|weihnachtsmarkt|bude').source}|${word('markt', '(?:es|s)?').source}`, 'giu'),
    apply: (ctx, m) => mainOrAttachment(ctx, m, 'market_stall'),
  },
  {
    re: new RegExp(`${de('bahnhof|bahnsteig|eisenbahn')}|(?<![${L}])(?:station|zug|züge|zuege|zügen|zuegen)(?![${L}])`, 'giu'),
    apply: (ctx, m) => mainOrAttachment(ctx, m, 'station'),
  },
  {
    re: part('häuschen|häusle|haus|hütte|cottage|chalet|villa|blockhaus'),
    apply: (ctx, m) => mainOrAttachment(ctx, m, 'house'),
  },

  // Size.
  {
    re: new RegExp(`${word('klein').source}|${word('winzig').source}|${word('mini').source}|${word('kompakt').source}|${part('häuschen').source}`, 'giu'),
    apply: (ctx) => (setOnce(ctx.patch, 'size', 'small') ? 'Größe: klein' : null),
  },
  {
    re: new RegExp(`${word('groß').source}|${word('riesig').source}|${part('riesen').source}|${word('weitläufig').source}|${word('imposant').source}|${word('villa').source}`, 'giu'),
    apply: (ctx) => (setOnce(ctx.patch, 'size', 'large') ? 'Größe: groß' : null),
  },
  {
    re: new RegExp(`${word('mittelgroß').source}|${word('mittel').source}|${word('normalgroß').source}`, 'giu'),
    apply: (ctx) => (setOnce(ctx.patch, 'size', 'medium') ? 'Größe: mittel' : null),
  },

  // Specific wall materials (before the generic material themes).
  {
    re: part('birke|birken'),
    apply: (ctx) => {
      ctx.options.frameWood = 'birch';
      ctx.setMaterial('wall', 'birch_planks');
      ctx.setMaterial('floor', 'birch_planks');
      return 'Material: Birke';
    },
  },
  {
    re: new RegExp(`${part('schwarzeiche|dunkeleiche').source}|${de('dunkle[snrm]?\\s+holz')}`, 'giu'),
    apply: (ctx) => {
      ctx.options.frameWood = 'dark_oak';
      ctx.setMaterial('wall', 'dark_oak_planks');
      return 'Material: dunkles Holz';
    },
  },
  {
    re: part('ziegelstein|backstein|klinker|ziegel(?!dach)'),
    apply: (ctx) => {
      ctx.setMaterial('wall', 'bricks');
      return 'Wände: Ziegel';
    },
  },
  {
    re: part('sandstein'),
    apply: (ctx) => {
      ctx.setMaterial('wall', 'sandstone');
      return 'Wände: Sandstein';
    },
  },
  {
    re: part('quarz|marmor'),
    apply: (ctx) => {
      ctx.setMaterial('wall', 'quartz_block');
      return 'Wände: Quarz';
    },
  },
  {
    re: part('lehm'),
    apply: (ctx) => {
      ctx.setMaterial('wall', 'mud_bricks');
      return 'Wände: Lehmziegel';
    },
  },
  // Material themes.
  {
    re: part('fichte|tanne(?!nbaum)|nadelholz'),
    apply: (ctx) => (setOnce(ctx.patch, 'materialTheme', 'spruce') ? 'Material: Fichte' : null),
  },
  {
    re: part('eiche'),
    apply: (ctx) => (setOnce(ctx.patch, 'materialTheme', 'oak') ? 'Material: Eiche' : null),
  },
  {
    re: new RegExp(`${part('(?<!leucht|edel|glanz|schorn)stein').source}|${part('burg|festung|schloss').source}`, 'giu'),
    apply: (ctx) => (setOnce(ctx.patch, 'materialTheme', 'stone') ? 'Material: Stein' : null),
  },
  {
    re: word('holz', '(?:es|e)?'),
    apply: () => 'Material: Holz',
  },

  // Style.
  {
    re: part('märchen|verwunschen|zauber|fantasie|verspielt|lebkuchen|knusper|hexenhaus|bunt'),
    apply: (ctx) => (setOnce(ctx.patch, 'style', 'fairytale') ? 'Stil: märchenhaft' : null),
  },
  {
    re: part('realistisch|authentisch|echt(?=e|es|er|en|\\b)'),
    apply: (ctx) => (setOnce(ctx.patch, 'style', 'realistic') ? 'Stil: realistisch' : null),
  },
  {
    re: part('weihnacht|advent|nikolaus|christkind'),
    apply: (ctx) => (setOnce(ctx.patch, 'style', 'christmas') ? 'Stil: weihnachtlich' : null),
  },

  // Detail level.
  {
    re: new RegExp(`${word('schlicht').source}|${word('einfach').source}|${part('minimalistisch').source}|${de('ohne\\s+(?:deko|dekoration|schmuck)')}|${de('wenig\\s+deko\\w*')}`, 'giu'),
    apply: (ctx) => (setOnce(ctx.patch, 'detailLevel', 1) ? 'Detailgrad: schlicht' : null),
  },
  {
    re: new RegExp(`${part('festlich').source}|${part('prächtig').source}|${de('reich\\s+verziert')}|${de('viel(?:e|er)?\\s+deko\\w*')}|${part('üppig').source}|${part('opulent').source}|${part('geschmückt').source}`, 'giu'),
    apply: (ctx) => (setOnce(ctx.patch, 'detailLevel', 3) ? 'Detailgrad: festlich' : null),
  },
  {
    re: new RegExp(`${part('dekoriert').source}|${de('etwas\\s+deko\\w*')}`, 'giu'),
    apply: (ctx) => (setOnce(ctx.patch, 'detailLevel', 2) ? 'Detailgrad: dekoriert' : null),
  },

  // Colour themes (colour words not attached to a building part).
  {
    re: new RegExp(`${part('eisblau').source}|${word('blau').source}|${part('frost').source}|${part('eisig').source}|${word('eis').source}|${word('kalt').source}`, 'giu'),
    apply: (ctx) => (setOnce(ctx.patch, 'colorTheme', 'ice_blue') ? 'Farben: Eisblau' : null),
  },
  {
    re: new RegExp(`${word('rot').source}|${word('grün').source}|${part('rot-grün').source}|${word('klassisch').source}`, 'giu'),
    apply: (ctx) => (setOnce(ctx.patch, 'colorTheme', 'red_green') ? 'Farben: Rot-Grün' : null),
  },
  {
    re: new RegExp(`${part('natur').source}|${part('rustikal').source}|${word('braun').source}|${word('erdig').source}`, 'giu'),
    apply: (ctx) => (setOnce(ctx.patch, 'colorTheme', 'natural') ? 'Farben: Natur' : null),
  },

];

function mainOrAttachment(ctx: RuleContext, m: Match, kind: BuildingType): string | null {
  const phrase = ctx.original.slice(m.start, m.end);
  const negated = isNegated(ctx.text, m.start);
  const attached = isAttachment(ctx.text, m.start) || negated;
  if (!attached && ctx.patch.kind === undefined) {
    if (!isImplementedBuildingType(kind)) {
      ctx.warnings.push(`„${phrase}“: Der Bauwerkstyp ${BUILDING_LABELS[kind]} ist noch nicht verfügbar – es wird ein Haus gebaut.`);
      ctx.patch.kind = 'house';
      return `Bauwerk: ${BUILDING_LABELS[kind]} (nicht verfügbar)`;
    }
    ctx.patch.kind = kind;
    if (kind === 'house' && new RegExp(de('häuschen|häusle'), 'iu').test(phrase) && setOnce(ctx.patch, 'size', 'small')) {
      return 'Bauwerk: Haus, Größe: klein';
    }
    return `Bauwerk: ${BUILDING_LABELS[kind]}`;
  }
  // Attached to another building.
  if (kind === 'tree') {
    ctx.options.christmasTree = !negated;
    return negated ? 'kein Weihnachtsbaum' : 'Weihnachtsbaum im Haus';
  }
  if (kind === 'house') return null;
  ctx.warnings.push(`„${phrase}“ kann nicht zusätzlich zu einem anderen Bauwerk gebaut werden und wird ignoriert.`);
  return null;
}

/** Wishes we know about but cannot build yet – reported with a specific explanation. */
const KNOWN_UNSUPPORTED: { re: RegExp; message: (phrase: string) => string }[] = [
  {
    re: new RegExp(`${part('haustür|eingangstür|holztür|vordertür').source}|${word('tür', '(?:e|en)?').source}`, 'giu'),
    message: () => 'Echte Tür-Blöcke werden noch nicht gesetzt – der Eingang bleibt eine offene, begehbare Öffnung.',
  },
  { re: part('treppe|stufen'), message: (p) => `„${p}“: Treppen werden noch nicht gebaut (nur volle Blöcke).` },
  { re: part('balkon'), message: (p) => `„${p}“: Balkone werden noch nicht gebaut.` },
  { re: part('keller'), message: (p) => `„${p}“: Keller werden noch nicht gebaut.` },
  {
    re: new RegExp(`${part('pool|schwimmbad|brunnen').source}|${word('teich', '(?:e|es)?').source}`, 'giu'),
    message: (p) => `„${p}“: Wasserflächen werden noch nicht gebaut.`,
  },
  { re: part('garage|carport'), message: (p) => `„${p}“ wird noch nicht gebaut.` },
  {
    re: new RegExp(`${part('möbel').source}|${word('bett|tisch|stuhl|stühle|sofa|sessel|schrank|regal', '(?:e|en|es|s)?').source}`, 'giu'),
    message: (p) => `„${p}“: Möbel werden noch nicht eingerichtet.`,
  },
];

const STOPWORDS = new Set(
  `baue bau baut bauen erstelle erstellen mach mache machen generiere generieren zeichne bitte gerne gern ich mir mich
  wir uns möchte moechte will würde wuerde hätte haette soll sollte sollen ein eine einen einem einer eines der die das
  den dem des mit und oder aus in im am an auf für fuer von vom zu zum zur bei beim sehr ganz etwas schön schoen schöne
  schoene schönes schoenes schönen schoenen gemütlich gemuetlich gemütliche gemuetliche gemütliches gemuetliches
  gemütlichen gemuetlichen hübsch huebsch hübsches huebsches nett nettes toll tolles so wie auch noch dazu sowie
  außerdem ausserdem viel viele vielen mein meine meinen es er sie bisschen minecraft block blöcke bloecke blocks stil
  look art design akzente akzenten fenster dach dächer wände waende wand bauwerk gebäude gebaeude ganzes richtig
  typisch typischen typische schönem einfach also dann damit drin drinnen innen außen aussen darauf drauf oben unten
  vorne hinten links rechts seite seiten passend passende passenden`.split(/\s+/),
);

/**
 * Splits the description into clauses and reports clauses whose content words were not
 * understood by any rule.
 */
function unknownClauseWarnings(text: string, consumed: boolean[]): string[] {
  const warnings: string[] = [];
  const clauseRe = new RegExp(`[^,.;!?\\n]+`, 'gu');
  for (const clause of findAll(text, clauseRe)) {
    // Further split on "und"/"mit"/"sowie" so "Haus mit Pool" reports "Pool".
    const pieces = findAll(clause.text, new RegExp(`(?:(?<![${L}])(?:mit|und|sowie|samt)(?![${L}]))?[^]*?(?=(?<![${L}])(?:mit|und|sowie|samt)(?![${L}])|$)`, 'giu'));
    for (const piece of pieces) {
      if (piece.text.trim().length === 0) continue;
      const start = clause.start + piece.start;
      let anyConsumed = false;
      const leftover: string[] = [];
      for (const w of findAll(piece.text, new RegExp(`[${L}][${L}-]*`, 'gu'))) {
        const ws = start + w.start;
        const covered = consumed.slice(ws, ws + w.text.length).some(Boolean);
        if (covered) anyConsumed = true;
        else if (!STOPWORDS.has(w.text.toLowerCase()) && w.text.length >= 3 && !/^\d+$/.test(w.text)) leftover.push(w.text);
      }
      if (!anyConsumed && leftover.length > 0) {
        warnings.push(`„${piece.text.trim()}“ wurde nicht erkannt und wird nicht umgesetzt.`);
      }
    }
  }
  return warnings;
}

export function parseDescription(input: string): ParsedDescription {
  const text = input.slice(0, 2000);
  const lower = text.toLowerCase();
  const consumed = new Array<boolean>(text.length).fill(false);
  const patch: SpecPatch = {};
  const options: BuildOptions = {};
  const warnings: string[] = [];
  const recognized: RecognizedWish[] = [];
  const materials: NonNullable<BuildOptions['materials']> = {};
  const ctx: RuleContext = {
    text: lower,
    original: text,
    patch,
    warnings,
    options,
    setMaterial: (partName, id) => {
      (materials as Record<string, string | undefined>)[partName] = id;
    },
  };

  const claim = (m: Match): boolean => {
    if (consumed.slice(m.start, m.end).some(Boolean)) return false;
    for (let i = m.start; i < m.end; i++) consumed[i] = true;
    return true;
  };

  // Known-but-unsupported wishes first, so e.g. "Haustür" is not read as "Haus".
  for (const known of KNOWN_UNSUPPORTED) {
    for (const m of findAll(lower, known.re)) {
      if (!claim(m)) continue;
      const message = known.message(text.slice(m.start, m.end));
      if (!warnings.includes(message)) warnings.push(message);
    }
  }

  // Matches are applied in text order per rule priority, so "rotes Dach" wins over "rot".
  for (const rule of RULES) {
    for (const m of findAll(lower, rule.re)) {
      if (consumed.slice(m.start, m.end).some(Boolean)) continue;
      const effect = rule.apply(ctx, m);
      if (effect === null) {
        claim(m);
        continue;
      }
      claim(m);
      recognized.push({ phrase: text.slice(m.start, m.end), effect });
    }
  }

  warnings.push(...unknownClauseWarnings(text, consumed));

  if (Object.keys(materials).length > 0) options.materials = materials;
  if (Object.keys(options).length > 0) patch.options = options;
  return { patch, recognized, warnings };
}
