import {
  describePlan,
  KIND_LABELS,
  patchToPlan,
  PLAN_MATERIALS,
  PLAN_VALUE_LABELS,
  SIZE_LABELS,
  type BuildPlan,
  type PlanMaterialRole,
} from '@/core/ai/planSchema';
import { clampInt, clampOdd, FOOTPRINT_LIMITS, type BuildOptions } from '@/core/schema/buildOptions';
import type { BuildingType, BuildSize, DetailLevel } from '@/core/schema/buildSpec';
import { getMaterial, hasMaterial } from '@/core/style/materials';
import { PALETTES } from '@/core/style/palettes';
import { STYLE_IDS, STYLE_LABELS, STYLES, THEME_LABELS, type StyleId, type Theme } from '@/core/style/styles';
import { COMPOSITION_INFO, COMPOSITION_LABELS, COMPOSITIONS } from '@/core/style/compositions';

/**
 * Rule-based German free-text interpretation (BuildSpec v2). It never invents geometry: it
 * only fills the same catalogue fields the UI and the AI plan offer. Wishes it understands but
 * the generator cannot build go to `unsupported`; text it does not understand is reported as
 * a warning instead of being silently "implemented".
 *
 * Techniques: umlaut variants (ä/ae, ß/ss), whole-word or compound matching per stem, a
 * character claim map so one phrase only has one meaning ("Schornstein" is no stone,
 * "Haustür" no house, "Schneesturm" no tower, "türkis" no door), negation scopes
 * ("ohne Schnee und Girlanden", "kein Turm"), sides (links/rechts, vorne/hinten), weighted
 * style votes (explicit style words beat building types beat weak hints) and a separate pass
 * for building nouns (main building vs. attached parts like "Haus mit Turm").
 */

/** Partial spec as produced by the parser, the AI planner (via planToPatch) and the UI. */
export interface SpecPatch {
  kind?: BuildingType;
  style?: StyleId;
  theme?: Theme;
  size?: BuildSize;
  detailLevel?: DetailLevel;
  options?: BuildOptions;
}

export interface RecognizedWish {
  /** Text as written by the user. */
  phrase: string;
  /** What it was mapped to, human readable (German). */
  effect: string;
}

export interface ParsedDescription {
  patch: SpecPatch;
  recognized: RecognizedWish[];
  /** Not understood or adjusted (clamped sizes, unknown clauses). */
  warnings: string[];
  /** Understood, but the generator cannot build it (Pool, Garage, Möbel, Keller …). */
  unsupported: string[];
  /** Short German summary of the resulting plan. */
  explanation: string;
}

// ---------------------------------------------------------------------------------------------
// Regex helpers

/** Expands umlauts in a pattern so "grün" also matches "gruen" (and ß/ss). */
function de(pattern: string): string {
  return pattern.replace(/ä/g, '(?:ä|ae)').replace(/ö/g, '(?:ö|oe)').replace(/ü/g, '(?:ü|ue)').replace(/ß/g, '(?:ß|ss)');
}

const LN = String.raw`\p{L}\p{N}`;
const NOT_BEFORE = `(?<![${LN}])`;
const NOT_AFTER = `(?![${LN}])`;
/**
 * Word ending (inflection or compound tail). It stops before a building noun, so
 * "Mansardenhaus" is a mansard roof AND a house, "Gartenhaus" a garden AND a house.
 */
const TAIL = String.raw`(?:(?!haus|häus|hütte|villa|bungalow|turm|türm|gebäude)\p{L})*`;

type Mode = 'any' | 'start' | 'word';
/** any: inside compounds; start: at a word start; word: whole word. */
function rx(src: string, mode: Mode = 'any'): RegExp {
  const body = `(?:${de(src)})`;
  return new RegExp(mode === 'any' ? body : mode === 'start' ? `${NOT_BEFORE}${body}` : `${NOT_BEFORE}${body}${NOT_AFTER}`, 'giu');
}

/** Lower-cases without changing the string length (index positions stay valid). */
function lowerSameLength(s: string): string {
  let out = '';
  for (const ch of s) {
    const l = ch.toLowerCase();
    out += l.length === ch.length ? l : ch;
  }
  return out;
}

/** ASCII-folded lower-case word (ä → ae …) for simple membership checks. */
function fold(word: string): string {
  return word.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
}

interface Match {
  start: number;
  end: number;
  text: string;
  groups: (string | undefined)[];
}

interface Word {
  start: number;
  end: number;
  text: string;
}

const WORD_RE = new RegExp(`[${LN}][${LN}-]*`, 'gu');

function wordsIn(text: string, offset = 0): Word[] {
  const out: Word[] = [];
  WORD_RE.lastIndex = 0;
  for (let m = WORD_RE.exec(text); m; m = WORD_RE.exec(text)) out.push({ start: offset + m.index, end: offset + m.index + m[0].length, text: m[0] });
  return out;
}

/** Bounds of the word around a position. */
function wordAround(text: string, start: number, end: number): Word {
  const isL = (c: string | undefined) => c !== undefined && /[\p{L}\p{N}-]/u.test(c);
  let s = start;
  let e = end;
  while (s > 0 && isL(text[s - 1])) s--;
  while (e < text.length && isL(text[e])) e++;
  return { start: s, end: e, text: text.slice(s, e) };
}

/** Text of the clause before a position (back to the last punctuation mark). */
function clauseBefore(text: string, start: number): { text: string; offset: number } {
  const from = Math.max(0, start - 160);
  const chunk = text.slice(from, start);
  const cut = Math.max(...['.', ';', '!', '?', ':', '\n', ',', '(', ')'].map((c) => chunk.lastIndexOf(c)));
  return { text: chunk.slice(cut + 1), offset: from + cut + 1 };
}

function clauseAfter(text: string, end: number): { text: string; offset: number } {
  const chunk = text.slice(end, end + 160);
  const idx = chunk.search(/[.;!?:\n,()]/);
  return { text: idx === -1 ? chunk : chunk.slice(0, idx), offset: end };
}

const NEGATIONS = new Set(['ohne', 'kein', 'keine', 'keinen', 'keinem', 'keiner', 'keines', 'nicht', 'nichts', 'weder']);
const NEGATION_BREAKS = new Set([
  'mit',
  'aber',
  'sondern',
  'dafür',
  'dafuer',
  'jedoch',
  'doch',
  'samt',
  'plus',
  'inklusive',
  'inkl',
  'sowie',
  'zusätzlich',
  'zusaetzlich',
  'außerdem',
  'ausserdem',
  'dazu',
  'auch',
  'stattdessen',
  'lieber',
  'eher',
  'dagegen',
  'nur',
]);

/**
 * True if the phrase at `start` is negated: a negation word earlier in the same clause, with
 * nothing in between that starts a new positive item ("mit", "aber", "und viele …").
 * "ohne Schnee und Girlanden" negates both; "ohne Schnee, mit Girlanden" only the snow.
 */
function isNegated(text: string, start: number, matchText = ''): boolean {
  const clause = clauseBefore(text, start);
  const words = wordsIn(clause.text).map((w) => w.text.toLowerCase());
  // A match with a quantifier or adjective ("viele Laternen") right after "und" is a new item.
  const lead = wordsIn(matchText).length > 1 ? 1 : 0;
  for (let k = words.length - 1, seen = lead; k >= 0 && seen < 8 + lead; k--, seen++) {
    const w = words[k]!;
    if (NEGATIONS.has(w)) return true;
    if (NEGATION_BREAKS.has(w)) return false;
    if ((w === 'und' || w === 'oder') && seen > 0) return false;
  }
  return false;
}

const CONNECTORS = new Set(['mit', 'samt', 'neben', 'und', 'plus', 'inklusive', 'inkl', 'daneben', 'davor', 'dahinter', 'vor', 'hinter', 'bei', 'beim', 'an', 'am', 'sowie', 'nebst', 'dazu', 'zusätzlich', 'zusaetzlich']);

/** The nearest connector word ("mit", "neben" …) among the three words before `start`. */
function connectorBefore(text: string, start: number): string | null {
  const words = wordsIn(clauseBefore(text, start).text).map((w) => w.text.toLowerCase());
  for (let k = words.length - 1; k >= Math.max(0, words.length - 3); k--) if (CONNECTORS.has(words[k]!)) return words[k]!;
  return null;
}

// ---------------------------------------------------------------------------------------------
// Parse context

interface Recognized {
  phrase: string;
  effect: string;
  start: number;
}

interface StyleVote {
  style: StyleId;
  weight: number;
  start: number;
  rec: Recognized;
}

interface Building {
  kind: BuildingType;
  word: Word;
  nounStart: number;
  role: 'main' | 'attached' | 'negated' | 'same';
  rec: Recognized | null;
}

type ThemeVote = { theme: 'christmas' | 'winter' | 'none'; negated: boolean; start: number };

class Ctx {
  readonly claimed: Uint8Array;
  /** Building nouns (separate layer: "Fachwerkhaus" is a style word AND a house). */
  readonly kindClaimed: Uint8Array;
  readonly patch: SpecPatch = {};
  readonly options: Record<string, unknown> = {};
  readonly materials: Partial<Record<PlanMaterialRole, string>> = {};
  readonly warnings: string[] = [];
  readonly unsupportedByReason = new Map<string, { phrases: string[]; first: number }>();
  readonly recognized: Recognized[] = [];
  readonly styleVotes: StyleVote[] = [];
  readonly paletteHints: { palette: string; style: StyleId; rec: Recognized }[] = [];
  readonly themeVotes: ThemeVote[] = [];
  readonly buildings: Building[] = [];
  /** Option keys set by an explicit wish (weak defaults never override them). */
  readonly explicit = new Set<string>();
  main: Building | null = null;
  /** "Häuschen", "Bäumchen": small unless the text names a size. */
  diminutive: Recognized | null = null;

  constructor(
    readonly text: string,
    readonly original: string,
  ) {
    this.claimed = new Uint8Array(text.length);
    this.kindClaimed = new Uint8Array(text.length);
  }

  /** The user's words around a match (whole words, a hyphen ends a word: "Wikinger-Langhaus"). */
  phrase(start: number, end: number): string {
    const isL = (c: string | undefined) => c !== undefined && /[\p{L}\p{N}]/u.test(c);
    let s = start;
    let e = end;
    while (s > 0 && isL(this.original[s - 1])) s--;
    while (e < this.original.length && isL(this.original[e])) e++;
    return this.original.slice(s, e).trim();
  }

  rec(m: { start: number; end: number }, effect: string): Recognized {
    const r = { phrase: this.phrase(m.start, m.end), effect, start: m.start };
    this.recognized.push(r);
    return r;
  }

  set(key: string, value: unknown): void {
    this.options[key] = value;
    this.explicit.add(key);
  }

  setWeak(key: string, value: unknown): boolean {
    if (this.explicit.has(key) || this.options[key] !== undefined) return false;
    this.options[key] = value;
    return true;
  }

  /** Sets a catalogue material; ids outside the curated plan list are never set (tests cover every mapping). */
  material(role: PlanMaterialRole, id: string): string {
    if (!hasMaterial(id) || !PLAN_MATERIALS[role].includes(id)) return id;
    this.materials[role] = id;
    return getMaterial(id).label;
  }

  vote(style: StyleId, weight: number, m: { start: number; end: number }, effect?: string): Recognized {
    const rec = this.rec(m, effect ?? `Stil: ${STYLE_LABELS[style]}`);
    this.styleVotes.push({ style, weight, start: m.start, rec });
    return rec;
  }

  unsupported(phrase: string, reason: string, start: number): void {
    const entry = this.unsupportedByReason.get(reason) ?? { phrases: [], first: start };
    if (!entry.phrases.some((p) => p.toLowerCase() === phrase.toLowerCase())) entry.phrases.push(phrase);
    entry.first = Math.min(entry.first, start);
    this.unsupportedByReason.set(reason, entry);
  }

