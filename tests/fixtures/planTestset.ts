import type { BuildPlan } from '@/core/ai/planSchema';

/**
 * Test set: German building wishes with the plan properties a good planner must produce.
 * Expectations are partial – only the listed fields are checked; "auto"/null in an
 * expectation means "must NOT be set" (e.g. "verschneit" is a theme, not snow on the roof).
 * `unsupported` lists keywords that must appear in the plan's unsupported list.
 *
 * Used by tests/unit/planTestset.test.ts (rule-based parser, always) and
 * tests/integration/ollamaTestset.test.ts (real local model, only with MCB_OLLAMA_TESTSET=1).
 * The wishes are deliberately different from the few-shot examples of the prompt.
 */

export type PlanExpectation = Partial<Omit<BuildPlan, 'explanation' | 'unsupported'>> & { unsupported?: string[] };

export interface PlanTestCase {
  wish: string;
  expect: PlanExpectation;
}

export const PLAN_TESTSET: readonly PlanTestCase[] = [
  // Styles and building types.
  { wish: 'Mittelalterliches Fachwerkhaus mit Turm und geschwungenem Dach, weihnachtlich', expect: { kind: 'house', style: 'medieval', theme: 'christmas', tower: 'square', roofProfile: 'bell' } },
  { wish: 'Japanische Pagode mit Kirschbäumen im Garten', expect: { style: 'japanese', roofType: 'pagoda', garden: true } },
  { wish: 'Kleine Hütte im Wald, gemütlich und rustikal', expect: { kind: 'house', style: 'rustic', size: 'small' } },
  { wish: 'Ein Hexenhaus mit krummem Schornstein und runden Fenstern', expect: { kind: 'house', style: 'fantasy', chimney: true, windowFamily: 'round' } },
  { wish: 'Wikinger-Langhaus aus dunklem Holz', expect: { kind: 'house', style: 'nordic', wallMaterial: 'dark_oak_planks' } },
  { wish: 'Modernes Haus mit Flachdach und großen Fensterfronten', expect: { style: 'modern', roofType: 'flat', windows: 'many', windowFamily: 'band' } },
  { wish: 'Toskanische Villa mit Walmdach und Bogenfenstern', expect: { kind: 'house', style: 'mediterranean', roofType: 'hip', windowFamily: 'arched' } },
  { wish: 'Skandinavische Hütte mit Spitzdach', expect: { kind: 'house', style: 'nordic', roofProfile: 'steep' } },
  { wish: 'Griechisches Haus am Meer mit Fensterband', expect: { style: 'mediterranean', windowFamily: 'band' } },
  { wish: 'Kirschblütenhaus mit rosa Dach', expect: { style: 'cherry', roofMaterial: 'cherry_planks' } },
  { wish: 'Sakura-Teehaus am Teich', expect: { style: 'cherry', unsupported: ['Teich'] } },
  { wish: 'Japanischer Tempel mit Shoji-Fenstern und Laternen', expect: { style: 'japanese', palette: 'japanese_temple', windowFamily: 'shoji', lanternDensity: 'normal' } },
  { wish: 'Bungalow mit Flachdach', expect: { kind: 'house', style: 'modern', roofType: 'flat', floors: 1 } },
  { wish: 'Riesige Villa mit Doppeltür und vielen Fenstern', expect: { style: 'modern', size: 'huge', doorFamily: 'double', windows: 'many' } },
  { wish: 'Chalet mit Balkon und Holzschindeln', expect: { style: 'rustic', roofProfile: 'flared', balcony: true, roofMaterial: 'dark_oak_planks' } },
  { wish: 'Tudorhaus mit Fachwerk-Obergeschoss und Schieferdach', expect: { style: 'medieval', palette: 'medieval_tudor', jetty: true, floors: 2, roofMaterial: 'deepslate_tiles' } },
  { wish: 'Fachwerkhaus mit vorkragendem Obergeschoss', expect: { style: 'medieval', jetty: true, floors: 2 } },
  { wish: 'Maerchenhaftes Hexenhaus mit gewoelbtem Dach', expect: { style: 'fantasy', roofProfile: 'convex' } },
  { wish: 'Zauberer-Turm mit Glockendach', expect: { kind: 'tower', style: 'fantasy', roofProfile: 'bell' } },
  { wish: 'Nordisches Langhaus mit großem Dachüberstand', expect: { style: 'nordic', palette: 'nordic_longhouse', overhang: 2 } },
  { wish: 'Bauernhaus mit Scheunendach und Veranda', expect: { style: 'rustic', roofType: 'gambrel', porch: true } },
  { wish: 'U-förmiges Landhaus mit Innenhof', expect: { style: 'rustic', wings: 'U' } },
  { wish: 'Großes Steinhaus im Märchenstil mit festlicher Dekoration', expect: { style: 'fantasy', size: 'large', detailLevel: 3, wallMaterial: 'stone_bricks' } },
  { wish: 'Steinhaus mit Kamin', expect: { style: 'medieval', palette: 'medieval_stone', wallMaterial: 'stone_bricks', chimney: true } },
  // Other building types.
  { wish: 'Weihnachtsbaum mit vielen Geschenken', expect: { kind: 'tree', theme: 'christmas', presents: true } },
  { wish: 'Großer Weihnachtsmarkt mit Glühweinstand und Lichterketten', expect: { kind: 'market_stall', theme: 'christmas', size: 'large', garland: true } },
  { wish: 'Marktstand aus Fichtenholz mit Laternen, winterlich', expect: { kind: 'market_stall', theme: 'winter', wallMaterial: 'spruce_planks', lanternDensity: 'normal' } },
  { wish: 'Verschneiter Bahnhof mit Laternen', expect: { kind: 'station', theme: 'winter', snow: null, lanternDensity: 'normal' } },
  { wish: 'Ein hoher Wachturm aus Stein', expect: { kind: 'tower', size: 'large', wallMaterial: 'stone_bricks', style: 'medieval' } },
  { wish: 'Runder Burgturm mit Pyramidendach', expect: { kind: 'tower', style: 'medieval', roofType: 'pyramid' } },
  { wish: 'Ein Turm mit 6 Stockwerken und vielen Seelenlaternen', expect: { kind: 'tower', floors: 6, soulLanterns: true, lanternDensity: 'many' } },
  // Snow and theme (winter is not snow).
  { wish: 'Winterliches Haus ohne Schnee auf dem Dach', expect: { theme: 'winter', snow: false } },
  { wish: 'Haus mit Schnee auf dem Dach', expect: { snow: true } },
  { wish: 'Eine verschneite Hütte aus Eiche', expect: { kind: 'house', theme: 'winter', snow: null, wallMaterial: 'oak_planks' } },
  { wish: 'Weihnachtliches Haus, nicht symmetrisch', expect: { theme: 'christmas', symmetry: 'asymmetric' } },
  { wish: 'Haus mit Turm im Schneesturm', expect: { kind: 'house', theme: 'winter', tower: 'square' } },
  // Storeys, footprint, roof.
  { wish: 'Zweistöckiges Haus mit Erker und Balkon', expect: { floors: 2, oriel: true, balcony: true } },
  { wish: 'Dreistöckiges Stadthaus mit Mansarddach', expect: { kind: 'house', floors: 3, roofType: 'mansard' } },
  { wish: 'Haus mit 4 Stockwerken und Krüppelwalmdach', expect: { floors: 4, roofType: 'half_hip' } },
  { wish: 'A-Frame Hütte in den Bergen', expect: { kind: 'house', roofType: 'a_frame', style: 'rustic' } },
  { wish: 'Haus 15 x 11 Blöcke mit 3 Gauben', expect: { width: 15, depth: 11, dormers: 3 } },
  { wish: 'Haus 14x20', expect: { width: 15, depth: 21 } },
  { wish: 'Haus mit steilem Dach und 2 Blöcken Überstand', expect: { roofProfile: 'steep', overhang: 2 } },
  { wish: 'Mansarddach mit Gauben und Schornstein', expect: { roofType: 'mansard', dormers: 2, chimney: true } },
  { wish: 'Haus mit Pultdach', expect: { roofType: 'auto' } },
  { wish: 'Haus aus Backstein mit Satteldach', expect: { wallMaterial: 'bricks', roofType: 'gable' } },
  // Massing and symmetry.
  { wish: 'Haus mit rundem Turm vorne links', expect: { tower: 'round', towerPosition: 'front_left' } },
  { wish: 'Haus mit eckigem Turm hinten rechts', expect: { tower: 'square', towerPosition: 'back_right' } },
  { wish: 'Haus mit Turm links und Anbau rechts', expect: { tower: 'square', towerPosition: 'front_left', annex: 'right' } },
  { wish: 'Haus in L-Form mit Anbau rechts', expect: { wings: 'L', annex: 'right' } },
  { wish: 'Haus mit T-Form und Bleiglasfenstern', expect: { wings: 'T', windowFamily: 'leaded' } },
  { wish: 'Symmetrisches Haus mit zwei Gauben', expect: { symmetry: 'symmetric', dormers: 2 } },
  { wish: 'Verwinkeltes Cottage mit vielen Anbauten', expect: { style: 'rustic', symmetry: 'rambling' } },
  { wish: 'Asymmetrisches Hexenhaus', expect: { style: 'fantasy', symmetry: 'asymmetric' } },
  { wish: 'Cottage mit Fensterläden und Blumen', expect: { style: 'rustic', symmetry: 'asymmetric', windowFamily: 'shuttered', garden: true } },
  // Doors, windows.
  { wish: 'Kleines Häuschen mit Rundbogentür', expect: { kind: 'house', size: 'small', doorFamily: 'arched' } },
  { wish: 'Haus mit Oberlicht über der Tür', expect: { doorFamily: 'transom' } },
  { wish: 'Haus mit großen Fenstern', expect: { windows: 'many', size: 'auto' } },
  { wish: 'türkise Fensterläden am Haus', expect: { windowFamily: 'shuttered', doorFamily: 'auto' } },
  { wish: 'Gruenes Haeuschen mit Fensterlaeden', expect: { kind: 'house', size: 'small', windowFamily: 'shuttered' } },
  // Festive details, negations.
  { wish: 'Weihnachtsbaum neben dem Haus', expect: { kind: 'house', christmasTree: true } },
  { wish: 'Haus mit Weihnachtsbaum im Garten und Geschenken', expect: { kind: 'house', christmasTree: true, garden: true, presents: true } },
  { wish: 'Prächtig geschmücktes Weihnachtshaus mit Girlanden', expect: { kind: 'house', detailLevel: 3, theme: 'christmas', garland: true } },
  { wish: 'Haus mit wenigen Laternen und ohne Girlanden', expect: { lanternDensity: 'few', garland: false } },
  { wish: 'Haus ohne Licht', expect: { lanternDensity: 'none' } },
  { wish: 'Haus mit vielen Laternen und Girlanden, aber ohne Geschenke', expect: { lanternDensity: 'many', garland: true, presents: false } },
  { wish: 'Haus ohne Schornstein, ohne Veranda, aber mit Garten', expect: { chimney: false, porch: false, garden: true } },
  { wish: 'Kein Turm, keine Gauben, kein Schnee', expect: { tower: 'none', dormers: 0, snow: false } },
  { wish: 'Haus ohne Schnee und Girlanden, mit vielen Laternen', expect: { snow: false, garland: false, lanternDensity: 'many' } },
  { wish: 'Haus mit Erker, ohne Balkon', expect: { oriel: true, balcony: false } },
  { wish: 'ein großes Haus mit großem Garten', expect: { size: 'large', garden: true } },
  { wish: 'Detailgrad 1, schlichtes modernes Haus', expect: { detailLevel: 1, style: 'modern' } },
  { wish: 'Nikolaushaus mit Kerzen und Kränzen', expect: { kind: 'house', theme: 'christmas' } },
  // Not buildable.
  { wish: 'Mediterranes Haus mit Pool und Garage', expect: { style: 'mediterranean', unsupported: ['Pool', 'Garage'] } },
  { wish: 'Haus mit Keller und Möbeln', expect: { kind: 'house', unsupported: ['Keller', 'Möbel'] } },
  { wish: 'Wohnhaus mit Kaminzimmer und Bibliothek', expect: { kind: 'house', chimney: null, unsupported: ['Kaminzimmer', 'Bibliothek'] } },
  { wish: 'Haus mit Schornstein', expect: { chimney: true, wallMaterial: 'auto', style: 'auto' } },
  // Compositions (archetypes of the masses).
  { wish: 'Schmales Stadthaus mit Fachwerk und spitzem Giebel', expect: { kind: 'house', style: 'medieval', composition: 'town_house' } },
  { wish: 'Kleine Kapelle aus Holz mit Glockenturm', expect: { kind: 'house', composition: 'chapel' } },
  { wish: 'Rustikale Blockhütte mit Kamin', expect: { kind: 'house', style: 'rustic', composition: 'log_cabin', chimney: true } },
  { wish: 'Japanisches Wohnhaus mit Engawa', expect: { style: 'japanese', composition: 'engawa_house' } },
  { wish: 'Moderne Villa aus versetzten Kuben mit Dachterrasse', expect: { style: 'modern', composition: 'offset_cubes' } },
  { wish: 'Fachwerkhaus mit Zwerchgiebel über dem Eingang', expect: { style: 'medieval', composition: 'cross_gable' } },
  { wish: 'Toskanisches Winkelhaus mit rotem Dach', expect: { style: 'mediterranean', composition: 'cross_wing' } },
  { wish: 'Einfaches Haus mit Satteldach', expect: { roofType: 'gable', composition: 'auto' } },
];

const norm = (s: string) => s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');

/** Mismatches between a plan and the expectation (empty = passed). */
export function checkPlan(plan: BuildPlan, expected: PlanExpectation): string[] {
  const problems: string[] = [];
  for (const [key, want] of Object.entries(expected)) {
    if (key === 'unsupported') continue;
    const got = plan[key as keyof BuildPlan];
    if (got !== want) problems.push(`${key}: erwartet ${JSON.stringify(want)}, erhalten ${JSON.stringify(got)}`);
  }
  for (const word of expected.unsupported ?? []) {
    if (!plan.unsupported.some((u) => norm(u).includes(norm(word)))) problems.push(`unsupported: „${word}“ fehlt (${JSON.stringify(plan.unsupported)})`);
  }
  return problems;
}

/** Number of checked properties of an expectation (for property-level accuracy). */
export function expectationSize(expected: PlanExpectation): number {
  return Object.keys(expected).filter((k) => k !== 'unsupported').length + (expected.unsupported?.length ?? 0);
}