  negated(m: { start: number; text?: string }): boolean {
    return isNegated(this.text, m.start, m.text);
  }
}

/** Effect text: string = recognized, '' = claim silently, null = not this rule (no claim). */
type Effect = string | null;

interface Rule {
  re: RegExp;
  apply: (ctx: Ctx, m: Match) => Effect;
}

function overlaps(layer: Uint8Array, start: number, end: number): boolean {
  for (let i = start; i < end; i++) if (layer[i]) return true;
  return false;
}

function claim(layer: Uint8Array, start: number, end: number): void {
  layer.fill(1, start, end);
}

function runRules(ctx: Ctx, rules: readonly Rule[]): void {
  for (const rule of rules) {
    const re = rule.re;
    re.lastIndex = 0;
    for (let m = re.exec(ctx.text); m; m = re.exec(ctx.text)) {
      const start = m.index;
      const end = start + m[0].length;
      if (end === start) {
        re.lastIndex = start + 1;
        continue;
      }
      if (overlaps(ctx.claimed, start, end)) {
        re.lastIndex = start + 1;
        continue;
      }
      const effect = rule.apply(ctx, { start, end, text: m[0], groups: m.slice(1) });
      if (effect === null) {
        re.lastIndex = start + 1;
        continue;
      }
      claim(ctx.claimed, start, end);
      if (effect) ctx.rec({ start, end }, effect);
      re.lastIndex = end;
    }
  }
}

const label = (field: string, value: string | number) => PLAN_VALUE_LABELS[field as keyof typeof PLAN_VALUE_LABELS]?.[String(value)] ?? String(value);

/** Sets an option from a yes/no wish, honouring negation. */
const toggle =
  (key: string, on: string, off: string) =>
  (ctx: Ctx, m: Match): Effect => {
    const value = !ctx.negated(m);
    ctx.set(key, value);
    return value ? on : off;
  };

const NUMBER_WORDS: Readonly<Record<string, number>> = {
  ein: 1,
  eine: 1,
  einen: 1,
  einem: 1,
  einer: 1,
  eines: 1,
  eins: 1,
  einzige: 1,
  zwei: 2,
  drei: 3,
  vier: 4,
  fuenf: 5,
  sechs: 6,
  sieben: 7,
  acht: 8,
  neun: 9,
  zehn: 10,
  elf: 11,
  zwoelf: 12,
};
const NUM = String.raw`(\d{1,2}|ein(?:e[mnrs]?)?|eins|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf)`;

function toNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Number(raw);
  return NUMBER_WORDS[fold(raw)] ?? null;
}

function setClamped(ctx: Ctx, key: 'width' | 'depth' | 'floors' | 'overhang' | 'dormers', raw: number, what: string): number {
  const limits = FOOTPRINT_LIMITS[key];
  const value = key === 'width' || key === 'depth' ? clampOdd(raw, limits) : clampInt(raw, limits);
  if (value !== raw) {
    const why = key === 'width' || key === 'depth' ? `ungerade für mittige Tür und First, ${limits.min}–${limits.max}` : `${limits.min}–${limits.max}`;
    ctx.warnings.push(`${what} ${raw} auf ${value} angepasst (${why}).`);
  }
  ctx.set(key, value);
  return value;
}

// ---------------------------------------------------------------------------------------------
// A1 – understood, but not buildable (claimed first so "Haustür"/"Baumhaus" stay what they are)

const R = {
  water: 'Wasserflächen, Pools und Brunnen baut der Generator nicht',
  garage: 'Garagen und Carports gibt es nicht',
  interior: 'keine Möbel und Inneneinrichtung, Innenräume bleiben frei',
  cellar: 'Keller werden nicht gebaut',
  dome: 'Kuppeldächer gibt es nicht',
  type: 'dieser Bauwerkstyp ist nicht verfügbar',
  castle: 'ganze Burg- oder Schlossanlagen werden nicht gebaut, es entsteht ein einzelnes Gebäude',
  figures: 'Figuren und Tiere werden nicht gebaut',
  icicles: 'Eiszapfen werden bewusst nicht gebaut',
  redstone: 'Redstone-Technik wird nicht gebaut',
  thatch: 'diese Dachdeckung gibt es nicht, das Dachmaterial kommt aus der Stilpalette',
  second: 'ein zweites Bauwerk wird nicht zusätzlich gebaut',
  towerOnly: 'Türme gibt es nur an Häusern',
  squareTower: 'freistehende Türme baut der Generator rund',
} as const;

const unsupportedRule = (src: string, mode: Mode, reason: string, extra?: (ctx: Ctx, m: Match) => void): Rule => ({
  re: rx(src, mode),
  apply: (ctx, m) => {
    if (ctx.negated(m)) return '';
    ctx.unsupported(ctx.phrase(m.start, m.end), reason, m.start);
    extra?.(ctx, m);
    return '';
  },
});

const UNSUPPORTED_RULES: Rule[] = [
  unsupportedRule(`baumhaus${TAIL}|baumhäus${TAIL}|hausboot${TAIL}`, 'any', R.type),
  unsupportedRule(`windmühle${TAIL}|wassermühle${TAIL}|mühlrad${TAIL}|mühlenflügel${TAIL}|mühle${TAIL}`, 'any', R.type),
  unsupportedRule(`schneem(?:a|ä)nn${TAIL}`, 'any', R.figures, (ctx, m) => ctx.themeVotes.push({ theme: 'winter', negated: false, start: m.start })),
  unsupportedRule(`weihnachtsm(?:a|ä)nn${TAIL}|rentier${TAIL}|schlitten${TAIL}|krippe${TAIL}|figur${TAIL}|statue${TAIL}`, 'start', R.figures, (ctx, m) => {
    if (/weihnacht/i.test(m.text)) ctx.themeVotes.push({ theme: 'christmas', negated: false, start: m.start });
  }),
  unsupportedRule(`pferd|pferde|pferden|kuh|kühe|schaf|schafe|hund|hunde|katze|katzen|huhn|hühner|tier|tiere|tieren`, 'word', R.figures),
  unsupportedRule(`eiszapfen${TAIL}`, 'any', R.icicles),
  unsupportedRule(
    `swimmingpool${TAIL}|pool${TAIL}|schwimmbad${TAIL}|schwimmbecken${TAIL}|whirlpool${TAIL}|springbrunnen${TAIL}|brunnen${TAIL}|wasserfall${TAIL}|wasserfäll${TAIL}|wassergraben${TAIL}|burggraben${TAIL}|aquarium${TAIL}`,
    'any',
    R.water,
  ),
  unsupportedRule(`teich|teiche|teichen|gartenteich|see|bach|fluss|flüsse`, 'word', R.water),
  unsupportedRule(`garage${TAIL}|carport${TAIL}|auto|autos`, 'word', R.garage),
  unsupportedRule(
    `möbel${TAIL}|möbliert${TAIL}|inneneinrichtung${TAIL}|einrichtung|eingerichtet${TAIL}|innenausstattung${TAIL}|kaminzimmer${TAIL}|kaminofen${TAIL}|kachelofen${TAIL}|kronleuchter${TAIL}|bücherregal${TAIL}|bibliothek${TAIL}|schlafzimmer${TAIL}|wohnzimmer${TAIL}|kinderzimmer${TAIL}|badezimmer${TAIL}|küche${TAIL}`,
    'start',
    R.interior,
  ),
  unsupportedRule(`bett|betten|tisch|tische|tischen|stuhl|stühle|stühlen|sofa|sofas|couch|sessel|schrank|schränke|regal|regale|teppich|teppiche|herd|ofen|bad|zimmer|räume|räumen|raum|innenraum|innenräume|innenräumen`, 'word', R.interior),
  unsupportedRule(`keller${TAIL}|untergeschoss${TAIL}|souterrain|verlies${TAIL}|kerker${TAIL}`, 'any', R.cellar),
  unsupportedRule(`kuppel${TAIL}`, 'any', R.dome),
  unsupportedRule(`iglu${TAIL}|brücke${TAIL}|kathedrale${TAIL}|moschee${TAIL}`, 'start', R.type),
  unsupportedRule(`kirche|kirchen|schiff|schiffe|boot|boote`, 'word', R.type),
  unsupportedRule(`zelt|zelte|zelten`, 'word', R.type),
  unsupportedRule(`(?:burg|burgen|schloss|schloß|schlösser|festung|festungen|palast|paläste|zitadelle)(?![${LN}])`, 'any', R.castle, (ctx, m) => {
    if (/burg|festung|zitadelle/i.test(m.text)) ctx.vote('medieval', 1, m, `Stil-Hinweis: ${STYLE_LABELS.medieval}`);
  }),
  unsupportedRule(`redstone${TAIL}|aufzug${TAIL}|fahrstuhl${TAIL}|lift|kolben|falltür-?mechanismus|mechanismus${TAIL}|automatische${TAIL}`, 'start', R.redstone),
  unsupportedRule(`strohdach${TAIL}|reetdach${TAIL}|stroh|reet|blechdach${TAIL}|wellblech${TAIL}`, 'start', R.thatch),
];

// Jetty before the storey words, so "Fachwerk-Obergeschoss" is one wish.
const JETTY_RULE: Rule = {
  re: rx(
    String.raw`jetty|vorkragend${TAIL}(?:\s+(?:ober)?geschoss${TAIL})?|auskragend${TAIL}(?:\s+(?:ober)?geschoss${TAIL})?|auskragung${TAIL}|(?:überhängend|vorspringend)${TAIL}\s+(?:ober)?geschoss${TAIL}|fachwerk-?obergeschoss${TAIL}|obergeschoss\s+aus\s+fachwerk`,
    'start',
  ),
  apply: (ctx, m) => {
    if (ctx.negated(m)) {
      ctx.set('jetty', false);
      return 'keine Auskragung';
    }
    ctx.set('jetty', true);
    if (/geschoss/i.test(m.text) && ctx.options.floors === undefined) ctx.set('floors', 2);
    if (/fachwerk/i.test(m.text)) ctx.vote('medieval', 2, m);
    return 'Auskragung (Jetty)';
  },
};

// ---------------------------------------------------------------------------------------------
// A2 – numbers: footprint, storeys

const FLOOR_NOUN = String.raw`(?:stockwerk|etage|geschoss|ebene|stöcke|stock)${TAIL}`;

const NUMBER_RULES: Rule[] = [
  {
    re: rx(String.raw`(\d{1,3})\s*(?:x|×|\*|mal)\s*(\d{1,3})(?:\s*(?:blöcke|blöcken|blocks?|felder))?`, 'start'),
    apply: (ctx, m) => {
      const w = setClamped(ctx, 'width', Number(m.groups[0]), 'Breite');
      const d = setClamped(ctx, 'depth', Number(m.groups[1]), 'Tiefe');
      return `Grundfläche ${w}×${d}`;
    },
  },
  {
    re: rx(String.raw`breite\s*(?:von\s*)?(\d{1,3})|(\d{1,3})\s*(?:blöcke?n?\s*|blocks?\s*)?breit${TAIL}`, 'start'),
    apply: (ctx, m) => `Breite ${setClamped(ctx, 'width', Number(m.groups[0] ?? m.groups[1]), 'Breite')}`,
  },
  {
    re: rx(String.raw`(?:tiefe|länge)\s*(?:von\s*)?(\d{1,3})|(\d{1,3})\s*(?:blöcke?n?\s*|blocks?\s*)?(?:tief|lang)${TAIL}`, 'start'),
    apply: (ctx, m) => `Tiefe ${setClamped(ctx, 'depth', Number(m.groups[0] ?? m.groups[1]), 'Tiefe')}`,
  },
  // "zwei Obergeschosse" = 3 storeys.
  {
    re: rx(String.raw`${NUM}\s+obergeschoss${TAIL}`, 'start'),
    apply: (ctx, m) => {
      const n = toNumber(m.groups[0]);
      if (n === null) return null;
      return `Geschosse: ${setClamped(ctx, 'floors', n + 1, 'Geschosse')}`;
    },
  },
  {
    re: rx(String.raw`${NUM}\s*-?\s*(?:stöckig|geschossig|etagig)${TAIL}|${NUM}\s+${FLOOR_NOUN}`, 'start'),
    apply: (ctx, m) => {
      const n = toNumber(m.groups[0] ?? m.groups[1]);
      if (n === null) return null;
      return `Geschosse: ${setClamped(ctx, 'floors', n, 'Geschosse')}`;
    },
  },
  {
    re: rx(String.raw`doppelstöckig${TAIL}|mehrstöckig${TAIL}|mehrgeschossig${TAIL}|ebenerdig${TAIL}`, 'start'),
    apply: (ctx, m) => {
      const n = /doppel/i.test(m.text) ? 2 : /mehr/i.test(m.text) ? 3 : 1;
      ctx.set('floors', n);
      return `Geschosse: ${n}`;
    },
  },
  {
    re: rx(String.raw`obergeschoss${TAIL}|oberes\s+stockwerk|obere\s+etage|erdgeschoss\s+und\s+obergeschoss`, 'start'),
    apply: (ctx, m) => {
      if (ctx.negated(m)) {
        ctx.set('floors', 1);
        return 'Geschosse: 1';
      }
      if (ctx.options.floors === undefined) ctx.set('floors', 2);
      return `Geschosse: ${String(ctx.options.floors)}`;
    },
  },
];

// ---------------------------------------------------------------------------------------------
// A3 – doors and windows

const FENSTER = String.raw`\p{L}*fenster${TAIL}`;

const OPENING_RULES: Rule[] = [
  // Doors.
  {
    re: rx(`doppeltür${TAIL}|flügeltür${TAIL}|zweiflügelig${TAIL}(?:\\s+tür${TAIL})?|doppelflügel${TAIL}|scheunentor${TAIL}|große[nmrs]?\\s+tür${TAIL}|großes\\s+tor`, 'start'),
    apply: (ctx) => {
      ctx.set('doorFamily', 'double');
      return `Tür: ${label('doorFamily', 'double')}`;
    },
  },
  {
    re: rx(`rundbogentür${TAIL}|bogentür${TAIL}|spitzbogentür${TAIL}|rundbogenportal${TAIL}|bogenportal${TAIL}|portal${TAIL}|torbogen${TAIL}|tür\\s+mit\\s+(?:rund)?bogen`, 'start'),
    apply: (ctx) => {
      ctx.set('doorFamily', 'arched');
      return `Tür: ${label('doorFamily', 'arched')}`;
    },
  },
  {
    re: rx(`tor|tore`, 'word'),
    apply: (ctx) => {
      ctx.set('doorFamily', 'double');
      return `Tür: ${label('doorFamily', 'double')}`;
    },
  },
  {
    re: rx(`oberlicht${TAIL}|tür\\s+mit\\s+fenster\\s+darüber`, 'start'),
    apply: (ctx) => {
      ctx.set('doorFamily', 'transom');
      return `Tür: ${label('doorFamily', 'transom')}`;
    },
  },
  {
    re: rx(`schiebetür${TAIL}|genkan`, 'start'),
    apply: (ctx) => {
      ctx.set('doorFamily', 'genkan');
      return `Tür: ${label('doorFamily', 'genkan')}`;
    },
  },
  {
    re: rx(`überdachte[nmrs]?\\s+(?:haus|eingangs)?tür${TAIL}|tür\\s+mit\\s+vordach|überdachte[nmrs]?\\s+eingang${TAIL}`, 'start'),
    apply: (ctx) => {
      ctx.set('doorFamily', 'porch');
      return `Tür: ${label('doorFamily', 'porch')}`;
    },
  },
  {
    re: rx(`(?:einfache|schlichte)[nmrs]?\\s+(?:haus|holz)?tür${TAIL}`, 'start'),
    apply: (ctx) => {
      ctx.set('doorFamily', 'simple');
      return `Tür: ${label('doorFamily', 'simple')}`;
    },
  },
  // Any other door is just a door (claimed so "Haustür" is no house; "türkis" is no door).
  { re: new RegExp(`\\p{L}*${de('tür')}(?:e|en)?${NOT_AFTER}`, 'giu'), apply: () => '' },
  // Window families (before the density words, which only claim the quantifier).
  {
    re: rx(`spitzbogenfenster${TAIL}|rundbogenfenster${TAIL}|bogenfenster${TAIL}|fenster\\s+mit\\s+(?:rund)?bögen|gewölbte[nmrs]?\\s+fenster${TAIL}|rundbogige[nmrs]?\\s+fenster${TAIL}|arkade${TAIL}`, 'start'),
    apply: (ctx) => {
      ctx.set('windowFamily', 'arched');
      return `Fensterform: ${label('windowFamily', 'arched')}`;
    },
  },
  {
    re: rx(`rundfenster${TAIL}|runde[nmrs]?\\s+fenster${TAIL}|bullauge${TAIL}|ochsenauge${TAIL}|kreisfenster${TAIL}`, 'start'),
    apply: (ctx) => {
      ctx.set('windowFamily', 'round');
      return `Fensterform: ${label('windowFamily', 'round')}`;
    },
  },
  {
    re: rx(`fensterläden|fensterladen|fensterläd${TAIL}|klappläden|klappladen|holzläden`, 'start'),
    apply: (ctx, m) => {
      if (ctx.negated(m)) {
        ctx.set('windowFamily', 'simple');
        return 'Fenster ohne Läden';
      }
      ctx.set('windowFamily', 'shuttered');
      return `Fensterform: ${label('windowFamily', 'shuttered')}`;
    },
  },
  {
    re: rx(`shoji${TAIL}|papierfenster${TAIL}|papierwänd${TAIL}|papierwand|reispapier${TAIL}|schiebefenster${TAIL}`, 'start'),
    apply: (ctx, m) => {
      ctx.set('windowFamily', 'shoji');
      ctx.vote('japanese', 1, m, `Stil-Hinweis: ${STYLE_LABELS.japanese}`);
      return `Fensterform: ${label('windowFamily', 'shoji')}`;
    },
  },
  {
    re: rx(`bleiglas${TAIL}|bleiverglas${TAIL}|butzenscheibe${TAIL}|sprossenfenster${TAIL}|kirchenfenster${TAIL}|buntglas${TAIL}|mosaikfenster${TAIL}|bunte[nmrs]?\\s+fenster${TAIL}`, 'start'),
    apply: (ctx) => {
      ctx.set('windowFamily', 'leaded');
      return `Fensterform: ${label('windowFamily', 'leaded')}`;
    },
  },
  {
    re: rx(`fensterband${TAIL}|fensterbänder${TAIL}|bandfenster${TAIL}|panoramafenster${TAIL}|glasfront${TAIL}|fensterfront${TAIL}|glaswand|glaswände${TAIL}|glasfassade${TAIL}|bodentiefe[nmrs]?\\s+fenster${TAIL}`, 'start'),
    apply: (ctx) => {
      ctx.set('windowFamily', 'band');
      ctx.set('windows', 'many');
      return `Fensterform: ${label('windowFamily', 'band')}, viele Fenster`;
    },
  },
  {
    re: rx(`gerahmte[nmrs]?\\s+fenster${TAIL}|fenster\\s+mit\\s+(?:holz)?rahmen|fensterrahmen${TAIL}`, 'start'),
    apply: (ctx) => {
      ctx.set('windowFamily', 'framed');
      return `Fensterform: ${label('windowFamily', 'framed')}`;
    },
  },
  {
    re: rx(`(?:einfache|schlichte)[nmrs]?\\s+fenster${TAIL}`, 'start'),
    apply: (ctx) => {
      ctx.set('windowFamily', 'simple');
      return `Fensterform: ${label('windowFamily', 'simple')}`;
    },
  },
  // Window density: only the quantifier is claimed ("viele Bogenfenster" = arched + many).
  {
    re: rx(`(?:viele|vielen|große|großen|großer|riesige|riesigen|breite|breiten|mehr|zahlreiche|zahlreichen|lauter)(?=\\s+(?:\\p{L}+\\s+)?${FENSTER})|lichtdurchflutet${TAIL}`, 'start'),
    apply: (ctx) => {
      ctx.set('windows', 'many');
      return `Fenster: ${label('windows', 'many')}`;
    },
  },
  {
    re: rx(`(?:wenige|wenigen|kleine|kleinen|kaum|schmale|schmalen|winzige|winzigen)(?=\\s+(?:\\p{L}+\\s+)?${FENSTER})|fensterlos${TAIL}|ohne\\s+fenster`, 'start'),
    apply: (ctx) => {
      ctx.set('windows', 'few');
      return `Fenster: ${label('windows', 'few')}`;
    },
  },
];

// ---------------------------------------------------------------------------------------------
// A4 – roof: type, profile, overhang, dormers

const DACH = String.raw`(?:dach|dächer|dachform|bedachung)${TAIL}`;

const roofType = (src: string, type: string, extra?: (ctx: Ctx, m: Match) => void): Rule => ({
  re: rx(src, 'start'),
  apply: (ctx, m) => {
    ctx.set('roofType', type);
    extra?.(ctx, m);
    return `Dachform: ${label('roofType', type)}`;
  },
});
const roofProfile = (src: string, profile: string, mode: Mode = 'start', extra?: (ctx: Ctx, m: Match) => void): Rule => ({
  re: rx(src, mode),
  apply: (ctx, m) => {
    if (ctx.negated(m)) return '';
    ctx.set('roofProfile', profile);
    extra?.(ctx, m);
    return `Dachprofil: ${label('roofProfile', profile)}`;
  },
});

const ROOF_RULES: Rule[] = [
  // Overhang.
  {
    re: rx(String.raw`(\d)\s*(?:blöcke?n?\s*|blocks?\s*)?(?:dach)?überstand${TAIL}|(?:dach)?überstand\s*(?:von\s*)?(\d)`, 'start'),
    apply: (ctx, m) => `Dachüberstand: ${setClamped(ctx, 'overhang', Number(m.groups[0] ?? m.groups[1]), 'Dachüberstand')}`,
  },
  {
    re: rx(
      String.raw`(?:(sehr|extrem|besonders)\s+)?(?:große[nmrs]?|weite[nmrs]?|breite[nmrs]?|tiefe[nmrs]?|ausladende[nmrs]?|starke[nmrs]?)\s+(?:dach)?überstand${TAIL}|weit\s+(?:über|vor)stehende[nmrs]?(?:\s+${DACH})?|weit\s+vorgezogene[nmrs]?(?:\s+${DACH})?`,
      'start',
    ),
    apply: (ctx, m) => {
      const v = m.groups[0] ? 3 : 2;
      ctx.set('overhang', v);
      return `Dachüberstand: ${v}`;
    },
  },
  {
    re: rx(String.raw`(?:kleine[nmrs]?|knappe[nmrs]?|geringe[nmrs]?|wenig)\s+(?:dach)?überstand${TAIL}`, 'start'),
    apply: (ctx) => {
      ctx.set('overhang', 1);
      return 'Dachüberstand: 1';
    },
  },
  {
    re: rx(String.raw`(?:dach)?überstand${TAIL}|bündige[nmrs]?\s+${DACH}`, 'start'),
    apply: (ctx, m) => {
      const v = ctx.negated(m) || /bündig/i.test(m.text) ? 0 : 2;
      ctx.set('overhang', v);
      return v === 0 ? 'kein Dachüberstand' : 'Dachüberstand: 2';
    },
  },
  // Dormers.
  {
    re: rx(String.raw`${NUM}\s+(?:dach)?gaube${TAIL}|${NUM}\s+dachfenster${TAIL}`, 'start'),
    apply: (ctx, m) => {
      const n = toNumber(m.groups[0] ?? m.groups[1]);
      if (n === null) return null;
      return `Gauben: ${setClamped(ctx, 'dormers', n, 'Gauben')}`;
    },
  },
  {
    re: rx(String.raw`(?:dach)?gaube${TAIL}|dachfenster${TAIL}`, 'start'),
    apply: (ctx, m) => {
      const n = ctx.negated(m) ? 0 : /gaube$/i.test(m.text) ? 1 : 2;
      ctx.set('dormers', n);
      return n === 0 ? 'keine Gauben' : `Gauben: ${n}`;
    },
  },
  // Roof types (compounds first).
  roofType(`krüppelwalm${TAIL}|halbwalm${TAIL}|teilwalm${TAIL}`, 'half_hip'),
  roofType(`irimoya${TAIL}|walmgiebel${TAIL}`, 'irimoya', (ctx, m) => ctx.vote('japanese', 1, m, `Stil-Hinweis: ${STYLE_LABELS.japanese}`)),
  roofType(`walm${TAIL}`, 'hip'),
  roofType(`mansard${TAIL}`, 'mansard'),
  roofType(`gambrel${TAIL}|scheunendach${TAIL}|holländische[nmrs]?\\s+${DACH}`, 'gambrel'),
  roofType(`saltbox${TAIL}|schleppdach${TAIL}|(?:asymmetrische|ungleiche|einseitig\\s+verlängerte)[nmrs]?\\s+${DACH}`, 'saltbox'),
  roofType(`a-?frame${TAIL}|a-rahmen${TAIL}|nurdach|spitzdach(?=\\s*-?\\s*h(?:ü|ue)tte)|dach\\s+bis\\s+zum\\s+boden`, 'a_frame'),
  roofType(`flachdach${TAIL}|flachdächer${TAIL}`, 'flat', (ctx, m) => ctx.vote('modern', 1, m, `Stil-Hinweis: ${STYLE_LABELS.modern}`)),
  roofType(`pyramidendach${TAIL}|pyramide${TAIL}|zeltdach${TAIL}`, 'pyramid'),
  roofType(`pagode${TAIL}|pagoden${TAIL}`, 'pagoda', (ctx, m) => ctx.vote('japanese', 2, m, `Stil: ${STYLE_LABELS.japanese}`)),
  roofType(`satteldach${TAIL}|giebeldach${TAIL}|satteldächer${TAIL}`, 'gable'),
  {
    re: rx(`pultdach${TAIL}|pultdächer${TAIL}`, 'start'),
    apply: (ctx) => {
      ctx.warnings.push('Ein Pultdach wird für das Hauptdach nicht angeboten – die Dachform wählt der Stil (Saltbox kommt einem Pultdach am nächsten).');
      return '';
    },
  },
  // Profiles.
  roofProfile(`(?:ausgestellte|aufgebogene|hochgezogene|geschwungene|aufgeschwungene)[nmrs]?\\s+(?:traufe|dachkante|dachränder|dachrand)${TAIL}|traufe\\s+nach\\s+oben`, 'flared'),
  roofProfile(`zwiebel${TAIL}|s-förmig${TAIL}|s-schwung${TAIL}|karnies${TAIL}|ogee`, 'ogee'),
  roofProfile(`glockendach${TAIL}|glockenförmig${TAIL}|geschwungen${TAIL}(?:\\s+${DACH})?|geschweift${TAIL}(?:\\s+${DACH})?`, 'bell'),
  roofProfile(`gewölbt${TAIL}(?:\\s+${DACH})?|tonnendach${TAIL}|bauchig${TAIL}(?:\\s+${DACH})?`, 'convex'),
  roofProfile(`steil${TAIL}(?:\\s+${DACH})?|steildach${TAIL}|spitze[nmrs]?\\s+${DACH}|spitzdach${TAIL}|hohe[nmrs]?\\s+${DACH}`, 'steep'),
  roofProfile(`flach\\s+geneigt${TAIL}(?:\\s+${DACH})?|flache[nmrs]?\\s+${DACH}|niedrige[nmrs]?\\s+${DACH}|(?:leicht|sanft)\\s+geneigt${TAIL}(?:\\s+${DACH})?`, 'shallow'),
];

// ---------------------------------------------------------------------------------------------
// A5 – materials (small safe map onto catalogue material ids)

const ROOF_COLOURS: readonly [string, string | null][] = [
  ['rot', 'bricks'],
  ['schwarz|anthrazit|dunkel|dunkl', 'deepslate_tiles'],
  ['grau', 'andesite'],
  ['grün', 'waxed_oxidized_cut_copper'],
  ['blau|türkis', 'warped_planks'],
  ['rosa|pink', 'cherry_planks'],
  ['braun', 'spruce_planks'],
  ['weiß|gelb|orange|lila|violett|golden|gold', null],
];

const WOOD_WALLS: readonly [stem: string, id: string, vote?: StyleId][] = [
  ['eiche', 'oak_planks'],
  ['fichte', 'spruce_planks'],
  ['tanne', 'spruce_planks'],
  ['birke', 'birch_planks'],
  ['kirsch', 'cherry_planks', 'cherry'],
  ['akazie', 'acacia_planks'],
  ['mangrove', 'mangrove_planks'],
  ['tropen', 'jungle_planks'],
  ['dschungel', 'jungle_planks'],
  ['bambus', 'bamboo_planks', 'japanese'],
  ['karmesin', 'crimson_planks', 'fantasy'],
  ['wirr', 'warped_planks', 'fantasy'],
];

const STONE_WALLS: readonly [src: string, id: string][] = [
  ['steinziegel', 'stone_bricks'],
  ['bruchstein|feldstein|naturstein|kopfstein|findling', 'cobblestone'],
  ['backstein|ziegelstein|klinker|ziegelwand|ziegelwände|ziegelmauer|aus\\s+ziegeln', 'bricks'],
  ['roter\\s+sandstein|rotem\\s+sandstein|rotsandstein', 'red_sandstone'],
  ['sandstein', 'sandstone'],
  ['lehmziegel|lehm|adobe', 'mud_bricks'],
  ['quarz|marmor', 'quartz_block'],
  ['tiefenschiefer', 'deepslate_bricks'],
  ['schwarzstein|basalt', 'polished_blackstone_bricks'],
  ['tuffstein|tuff', 'tuff_bricks'],
  ['granit', 'granite'],
  ['diorit', 'diorite'],
  ['andesit', 'andesite'],
  [`kalkstein|verputzt${TAIL}|putz(?![${LN}])|weiß\\s+getüncht|weiße[nmrs]?\\s+(?:wände|wand|fassade)`, 'calcite'],
];

const PLINTH_WORDS: readonly [src: string, id: string][] = [
  ['bruchstein|feldstein|naturstein|stein', 'cobblestone'],
  ['steinziegel', 'stone_bricks'],
  ['backstein|ziegel', 'bricks'],
  ['sandstein', 'sandstone'],
  ['tiefenschiefer', 'cobbled_deepslate'],
  ['schwarzstein', 'blackstone'],
  ['granit', 'granite'],
  ['andesit', 'andesite'],
];

function plinthFrom(word: string): string | null {
  for (const [src, id] of PLINTH_WORDS) if (new RegExp(`^(?:${de(src)})`, 'iu').test(word)) return id;
  return null;
}

const MATERIAL_RULES: Rule[] = [
  // Roof: colour + roof noun, then roof coverings.
  {
    re: rx(String.raw`(${ROOF_COLOURS.map(([c]) => c).join('|')})${TAIL}\s+(?:dach|dächer|dachziegel|ziegeldach|dachschindeln|schindeln|dachdeckung)${TAIL}`, 'start'),
    apply: (ctx, m) => {
      const colour = fold(m.groups[0] ?? '');
      const entry = ROOF_COLOURS.find(([c]) => c.split('|').some((x) => fold(x) === colour || colour.startsWith(fold(x))));
      const id = entry?.[1] ?? null;
      if (!id) {
        ctx.warnings.push(`Dachfarbe „${ctx.phrase(m.start, m.end)}“ gibt es nicht – das Dachmaterial kommt aus der Stilpalette.`);
        return '';
      }
      if (id === 'cherry_planks') ctx.vote('cherry', 1, m, `Stil-Hinweis: ${STYLE_LABELS.cherry}`);
      return `Dachmaterial: ${ctx.material('roof', id)}`;
    },
  },
  {
    re: rx(`(?<!tiefen)schiefer${TAIL}`, 'any'),
    apply: (ctx) => `Dachmaterial: ${ctx.material('roof', 'deepslate_tiles')}`,
  },
  {
    re: rx(`ziegeldach${TAIL}|dachziegel${TAIL}|tondach${TAIL}|terrakotta-?dach${TAIL}`, 'any'),
    apply: (ctx) => `Dachmaterial: ${ctx.material('roof', 'bricks')}`,
  },
  {
    re: rx(`patina|grünspan|grüne[snrm]?\\s+kupferdach${TAIL}`, 'start'),
    apply: (ctx) => `Dachmaterial: ${ctx.material('roof', 'waxed_oxidized_cut_copper')}`,
  },
  {
    re: rx(`kupferdach${TAIL}|kupfer${TAIL}`, 'start'),
    apply: (ctx) => `Dachmaterial: ${ctx.material('roof', 'waxed_cut_copper')}`,
  },
  {
    re: rx(`holzschindel${TAIL}|schindeldach${TAIL}|schindeln|holzdach${TAIL}`, 'start'),
    apply: (ctx) => `Dachmaterial: ${ctx.material('roof', 'dark_oak_planks')}`,
  },
  // Frame / beams.
  {
    re: rx(String.raw`(?:dunkle|schwarze)[nmrs]?\s+(?:holz)?(?:balken|fachwerk|rahmen|ständer|stämme)${TAIL}`, 'start'),
    apply: (ctx, m) => {
      if (/fachwerk/i.test(m.text)) ctx.vote('medieval', 2, m);
      return `Rahmen/Balken: ${ctx.material('frame', 'dark_oak_log')}`;
    },
  },
  {
    re: rx(String.raw`helle[nmrs]?\s+(?:holz)?(?:balken|rahmen|ständer)${TAIL}`, 'start'),
    apply: (ctx) => `Rahmen/Balken: ${ctx.material('frame', 'stripped_oak_log')}`,
  },
  {
    re: rx(String.raw`(eichen|fichten|birken|kirsch)(?:holz)?(?:balken|stämme|stämmen|rahmen)`, 'start'),
    apply: (ctx, m) => {
      const id = { eichen: 'oak_log', fichten: 'spruce_log', birken: 'birch_log', kirsch: 'cherry_log' }[fold(m.groups[0] ?? '')];
      return id ? `Rahmen/Balken: ${ctx.material('frame', id)}` : null;
    },
  },
  // Plinth.
  {
    re: rx(String.raw`(?:sockel|fundament)\s+aus\s+(\p{L}+)|(\p{L}*)(?:sockel|fundament)(?![${LN}])`, 'start'),
    apply: (ctx, m) => {
      const id = plinthFrom(m.groups[0] || m.groups[1] || '');
      return id ? `Sockel: ${ctx.material('plinth', id)}` : null;
    },
  },
  // Accents.
  {
    re: rx(String.raw`(rot|gold|golden|weiß|rosa|pink|hellblau)${TAIL}\s+(?:akzent|schleife|deko|verzierung|bänder|band)${TAIL}`, 'start'),
    apply: (ctx, m) => {
      const c = fold(m.groups[0] ?? '');
      const id = c.startsWith('rot') ? 'red_wool' : c.startsWith('gold') ? 'gold_block' : c.startsWith('weiss') ? 'white_wool' : c.startsWith('hellblau') ? 'light_blue_stained_glass' : 'pink_stained_glass';
      return `Akzente: ${ctx.material('accent', id)}`;
    },
  },
  // Walls: logs, dark oak, then wood species (stem only, so "Fichtenholzhaus" stays a house).
  {
    re: rx(`baumstämm${TAIL}|baumstamm${TAIL}|rundholz${TAIL}|aus\\s+stämmen|blockbohlen${TAIL}`, 'start'),
    apply: (ctx, m) => {
      ctx.paletteHints.push({ palette: 'rustic_logs', style: 'rustic', rec: ctx.vote('rustic', 1, m, `Stil-Hinweis: ${STYLE_LABELS.rustic}`) });
      return `Wände: ${ctx.material('wall', 'spruce_log')}`;
    },
  },
  {
    re: rx(`schwarzeiche|dunkeleiche|dunkle[nmrs]?\\s+holz|dunkelholz|dunklem\\s+holz`, 'start'),
    apply: (ctx) => `Wände: ${ctx.material('wall', 'dark_oak_planks')}`,
  },
  {
    re: rx(
      String.raw`aus\s+(${WOOD_WALLS.map(([s]) => s).join('|')})${TAIL}|(${WOOD_WALLS.map(([s]) => s).join('|')})n?(?:holz|bretter|brettern|planken)|(${WOOD_WALLS.map(([s]) => s).join('|')})n?(?=haus|häus|hütte|wand|wände|fassade|verkleidung)`,
      'start',
    ),
    apply: (ctx, m) => {
      const stem = fold(m.groups[0] ?? m.groups[1] ?? m.groups[2] ?? '');
      const entry = WOOD_WALLS.find(([s]) => stem.startsWith(fold(s)));
      if (!entry) return null;
      if (entry[2]) ctx.vote(entry[2], 1, m, `Stil-Hinweis: ${STYLE_LABELS[entry[2]]}`);
      return `Wände: ${ctx.material('wall', entry[1])}`;
    },
  },
  ...STONE_WALLS.map(
    ([src, id]): Rule => ({
      re: rx(src, 'start'),
      apply: (ctx) => `Wände: ${ctx.material('wall', id)}`,
    }),
  ),
  {
    re: rx(`sichtbeton|beton`, 'start'),
    apply: (ctx, m) => {
      ctx.vote('modern', 1, m, `Stil-Hinweis: ${STYLE_LABELS.modern}`);
      return `Wände: ${ctx.material('wall', 'white_concrete')}`;
    },
  },
  // Generic stone ("Steinhaus", "aus Stein", "steinern"): stone walls, medieval as a hint.
  {
    re: rx(`stein(?:ern${TAIL}|ig${TAIL}|e|en|es)?(?!kamin|schornstein|sockel|fundament|weg|pfad|brunnen|treppe|boden|platte|pflaster)`, 'start'),
    apply: (ctx, m) => {
      const rec = ctx.vote('medieval', 1, m, `Stil-Hinweis: ${STYLE_LABELS.medieval}`);
      ctx.paletteHints.push({ palette: 'medieval_stone', style: 'medieval', rec });
      return `Wände: ${ctx.material('wall', 'stone_bricks')}`;
    },
  },
  {
    re: rx(`aus\\s+holz|hölzern${TAIL}|holz`, 'word'),
    apply: () => 'Holz (die Holzart wählt der Stil)',
  },
];

// ---------------------------------------------------------------------------------------------
// A6 – building parts and festive details

function sideNear(text: string, start: number, end: number): 'left' | 'right' | null {
  const from = Math.max(0, start - 28);
  const around = text.slice(from, Math.min(text.length, end + 28));
  const re = /(?<![\p{L}])(?:(links|linke[nmrs]?|westlich\p{L}*)|(rechts|rechte[nmrs]?|östlich\p{L}*|oestlich\p{L}*))(?![\p{L}])/giu;
  let best: { side: 'left' | 'right'; d: number } | null = null;
  for (let s = re.exec(around); s; s = re.exec(around)) {
    const pos = from + s.index;
    const d = pos >= end ? pos - end : start - (pos + s[0].length);
    if (d < 0) continue;
    const side = s[1] ? 'left' : 'right';
    if (!best || d < best.d) best = { side, d };
  }
  return best?.side ?? null;
}

function frontBackNear(text: string, start: number, end: number): 'front' | 'back' | null {
  const from = Math.max(0, start - 28);
  const around = text.slice(from, Math.min(text.length, end + 28));
  const re = /(?<![\p{L}])(?:(vorne|vorn|vordere[nmrs]?|vorderseite|front\p{L}*)|(hinten|hintere[nmrs]?|rückseite|rueckseite|hinterseite))(?![\p{L}])/giu;
  let best: { fb: 'front' | 'back'; d: number } | null = null;
  for (let s = re.exec(around); s; s = re.exec(around)) {
    const pos = from + s.index;
    const d = pos >= end ? pos - end : start - (pos + s[0].length);
    if (d < 0) continue;
    const fb = s[1] ? 'front' : 'back';
    if (!best || d < best.d) best = { fb, d };
  }
  return best?.fb ?? null;
}

const QUANT_MANY = String.raw`viele|vielen|vieler|zahlreiche|zahlreichen|jede\s+menge|massenhaft|unmengen\s+an|lauter|reichlich|ganz\s+viele|sehr\s+viele|sehr\s+vielen|überall`;
const QUANT_FEW = String.raw`einige|einigen|ein\s+paar|wenige|wenigen|vereinzelte|vereinzelten|einzelne|einzelnen|eine|einer|einen|ein`;
const QUANT_NORMAL = String.raw`mehrere|mehreren|hängende|hängenden|hübsche|hübschen|schöne|schönen`;

function density(q: string | undefined): 'many' | 'few' | 'normal' {
  if (!q) return 'normal';
  if (new RegExp(`^(?:${de(QUANT_MANY)})$`, 'iu').test(q)) return 'many';
  if (new RegExp(`^(?:${de(QUANT_FEW)})$`, 'iu').test(q)) return 'few';
  return 'normal';
}

const FEATURE_RULES: Rule[] = [
  // Massing: wings, annex, symmetry.
  {
    re: rx(String.raw`l\s*-?\s*(?:form|förmig)${TAIL}|winkelhaus${TAIL}|winkelform${TAIL}|über\s+eck`, 'start'),
    apply: (ctx) => {
      ctx.set('wings', 'L');
      return `Grundriss: ${label('wings', 'L')}`;
    },
  },
  {
    re: rx(String.raw`t\s*-?\s*(?:form|förmig)${TAIL}`, 'start'),
    apply: (ctx) => {
      ctx.set('wings', 'T');
      return `Grundriss: ${label('wings', 'T')}`;
    },
  },
  {
    re: rx(String.raw`u\s*-?\s*(?:form|förmig)${TAIL}|innenhof${TAIL}|dreiflügel${TAIL}|hufeisen${TAIL}`, 'start'),
    apply: (ctx) => {
      ctx.set('wings', 'U');
      return `Grundriss: ${label('wings', 'U')}`;
    },
  },
  {
    re: rx(String.raw`(?:(zwei|beide[nmrs]?|beidseitige[nmrs]?)\s+)?(?:seiten)?flügel${TAIL}`, 'start'),
    apply: (ctx, m) => {
      if (ctx.negated(m)) {
        ctx.set('wings', 'none');
        return 'keine Flügel';
      }
      const w = m.groups[0] ? 'U' : 'L';
      ctx.set('wings', w);
      return `Grundriss: ${label('wings', w)}`;
    },
  },
  {
    re: rx(String.raw`viele[nmrs]?\s+anbauten|verwinkelt${TAIL}|verschachtelt${TAIL}|organisch\s+gewachsen${TAIL}|mit\s+vielen\s+ecken`, 'start'),
    apply: (ctx) => {
      ctx.set('symmetry', 'rambling');
      return `Symmetrie: ${label('symmetry', 'rambling')}`;
    },
  },
  {
    re: rx(`anbau${TAIL}|anbauten|nebengebäude${TAIL}|nebenhaus|seitenbau${TAIL}`, 'start'),
    apply: (ctx, m) => {
      if (ctx.negated(m)) {
        ctx.set('annex', 'none');
        return 'kein Anbau';
      }
      const side = sideNear(ctx.text, m.start, m.end) ?? 'right';
      ctx.set('annex', side);
      return `Anbau: ${label('annex', side)}`;
    },
  },
  {
    re: rx(`asymmetrisch${TAIL}|unsymmetrisch${TAIL}|unregelmäßig${TAIL}|ungleichmäßig${TAIL}`, 'start'),
    apply: (ctx, m) => {
      const v = ctx.negated(m) ? 'symmetric' : 'asymmetric';
      ctx.set('symmetry', v);
      return `Symmetrie: ${label('symmetry', v)}`;
    },
  },
  {
    re: rx(`symmetrisch${TAIL}|spiegelsymmetrisch${TAIL}|achsensymmetrisch${TAIL}|regelmäßig${TAIL}|streng\\s+geometrisch${TAIL}`, 'start'),
    apply: (ctx, m) => {
      const v = ctx.negated(m) ? 'asymmetric' : 'symmetric';
      ctx.set('symmetry', v);
      return `Symmetrie: ${label('symmetry', v)}`;
    },
  },
  // Facade parts.
  { re: rx(`erker${TAIL}`, 'start'), apply: toggle('oriel', 'Erker', 'kein Erker') },
  {
    re: rx(`veranda${TAIL}|vordach${TAIL}|vordächer${TAIL}|terrasse${TAIL}|vorbau${TAIL}|portikus|säulenvorbau${TAIL}|laube|engawa|überdachung${TAIL}`, 'start'),
    apply: toggle('porch', 'Veranda/Vordach', 'keine Veranda'),
  },
  { re: rx(`balkon${TAIL}|altan${TAIL}|loggia${TAIL}`, 'start'), apply: toggle('balcony', 'Balkon', 'kein Balkon') },
  { re: rx(`schornstein${TAIL}|kamin${TAIL}|rauchfang${TAIL}|schlot${TAIL}`, 'any'), apply: toggle('chimney', 'Schornstein', 'kein Schornstein') },
  {
    re: rx(`stiege${TAIL}|treppe${TAIL}|treppen${TAIL}`, 'start'),
    apply: () => 'Treppe: setzt der Generator bei mehreren Geschossen selbst',
  },
  // Garden.
  {
    re: rx(`kirsch(?:blüten)?b(?:a|ä)um${TAIL}`, 'start'),
    apply: (ctx, m) => {
      ctx.vote('cherry', 1, m, `Stil-Hinweis: ${STYLE_LABELS.cherry}`);
      ctx.set('garden', !ctx.negated(m));
      return 'Garten (mit Bäumen)';
    },
  },
  {
    re: rx(`zugefroren${TAIL}\\s+teich${TAIL}|eisteich${TAIL}|eisfläche${TAIL}|schlittschuh${TAIL}`, 'start'),
    apply: (ctx, m) => {
      ctx.themeVotes.push({ theme: 'winter', negated: false, start: m.start });
      ctx.set('garden', true);
      return 'Garten mit zugefrorenem Teich (Winter)';
    },
  },
  {
    re: rx(`laternenpf(?:a|ä)hl${TAIL}|straßenlaterne${TAIL}`, 'start'),
    apply: (ctx, m) => {
      if (ctx.negated(m)) return '';
      ctx.set('garden', true);
      ctx.setWeak('lanternDensity', 'normal');
      return 'Garten mit Laternenpfählen';
    },
  },
  {
    re: rx(`garten${TAIL}|gärten${TAIL}|vorgarten${TAIL}|hecke${TAIL}|zaun|zäune${TAIL}|gartenzaun${TAIL}|grundstück${TAIL}|blumen${TAIL}|beet|beete|beeten|gartenweg${TAIL}|kiesweg${TAIL}|bäume|bäumen|büsche${TAIL}|sträucher${TAIL}|rasen`, 'start'),
    apply: toggle('garden', 'Garten mit Hecke, Weg und Laternenpfählen', 'kein Garten'),
  },
  // Lights and festive details.
  {
    re: rx(String.raw`(?:(${QUANT_MANY}|${QUANT_FEW}|${QUANT_NORMAL})\s+)?(?:seelen-?(?:laterne|lampe|feuer|licht)${TAIL}|blaue[nmrs]?\s+laterne${TAIL})`, 'start'),
    apply: (ctx, m) => {
      if (ctx.negated(m)) {
        ctx.set('soulLanterns', false);
        return 'keine Seelenlaternen';
      }
      ctx.set('soulLanterns', true);
      if (m.groups[0]) ctx.set('lanternDensity', density(m.groups[0]));
      return m.groups[0] ? `Seelenlaternen, Laternen: ${label('lanternDensity', density(m.groups[0]))}` : 'Seelenlaternen';
    },
  },
  {
    re: rx(`girlande${TAIL}|tannengirlande${TAIL}|tannenzweig${TAIL}|tannengrün${TAIL}|lichterkette${TAIL}|schleife${TAIL}`, 'start'),
    apply: toggle('garland', 'Girlanden', 'keine Girlanden'),
  },
  {
    re: rx(`adventskr(?:a|ä)nz${TAIL}|türkr(?:a|ä)nz${TAIL}|kranz|kränze${TAIL}|kerze${TAIL}`, 'start'),
    apply: (ctx, m) => {
      if (ctx.negated(m)) return '';
      ctx.themeVotes.push({ theme: 'christmas', negated: false, start: m.start });
      return 'Kränze und Kerzen gehören zur Weihnachtsdeko';
    },
  },
  {
    re: rx(String.raw`(?:(${QUANT_MANY}|${QUANT_FEW}|${QUANT_NORMAL})\s+)?(?:laterne${TAIL}|lampe${TAIL}|lampion${TAIL}|fackel${TAIL})`, 'start'),
    apply: (ctx, m) => {
      if (ctx.negated(m)) {
        ctx.set('lanternDensity', 'none');
        return 'keine Laternen';
      }
      const d = density(m.groups[0]);
      ctx.set('lanternDensity', d);
      return `Laternen: ${label('lanternDensity', d)}${/fackel/i.test(m.text) ? ' (Laternen statt Fackeln)' : ''}`;
    },
  },
  {
    re: rx(`unbeleuchtet${TAIL}|ohne\\s+(?:licht|beleuchtung|lichter)`, 'start'),
    apply: (ctx) => {
      ctx.set('lanternDensity', 'none');
      return 'keine Laternen';
    },
  },
  {
    re: rx(`hell\\s+erleuchtet${TAIL}|festbeleuchtung|viel\\s+licht|viele[nm]?\\s+lichtern?|beleucht${TAIL}|erleucht${TAIL}|leuchtend${TAIL}|licht|lichter|lichtern|lichtschein`, 'start'),
    apply: (ctx, m) => {
      if (ctx.negated(m)) {
        ctx.set('lanternDensity', 'none');
        return 'keine Laternen';
      }
      const many = /hell|fest|viel/i.test(m.text);
      if (many) ctx.set('lanternDensity', 'many');
      else ctx.setWeak('lanternDensity', 'normal');
      return `Beleuchtung: Laternen (${label('lanternDensity', String(ctx.options.lanternDensity))})`;
    },
  },
  { re: rx(`geschenk${TAIL}|päckchen|pakete?|präsente?`, 'start'), apply: toggle('presents', 'Geschenke', 'keine Geschenke') },
  // Snow only on an explicit wish (user decision); "winterlich" is a theme, not snow.
  {
    re: rx(
      String.raw`schnee\s+auf\s+(?:dem|den)\s+(?:dach|dächern)|(?:verschneit|schneebedeckt|zugeschneit|eingeschneit)${TAIL}\s+${DACH}|${DACH}\s+(?:voller|mit|unter)\s+schnee|schneedach${TAIL}|schneehaube${TAIL}|schneeschicht${TAIL}|schneedecke${TAIL}|mit\s+schnee|schnee\s+drauf|schneebedeckt${TAIL}|eingeschneit${TAIL}|zugeschneit${TAIL}`,
      'start',
    ),
    apply: (ctx, m) => {
      if (ctx.negated(m)) {
        ctx.set('snow', false);
        return 'kein Schnee';
      }
      ctx.set('snow', true);
      ctx.themeVotes.push({ theme: 'winter', negated: false, start: m.start });
      return 'Schnee auf dem Dach';
    },
  },
  {
    re: rx(`schneefrei|schnee${TAIL}`, 'start'),
    apply: (ctx, m) => {
      if (/frei/i.test(m.text) || ctx.negated(m)) {
        ctx.set('snow', false);
        return 'kein Schnee';
      }
      return null; // plain "Schnee" = winter theme (below), not snow on the roof
    },
  },
];

// ---------------------------------------------------------------------------------------------
// K – building nouns (separate claim layer)

const KIND_PATTERNS: readonly { kind: BuildingType; re: RegExp }[] = [
  { kind: 'station', re: new RegExp(`${rx('bahnhof|bahnsteig|eisenbahn|bahnstation|gleis').source}|${rx('zug|züge|zügen|station|stationen', 'word').source}`, 'giu') },
  {
    kind: 'market_stall',
    re: new RegExp(
      `${rx('markt|bude|kiosk|(?:glühwein|verkaufs|imbiss|weihnachts|punsch|waffel|maronen|souvenir|essens|süßigkeiten|kunsthandwerks?|holz)stand').source}|${rx('stand|stände|ständen', 'word').source}`,
      'giu',
    ),
  },
  {
    kind: 'tree',
    re: new RegExp(`${rx('weihnachtsb(?:a|ä)um|christb(?:a|ä)um|tannenb(?:a|ä)um').source}|${rx('tanne|tannen|baum|bäumchen|fichte', 'word').source}`, 'giu'),
  },
  { kind: 'tower', re: rx('turm|türm|bergfried') },
  {
    kind: 'house',
    re: new RegExp(
      `${rx('haus|häus|hütte|hüttchen|villa|cottage|chalet|bungalow|gebäude|anwesen|taverne|gasthof|schmiede|scheune|tempel|pagode|schrein|dojo|kapelle|lodge|halle').source}|${rx('heim|hof|laden|kate', 'word').source}`,
      'giu',
    ),
  },
];
const KIND_PRIORITY: readonly BuildingType[] = KIND_PATTERNS.map((k) => k.kind);
const STORM = /(?:^|schnee|winter|eis|sand|hagel|regen|gewitter|herbst|wirbel|orkan)sturm/;

const LOCATION = new Set(['neben', 'vor', 'hinter', 'bei', 'beim', 'an', 'am', 'daneben', 'davor', 'dahinter']);

function towerDetails(ctx: Ctx, b: Building): { shape: 'round' | 'square' | null; position: string | null; words: Word[] } {
  const word = fold(b.word.text);
  let shape: 'round' | 'square' | null = /rund|tuermchen/.test(word) ? 'round' : /vierkant|quadrat|viereck/.test(word) ? 'square' : null;
  const used: Word[] = [];
  const before = clauseBefore(ctx.text, b.word.start);
  const after = clauseAfter(ctx.text, b.word.end);
  const near = [...wordsIn(before.text, before.offset).slice(-2), ...wordsIn(after.text, after.offset).slice(0, 2)];
  for (const w of near) {
    if (overlaps(ctx.claimed, w.start, w.end)) continue;
    const f = fold(w.text);
    if (/^(?:rund|zylindrisch)/.test(f)) {
      shape = 'round';
      used.push(w);
    } else if (/^(?:eckig|viereckig|quadratisch|kantig)/.test(f)) {
      shape = 'square';
      used.push(w);
    }
  }
  const side = sideNear(ctx.text, b.word.start, b.word.end);
  const fb = frontBackNear(ctx.text, b.word.start, b.word.end);
  const position = side || fb ? `${fb ?? 'front'}_${side ?? 'right'}` : null;
  return { shape, position, words: used };
}

function scanBuildings(ctx: Ctx): void {
  const found = new Map<number, { kind: BuildingType; word: Word; nounStart: number; nounEnd: number }>();
  for (const { kind, re } of KIND_PATTERNS) {
    re.lastIndex = 0;
    for (let m = re.exec(ctx.text); m; m = re.exec(ctx.text)) {
      const start = m.index;
      const end = start + m[0].length;
      re.lastIndex = end > start ? end : start + 1;
      if (overlaps(ctx.claimed, start, end)) continue;
      const word = wordAround(ctx.text, start, end);
      if (kind === 'tower' && STORM.test(fold(word.text))) continue;
      const prev = found.get(word.start);
      if (prev && KIND_PRIORITY.indexOf(prev.kind) <= KIND_PRIORITY.indexOf(kind)) continue;
      found.set(word.start, { kind, word, nounStart: start, nounEnd: end });
    }
  }
  const nouns = [...found.values()].sort((a, b) => a.word.start - b.word.start);

  for (const n of nouns) {
    claim(ctx.kindClaimed, n.nounStart, n.nounEnd);
    const b: Building = { kind: n.kind, word: n.word, nounStart: n.nounStart, role: 'same', rec: null };
    ctx.buildings.push(b);
    const phraseRange = { start: n.word.start, end: n.word.end };
    if (isNegated(ctx.text, n.word.start)) {
      b.role = 'negated';
      if (n.kind === 'tree') {
        ctx.set('christmasTree', false);
        b.rec = ctx.rec(phraseRange, 'kein Weihnachtsbaum');
      } else if (n.kind === 'tower') {
        ctx.set('tower', 'none');
        b.rec = ctx.rec(phraseRange, 'kein Turm');
      }
      continue;
    }
    const connector = connectorBefore(ctx.text, n.word.start);
    if (!ctx.main && connector === null) {
      b.role = 'main';
      ctx.main = b;
      ctx.patch.kind = n.kind;
      b.rec = ctx.rec(phraseRange, `Bauwerk: ${KIND_LABELS[n.kind]}`);
      if (/(?:chen|lein)$|^haeusle$/.test(fold(n.word.text)) && n.kind !== 'tower') ctx.diminutive = b.rec;
      if (n.kind === 'tower') {
        const t = towerDetails(ctx, b);
        for (const w of t.words) claim(ctx.claimed, w.start, w.end);
        // A free-standing tower is always round; the tower option belongs to houses.
        if (t.shape === 'round') b.rec.effect += ` (${label('tower', t.shape)})`;
        else if (t.shape === 'square') ctx.unsupported(ctx.phrase(n.word.start, n.word.end), R.squareTower, n.word.start);
      }
      continue;
    }
    const mainKind: BuildingType = ctx.main?.kind ?? 'house';
    if (n.kind === mainKind) continue; // "Haus … Häuschen", "Markt mit Buden"
    b.role = 'attached';
    if (n.kind === 'house' && ctx.main?.kind === 'tree') {
      // "Weihnachtsbaum neben dem Haus": the house is the building, the tree stands beside it.
      const tree = ctx.main;
      ctx.patch.kind = 'house';
      ctx.set('christmasTree', true);
      if (tree.rec) tree.rec.effect = 'Weihnachtsbaum am Haus';
      tree.role = 'attached';
      b.role = 'main';
      ctx.main = b;
      b.rec = ctx.rec(phraseRange, `Bauwerk: ${KIND_LABELS.house}`);
      continue;
    }
    if (n.kind === 'house' && mainKind === 'market_stall') continue; // market huts are stalls
    if (n.kind === 'tree') {
      ctx.set('christmasTree', true);
      b.rec = ctx.rec(phraseRange, connector && LOCATION.has(connector) ? 'Weihnachtsbaum am Haus' : 'Weihnachtsbaum am Haus (im Garten)');
      continue;
    }
    if (n.kind === 'tower') {
      if (mainKind !== 'house') {
        ctx.unsupported(ctx.phrase(n.word.start, n.word.end), R.towerOnly, n.word.start);
        continue;
      }
      const t = towerDetails(ctx, b);
      for (const w of t.words) claim(ctx.claimed, w.start, w.end);
      ctx.set('tower', t.shape ?? 'auto-shape');
      if (t.position) ctx.set('towerPosition', t.position);
      b.rec = ctx.rec(phraseRange, `Turm${t.position ? `: ${label('towerPosition', t.position)}` : ''}`);
      continue;
    }
    ctx.unsupported(ctx.phrase(n.word.start, n.word.end), R.second, n.word.start);
  }
}

// ---------------------------------------------------------------------------------------------
// A7 – styles (weighted votes), A8 – theme, A9 – size, A10 – detail level

interface StyleRuleDef {
  src: string;
  style: StyleId;
  weight: number;
  mode?: Mode;
  palette?: string;
  extra?: (ctx: Ctx, m: Match) => void;
}

const S = (src: string, style: StyleId, weight: number, more: Partial<StyleRuleDef> = {}): StyleRuleDef => ({ src, style, weight, ...more });

const EXPLICIT_STYLES: readonly StyleRuleDef[] = [
  // Explicit style words (3).
  S(`mittelalter${TAIL}`, 'medieval', 3),
  S(`fantasy|fantasie${TAIL}|märchenhaft${TAIL}|verwunschen${TAIL}`, 'fantasy', 3),
  S(`rustikal${TAIL}|ländlich${TAIL}`, 'rustic', 3),
  S(`nordisch${TAIL}|skandinavisch${TAIL}|norwegisch${TAIL}|schwedisch${TAIL}|isländisch${TAIL}`, 'nordic', 3),
  S(`japanisch${TAIL}|asiatisch${TAIL}`, 'japanese', 3),
  S(`japan`, 'japanese', 3, { mode: 'word' }),
  S(`kirschblüte${TAIL}|kirschblüten|sakura`, 'cherry', 3),
  S(`modern${TAIL}|zeitgenössisch${TAIL}|bauhaus${TAIL}`, 'modern', 3),
  S(`minimalistisch${TAIL}`, 'modern', 3, {
    extra: (ctx) => {
      ctx.patch.detailLevel ??= 1;
    },
  }),
  S(`mittelmeer${TAIL}|mediterran${TAIL}|toskan${TAIL}|griechisch${TAIL}|italienisch${TAIL}|spanisch${TAIL}|südländisch${TAIL}|provenzalisch${TAIL}|santorini`, 'mediterranean', 3),
  // Building types and strong synonyms (2).
  S(`fachwerk`, 'medieval', 2),
  S(`tudor`, 'medieval', 2, { palette: 'medieval_tudor' }),
  S(`ritter|taverne|gasthaus|gasthof|schmiede|zunft|gotisch${TAIL}`, 'medieval', 2),
  S(`hexe|hexen|zauber|magier|hobbit|storybook|knusper|pilzhaus|pilzhäus`, 'fantasy', 2),
  S(`märchen`, 'fantasy', 2),
  S(`lebkuchen`, 'fantasy', 2, { extra: (ctx, m) => ctx.themeVotes.push({ theme: 'christmas', negated: false, start: m.start }) }),
  S(`feen|elfen`, 'fantasy', 2, { mode: 'start' }),
  S(`fee`, 'fantasy', 2, { mode: 'word' }),
  S(`blockhaus|blockhäus|blockhütte`, 'rustic', 2, { palette: 'rustic_logs' }),
  S(`chalet`, 'rustic', 2, { extra: (ctx) => void ctx.setWeak('roofProfile', 'flared') }),
  S(`cottage`, 'rustic', 2, { extra: (ctx) => void ctx.setWeak('symmetry', 'asymmetric') }),
  S(`hütte|hüttchen|landhaus|landhäus|bauernhaus|bauernhäus|bauernhof|scheune|jagdhütte|berghütte`, 'rustic', 2),
  S(`alm`, 'rustic', 2, { mode: 'start' }),
  S(`wikinger|viking|fjord|skandinavien`, 'nordic', 2),
  S(`langhaus|langhäus`, 'nordic', 2, { palette: 'nordic_longhouse' }),
  S(`tempel`, 'japanese', 2, { palette: 'japanese_temple' }),
  S(`schrein|dojo|teehaus|teehäus|samurai|ryokan`, 'japanese', 2),
  S(`villa|villen|kubus|würfelhaus|loft|penthouse`, 'modern', 2),
  S(`bungalow`, 'modern', 2, { extra: (ctx) => void ctx.setWeak('floors', 1) }),
  S(`finca|hacienda`, 'mediterranean', 2),
  // Weak hints (1).
  S(`burg|wachturm|bergfried|wehrturm`, 'medieval', 1, { mode: 'start' }),
  S(`dorf`, 'medieval', 1, { mode: 'start' }),
  S(`verspielt${TAIL}|krumm${TAIL}|schief(?!er)${TAIL}`, 'fantasy', 1, { mode: 'start' }),
  S(`gemütlich${TAIL}|heimelig${TAIL}|holzhaus|holzhäus`, 'rustic', 1),
  S(`halle|met|norden`, 'nordic', 1, { mode: 'word' }),
  S(`zen`, 'japanese', 1, { mode: 'word' }),
  S(`rosa|pink`, 'cherry', 1, { mode: 'word' }),
  S(`blüten|frühling`, 'cherry', 1),
  S(`glas`, 'modern', 1, { mode: 'start' }),
  S(`süden|meer|strand`, 'mediterranean', 1, { mode: 'start' }),
];

/** Style keywords from the catalogue (STYLES[*].llm.keywords) not covered by the explicit list. */
const WEAK_KEYWORDS = new Set(['gemütlich', 'gemuetlich', 'holzhaus', 'dorf', 'villa', 'halle', 'glas', 'rosa', 'pink', 'meer', 'süden', 'sueden', 'norden', 'frühling', 'fruehling', 'blüten', 'blueten', 'burg', 'beton', 'met', 'zen']);

function catalogueStyleRules(): StyleRuleDef[] {
  const owners = new Map<string, Set<StyleId>>();
  for (const s of STYLE_IDS) for (const k of STYLES[s].llm.keywords) owners.set(k, (owners.get(k) ?? new Set()).add(s));
  const covered = (k: string) =>
    EXPLICIT_STYLES.some((r) => {
      const re = rx(r.src, 'any');
      re.lastIndex = 0;
      return re.test(k);
    });
  const out: StyleRuleDef[] = [];
  for (const s of STYLE_IDS) {
    for (const k of STYLES[s].llm.keywords) {
      if ((owners.get(k)?.size ?? 0) > 1 || covered(k)) continue;
      const mode: Mode = k.length <= 3 ? 'word' : k.length <= 5 ? 'start' : 'any';
      out.push(S(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), s, WEAK_KEYWORDS.has(k) ? 1 : 2, { mode }));
    }
  }
  return out;
}

function styleRules(): Rule[] {
  return [...EXPLICIT_STYLES, ...catalogueStyleRules()].map(
    (def): Rule => ({
      re: rx(def.src, def.mode ?? 'any'),
      apply: (ctx, m) => {
        if (ctx.negated(m)) return `kein Stil ${STYLE_LABELS[def.style]}`;
        // "im Märchenstil", "Landhausstil": the word names the style explicitly.
        const w = wordAround(ctx.text, m.start, m.end);
        const weight = def.weight + (/stils?$/.test(w.text) ? 1 : 0);
        const rec = ctx.vote(def.style, weight, m, weight >= 2 ? `Stil: ${STYLE_LABELS[def.style]}` : `Stil-Hinweis: ${STYLE_LABELS[def.style]}`);
        if (def.palette) ctx.paletteHints.push({ palette: def.palette, style: def.style, rec });
        def.extra?.(ctx, m);
        return '';
      },
    }),
  );
}

const theme = (src: string, t: ThemeVote['theme'], mode: Mode = 'any'): Rule => ({
  re: rx(src, mode),
  apply: (ctx, m) => {
    const negated = ctx.negated(m);
    ctx.themeVotes.push({ theme: t, negated, start: m.start });
    if (t === 'none') return 'Thema: keins';
    return negated ? `kein Thema ${THEME_LABELS[t]}` : `Thema: ${THEME_LABELS[t]}`;
  },
});

const THEME_RULES: Rule[] = [
  theme(`weihnacht(?:lich${TAIL}|en|s)?|advent${TAIL}|nikolaus|christkind${TAIL}|christbaum|christmas|x-?mas|heiligabend|glühwein|plätzchen`, 'christmas'),
  theme(`winter${TAIL}|verschneit${TAIL}|schnee${TAIL}|eisig${TAIL}|eisblau${TAIL}|frost${TAIL}|raureif|eiskristall${TAIL}|polar${TAIL}|ski(?=hütte|gebiet|piste|urlaub|lift)`, 'winter', 'start'),
  theme(`eis|ski|kalt|kalte[nmrs]?|kälte`, 'winter', 'word'),
  theme(`sommer${TAIL}|ganzjährig${TAIL}|neutral${TAIL}|ohne\\s+thema`, 'none', 'start'),
];

/** Words after a size adjective that make it describe a part, not the building. */
const PART_NOUN = /^(?:fenster|dach|daech|garten|gaert|tuer|veranda|balkon|kamin|schornstein|laterne|lampe|girlande|geschenk|hecke|fluegel|anbau|erker|gaube|ueberstand|dachueberstand|terrasse|grundstueck|eingang|fassade|wand|waende|sockel|zaun|weg|tor|portal|raum|zimmer|keller|pool|teich|garage|glocke|uhr|kuppel|spitze|platz|hof|innenhof|baeume|wald|stern|schleife|kranz|kerze|treppe|abstand)/;

function sizeTarget(ctx: Ctx, m: Match): boolean | null {
  const inWord = ctx.buildings.find((b) => b.word.start <= m.start && b.word.end >= m.end);
  const fits = (b: Building) => b.role === 'main' || (ctx.main !== null && b.kind === ctx.main.kind && b.role === 'same');
  if (inWord) return fits(inWord);
  const after = clauseAfter(ctx.text, m.end);
  const next = wordsIn(after.text, after.offset).slice(0, 3);
  for (const w of next) {
    const b = ctx.buildings.find((x) => x.word.start === w.start);
    if (b) return fits(b);
    const f = fold(w.text);
    if (PART_NOUN.test(f)) return false;
    if (['mit', 'ohne', 'und', 'aber'].includes(f)) break;
    const orig = ctx.original.slice(w.start, w.end);
    // A capitalised word that does not look like an inflected adjective is another noun.
    if (/^\p{Lu}/u.test(orig) && !/(?:e|es|er|en|em)$/.test(f)) return false;
  }
  return true; // predicative: "das Haus soll groß sein"
}

const size = (src: string, value: BuildSize): Rule => ({
  re: rx(src, 'start'),
  apply: (ctx, m) => {
    const target = sizeTarget(ctx, m);
    if (!target) return null;
    if (ctx.negated(m)) return `nicht ${SIZE_LABELS[value]} (Größe bleibt Standard)`;
    if (ctx.patch.size !== undefined && ctx.patch.size !== value) return `Größe ${SIZE_LABELS[value]} ignoriert (schon ${SIZE_LABELS[ctx.patch.size]})`;
    ctx.patch.size = value;
    return `Größe: ${SIZE_LABELS[value]}`;
  },
});

const SIZE_RULES: Rule[] = [
  size(
    `riesig${TAIL}|riesen${TAIL}|gigantisch${TAIL}|enorm${TAIL}|gewaltig${TAIL}|monumental${TAIL}|(?:sehr|extrem|super|richtig|ganz|wirklich)\\s+groß${TAIL}|riesengroß${TAIL}|xxl|größtmöglich${TAIL}`,
    'huge',
  ),
  size(`groß${TAIL}|geräumig${TAIL}|weitläufig${TAIL}|stattlich${TAIL}|imposant${TAIL}|mächtig${TAIL}|hohe[nmrs]?|hoher`, 'large'),
  size(`mittelgroß${TAIL}|mittlere[nmrs]?|mittel(?![${LN}])|normalgroß${TAIL}|normal\\s+groß${TAIL}|durchschnittlich${TAIL}`, 'medium'),
  size(`klein${TAIL}|winzig${TAIL}|mini${TAIL}|kompakt${TAIL}`, 'small'),
];

const detail = (src: string, level: DetailLevel): Rule => ({
  re: rx(src, 'start'),
  apply: (ctx) => {
    if (ctx.patch.detailLevel !== undefined && ctx.patch.detailLevel !== level) return '';
    ctx.patch.detailLevel = level;
    return `Detailgrad: ${level} (${label('detailLevel', level)})`;
  },
});

const DETAIL_RULES: Rule[] = [
  {
    re: rx(String.raw`detail(?:grad|stufe|level|niveau)\s*:?\s*([123])`, 'start'),
    apply: (ctx, m) => {
      const level = Number(m.groups[0]) as DetailLevel;
      ctx.patch.detailLevel = level;
      return `Detailgrad: ${level} (${label('detailLevel', level)})`;
    },
  },
  detail(`ohne\\s+(?:deko|dekoration|schmuck|verzierung)${TAIL}|wenig\\s+(?:deko|details?|schmuck)${TAIL}|kaum\\s+deko${TAIL}|niedrige[nmrs]?\\s+detailgrad|schlicht${TAIL}|einfach${TAIL}|puristisch${TAIL}|nüchtern${TAIL}|detailarm${TAIL}|schmucklos${TAIL}`, 1),
  detail(`etwas\\s+deko${TAIL}|ein\\s+bisschen\\s+deko${TAIL}|leicht\\s+geschmückt${TAIL}|mittlere[nmrs]?\\s+detailgrad|(?<!reich\\s)dekoriert${TAIL}`, 2),
  detail(
    `festlich${TAIL}|prächtig${TAIL}|prunkvoll${TAIL}|reich\\s+(?:verziert|geschmückt|dekoriert)${TAIL}|viel(?:e|en)?\\s+(?:deko${TAIL}|details?|schmuck|verzierung${TAIL})|üppig${TAIL}|opulent${TAIL}|geschmückt${TAIL}|detailreich${TAIL}|detailliert${TAIL}|aufwendig${TAIL}|aufwändig${TAIL}|verziert${TAIL}|verschnörkelt${TAIL}|kunstvoll${TAIL}|hohe[nmrs]?\\s+detailgrad|liebevoll${TAIL}`,
    3,
  ),
];

// ---------------------------------------------------------------------------------------------
// Unknown text

const STOPWORDS = new Set(
  `baue bau baut bauen erstelle erstellen mach mache machen generiere generieren zeichne bitte gerne gern ich mir mich
  wir uns möchte moechte will würde wuerde hätte haette soll sollte sollen sein ist sind hat haben ein eine einen einem
  einer eines der die das den dem des mit und oder aus in im am an auf für fuer von vom zu zum zur bei beim sehr ganz
  etwas schön schoen schöne schoene schönes schoenes schönen schoenen schönem hübsch huebsch hübsches huebsches hübsche
  nett nettes nette toll tolles tolle so wie auch noch dazu sowie außerdem ausserdem viel viele vielen mein meine meinen
  es er sie bisschen minecraft block blöcke bloecke blocks stil look art design optik akzente akzenten fenster fenstern
  dach dächer daecher dachs daches wände waende wänden waenden wand fassade bauwerk gebäude gebaeude ganzes richtig
  typisch typischen typische einfach also dann damit drin drinnen innen außen aussen darauf drauf oben unten vorne
  vorn hinten links rechts seite seiten passend passende passenden eingang eingängen haupteingang tür türe türen
  tuer tuere tueren haustür haustuer eingangstür eingangstuer holztür holztuer deko dekoration details detail schmuck
  form ecke ecken neben vor hinter daneben davor dahinter zwischen über ueber unter durch sowie plus samt inklusive
  echt echte echtes echten wirklich bisschen aber nur gerne natürlich natuerlich jetzt mal einfach eben`.split(/\s+/),
);

/** Splits the text into clauses and reports clauses whose content words no rule understood. */
function unknownClauseWarnings(text: string, consumed: (i: number) => boolean): string[] {
  const warnings: string[] = [];
  for (const clause of text.matchAll(/[^,.;!?\n]+/gu)) {
    const cStart = clause.index;
    const pieces = clause[0].split(/(?<![\p{L}])(?=(?:mit|und|sowie|samt|aber)(?![\p{L}]))/iu);
    let offset = cStart;
    for (const piece of pieces) {
      const pStart = offset;
      offset += piece.length;
      if (piece.trim().length === 0) continue;
      let anyConsumed = false;
      const leftover: string[] = [];
      for (const w of wordsIn(piece, pStart)) {
        let covered = false;
        for (let i = w.start; i < w.end; i++) if (consumed(i)) covered = true;
        if (covered) anyConsumed = true;
        else if (!STOPWORDS.has(w.text.toLowerCase()) && w.text.length >= 3 && !/^\d+$/.test(w.text)) leftover.push(w.text);
      }
      if (!anyConsumed && leftover.length > 0) warnings.push(`„${piece.trim()}“ wurde nicht erkannt und wird nicht umgesetzt.`);
    }
  }
  return warnings;
}

// ---------------------------------------------------------------------------------------------
// Main

/**
 * Compositions (archetypes) from their keywords: recorded, but the word stays unclaimed, so the
 * same keyword still sets the building type and votes for the style ("Pagode", "Langhaus").
 */
const COMPOSITION_RULES: readonly Rule[] = COMPOSITIONS.flatMap((id): Rule[] => {
  if (id === 'auto') return [];
  const words = COMPOSITION_INFO[id].keywords;
  if (words.length === 0) return [];
  return [
    {
      re: rx(words.map((w) => w.replace(/\s+/g, String.raw`\s+`) + TAIL).join('|'), 'start'),
      apply: (ctx, m) => {
        if (!ctx.negated(m) && ctx.setWeak('composition', id)) ctx.rec(m, `Bauform: ${COMPOSITION_LABELS[id]}`);
        return null;
      },
    },
  ];
});

const RULES_BEFORE_BUILDINGS: readonly Rule[] = [...COMPOSITION_RULES, ...UNSUPPORTED_RULES, JETTY_RULE, ...NUMBER_RULES, ...OPENING_RULES, ...ROOF_RULES, ...MATERIAL_RULES, ...FEATURE_RULES];
const RULES_AFTER_BUILDINGS: readonly Rule[] = [...styleRules(), ...THEME_RULES, ...SIZE_RULES, ...DETAIL_RULES];

function resolveStyle(ctx: Ctx): void {
  const score = new Map<StyleId, { sum: number; first: number }>();
  for (const v of ctx.styleVotes) {
    const s = score.get(v.style) ?? { sum: 0, first: v.start };
    s.sum += v.weight;
    s.first = Math.min(s.first, v.start);
    score.set(v.style, s);
  }
  let best: StyleId | null = null;
  for (const [style, s] of score) {
    const b = best ? score.get(best)! : null;
    if (!b || s.sum > b.sum || (s.sum === b.sum && s.first < b.first)) best = style;
  }
  if (!best) return;
  ctx.patch.style = best;
  for (const v of ctx.styleVotes) {
    if (v.style !== best) v.rec.effect = `Stil ${STYLE_LABELS[v.style]} überstimmt (${STYLE_LABELS[best]})`;
  }
  const hint = ctx.paletteHints.find((h) => h.style === best);
  if (hint && ctx.options.palette === undefined) {
    ctx.options.palette = hint.palette;
    hint.rec.effect += `, Palette „${PALETTES.find((p) => p.id === hint.palette)?.label ?? hint.palette}“`;
  }
}

function resolveTheme(ctx: Ctx): void {
  const has = (t: ThemeVote['theme'], negated: boolean) => ctx.themeVotes.some((v) => v.theme === t && v.negated === negated);
  if (has('christmas', false) && !has('christmas', true)) ctx.patch.theme = 'christmas';
  else if (has('winter', false) && !has('winter', true)) ctx.patch.theme = 'winter';
  else if (ctx.themeVotes.length > 0) ctx.patch.theme = 'none';
}

export function parseDescription(input: string): ParsedDescription {
  const original = input.slice(0, 2000);
  const ctx = new Ctx(lowerSameLength(original), original);

  runRules(ctx, RULES_BEFORE_BUILDINGS);
  scanBuildings(ctx);
  runRules(ctx, RULES_AFTER_BUILDINGS);

  resolveStyle(ctx);
  resolveTheme(ctx);

  // Tower shape without a word for it: round turrets for fantasy, square otherwise.
  if (ctx.options.tower === 'auto-shape') ctx.options.tower = ctx.patch.style === 'fantasy' ? 'round' : 'square';
  const tower = ctx.options.tower;
  if (typeof tower === 'string' && tower !== 'none') {
    const pos = typeof ctx.options.towerPosition === 'string' ? `, ${label('towerPosition', ctx.options.towerPosition)}` : '';
    for (const b of ctx.buildings) if (b.kind === 'tower' && b.role === 'attached' && b.rec) b.rec.effect = `Turm: ${label('tower', tower)}${pos}`;
  }
  if (ctx.diminutive && ctx.patch.size === undefined) {
    ctx.patch.size = 'small';
    ctx.diminutive.effect += `, Größe: ${SIZE_LABELS.small}`;
  }

  const options: Record<string, unknown> = { ...ctx.options };
  if (Object.keys(ctx.materials).length > 0) options.materials = { ...ctx.materials };
  if (Object.keys(options).length > 0) ctx.patch.options = options as BuildOptions;

  const unsupported = [...ctx.unsupportedByReason]
    .sort((a, b) => a[1].first - b[1].first)
    .map(([reason, e]) => `${e.phrases.join(', ')} – ${reason}`);
  const warnings = [...ctx.warnings];
  for (const w of unknownClauseWarnings(original, (i) => ctx.claimed[i] === 1 || ctx.kindClaimed[i] === 1)) if (!warnings.includes(w)) warnings.push(w);

  const seen = new Set<string>();
  const recognized = ctx.recognized
    .sort((a, b) => a.start - b.start)
    .filter((r) => {
      const key = `${r.phrase}|${r.effect}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(({ phrase, effect }) => ({ phrase, effect }));

  const plan = patchToPlan(ctx.patch, { unsupported });
  return { patch: ctx.patch, recognized, warnings, unsupported, explanation: describePlan(plan) };
}

/** The parser result in the shared plan format (same display as an AI plan). */
export function parsedToPlan(parsed: ParsedDescription): BuildPlan {
  return patchToPlan(parsed.patch, { explanation: parsed.explanation, unsupported: parsed.unsupported });
}
