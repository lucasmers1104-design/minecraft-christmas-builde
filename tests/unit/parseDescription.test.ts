import { describe, expect, it } from 'vitest';
import { planToPatch } from '@/core/ai/planSchema';
import { parsedToPlan, parseDescription } from '@/core/generator/parseDescription';
import { DEFAULT_DESCRIPTION, DEFAULT_HOUSE_SPEC } from '@/core/schema/buildSpec';
import { resolveSpec, specPatchSchema, withManual, withoutManual } from '@/core/schema/resolveSpec';
import { hasMaterial } from '@/core/style/materials';
import { STYLE_IDS, STYLES, type StyleId } from '@/core/style/styles';
import { PLAN_TESTSET } from '../fixtures/planTestset';

const opts = (text: string) => parseDescription(text).patch.options ?? {};

describe('parseDescription (BuildSpec v2)', () => {
  it('versteht den Standardtext vollständig ohne Warnungen', () => {
    const r = parseDescription(DEFAULT_DESCRIPTION);
    expect(r.patch).toMatchObject({
      kind: 'house',
      style: 'rustic',
      theme: 'christmas',
      options: { roofProfile: 'steep', lanternDensity: 'many', garland: true, chimney: true, materials: { wall: 'spruce_planks' } },
    });
    expect(r.patch.options?.snow).toBeUndefined();
    expect(r.warnings).toEqual([]);
    expect(r.unsupported).toEqual([]);
    expect(r.recognized.map((x) => x.phrase)).toEqual(expect.arrayContaining(['Weihnachtshaus', 'aus Fichtenholz', 'steilem Dach', 'vielen Laternen', 'Girlanden', 'Schornstein']));
    expect(r.explanation).toMatch(/Haus im Stil Rustikal mit Thema Weihnachten/);
  });

  it('jedes Stichwort aus dem Stilkatalog wählt seinen Stil', () => {
    const owners = new Map<string, StyleId[]>();
    for (const s of STYLE_IDS) for (const k of STYLES[s].llm.keywords) owners.set(k, [...(owners.get(k) ?? []), s]);
    for (const s of STYLE_IDS) {
      for (const k of STYLES[s].llm.keywords) {
        if ((owners.get(k) ?? []).length > 1) continue;
        expect(parseDescription(k).patch.style, k).toBe(s);
      }
    }
  });

  it.each([
    ['Fachwerkhaus', 'medieval'],
    ['Tudor-Haus', 'medieval'],
    ['Hexenhaus', 'fantasy'],
    ['Haus wie im Märchen', 'fantasy'],
    ['Turm eines Zauberers', 'fantasy'],
    ['Hütte', 'rustic'],
    ['Chalet', 'rustic'],
    ['Blockhaus', 'rustic'],
    ['Cottage', 'rustic'],
    ['Wikingerhalle', 'nordic'],
    ['Langhaus', 'nordic'],
    ['skandinavisches Haus', 'nordic'],
    ['Pagode', 'japanese'],
    ['Tempel', 'japanese'],
    ['Shinto-Schrein', 'japanese'],
    ['Sakura-Haus', 'cherry'],
    ['Haus mit Kirschblüten', 'cherry'],
    ['Villa', 'modern'],
    ['Bungalow', 'modern'],
    ['modernes Haus', 'modern'],
    ['Haus mit Flachdach', 'modern'],
    ['mediterranes Haus', 'mediterranean'],
    ['Haus in der Toskana', 'mediterranean'],
    ['griechisches Haus', 'mediterranean'],
    ['toskanische Villa', 'mediterranean'],
    ['skandinavische Hütte', 'nordic'],
    ['Großes Steinhaus im Märchenstil', 'fantasy'],
  ])('Stil aus „%s“ = %s', (text, style) => {
    expect(parseDescription(text).patch.style).toBe(style);
  });

  it('Stil-Extras: Pagode → Pagodendach, Chalet → ausgestellte Traufe, Cottage → asymmetrisch, Tudor/Tempel/Langhaus → Palette', () => {
    expect(opts('Pagode')).toMatchObject({ roofType: 'pagoda' });
    expect(opts('Chalet')).toMatchObject({ roofProfile: 'flared' });
    expect(opts('Cottage')).toMatchObject({ symmetry: 'asymmetric' });
    expect(opts('Verwinkeltes Cottage')).toMatchObject({ symmetry: 'rambling' });
    expect(opts('Tudorhaus')).toMatchObject({ palette: 'medieval_tudor' });
    expect(opts('Japanischer Tempel')).toMatchObject({ palette: 'japanese_temple' });
    expect(opts('Langhaus')).toMatchObject({ palette: 'nordic_longhouse' });
    expect(opts('Bungalow')).toMatchObject({ floors: 1 });
    // A palette only applies to its own style.
    expect(opts('modernes Langhaus').palette).toBeUndefined();
  });

  it.each([
    ['ein Haus', 'house'],
    ['eine Hütte', 'house'],
    ['Weihnachtsbaum', 'tree'],
    ['große Tanne', 'tree'],
    ['Weihnachtsmarkt mit drei Buden', 'market_stall'],
    ['ein Glühweinstand auf dem Weihnachtsmarkt', 'market_stall'],
    ['Bahnhof im Schnee', 'station'],
    ['Burgturm', 'tower'],
    ['Wachturm aus Stein', 'tower'],
    ['ein Turm mit Glockendach', 'tower'],
    ['Weihnachtshaus mit Tannenbaum', 'house'],
    ['Weihnachtsbaum neben dem Haus', 'house'],
  ])('Bauwerkstyp aus „%s“ = %s', (text, kind) => {
    expect(parseDescription(text).patch.kind).toBe(kind);
  });

  it('Weihnachtsbaum am Haus ist eine Option, kein Bauwerkstyp', () => {
    expect(parseDescription('Haus mit Weihnachtsbaum im Garten').patch).toMatchObject({ kind: 'house', options: { christmasTree: true, garden: true } });
    expect(parseDescription('Haus ohne Weihnachtsbaum').patch.options).toMatchObject({ christmasTree: false });
    expect(parseDescription('Haus mit Kirschbäumen').patch.options?.christmasTree).toBeUndefined();
  });

  it('Thema: weihnachtlich / winterlich; Schnee nur auf ausdrücklichen Wunsch', () => {
    expect(parseDescription('weihnachtliches Haus').patch.theme).toBe('christmas');
    expect(parseDescription('Adventshaus').patch.theme).toBe('christmas');
    expect(parseDescription('winterliches Haus').patch).toMatchObject({ theme: 'winter' });
    expect(opts('winterliches Haus').snow).toBeUndefined();
    expect(opts('verschneite Hütte').snow).toBeUndefined();
    expect(parseDescription('verschneite Hütte').patch.theme).toBe('winter');
    for (const t of ['Haus mit Schnee auf dem Dach', 'Haus mit verschneitem Dach', 'Hütte mit Schnee', 'schneebedecktes Dach']) {
      expect(opts(t).snow, t).toBe(true);
    }
    expect(opts('Haus ohne Schnee').snow).toBe(false);
    expect(parseDescription('winterlich, aber nicht weihnachtlich').patch.theme).toBe('winter');
    expect(parseDescription('Haus, nicht weihnachtlich').patch.theme).toBe('none');
    expect(parseDescription('weihnachtliches verschneites Haus').patch.theme).toBe('christmas');
  });

  it('Symmetrie: symmetrisch, asymmetrisch, verwinkelt, Verneinung', () => {
    expect(opts('symmetrisches Haus').symmetry).toBe('symmetric');
    expect(opts('asymmetrisches Haus').symmetry).toBe('asymmetric');
    expect(opts('verwinkeltes Haus').symmetry).toBe('rambling');
    expect(opts('Haus, nicht symmetrisch').symmetry).toBe('asymmetric');
    expect(opts('symmetrisches Cottage').symmetry).toBe('symmetric');
  });

  it.each([
    ['Satteldach', 'gable'],
    ['Walmdach', 'hip'],
    ['Krüppelwalmdach', 'half_hip'],
    ['Krueppelwalmdach', 'half_hip'],
    ['Irimoya-Dach', 'irimoya'],
    ['Walmgiebeldach', 'irimoya'],
    ['Mansarddach', 'mansard'],
    ['Gambrel-Dach', 'gambrel'],
    ['Scheunendach', 'gambrel'],
    ['A-Frame-Haus', 'a_frame'],
    ['Spitzdach-Hütte', 'a_frame'],
    ['Flachdach', 'flat'],
    ['Pyramidendach', 'pyramid'],
    ['Pagodendach', 'pagoda'],
    ['asymmetrisches Dach', 'saltbox'],
  ])('Dachform „%s“ = %s', (text, roofType) => {
    expect(opts(text).roofType).toBe(roofType);
  });

  it('Pultdach wird nicht angeboten und erzeugt eine Warnung', () => {
    const r = parseDescription('Haus mit Pultdach');
    expect(r.patch.options?.roofType).toBeUndefined();
    expect(r.warnings.join()).toMatch(/Pultdach/);
  });

  it.each([
    ['steiles Dach', 'steep'],
    ['flach geneigtes Dach', 'shallow'],
    ['flaches Dach', 'shallow'],
    ['geschwungenes Dach', 'bell'],
    ['Glockendach', 'bell'],
    ['ausgestellte Traufe', 'flared'],
    ['gewölbtes Dach', 'convex'],
    ['Zwiebeldach', 'ogee'],
  ])('Dachprofil „%s“ = %s', (text, roofProfile) => {
    expect(opts(text).roofProfile).toBe(roofProfile);
  });

  it('Bauteile: Gauben, Erker, Veranda, Balkon, Kamin, Jetty, Garten (mit Verneinung)', () => {
    expect(opts('Haus mit drei Gauben').dormers).toBe(3);
    expect(opts('Haus mit einer Gaube').dormers).toBe(1);
    expect(opts('Haus mit Gauben').dormers).toBe(2);
    expect(opts('Haus ohne Gauben').dormers).toBe(0);
    expect(opts('Haus mit Erker').oriel).toBe(true);
    expect(opts('Haus mit Veranda').porch).toBe(true);
    expect(opts('Haus mit Vordach').porch).toBe(true);
    expect(opts('Haus mit Balkon').balcony).toBe(true);
    expect(opts('Haus mit Kamin').chimney).toBe(true);
    expect(opts('Haus ohne Schornstein').chimney).toBe(false);
    expect(opts('Fachwerkhaus mit vorkragendem Obergeschoss')).toMatchObject({ jetty: true, floors: 2 });
    expect(opts('Haus mit Fachwerk-Obergeschoss')).toMatchObject({ jetty: true, floors: 2 });
    expect(opts('Haus mit Hecke').garden).toBe(true);
    expect(opts('Haus ohne Garten').garden).toBe(false);
  });

  it('Turm: rund/eckig, Seite und vorne/hinten; Türmchen bei Fantasy rund', () => {
    expect(opts('Haus mit rundem Turm')).toMatchObject({ tower: 'round' });
    expect(opts('Haus mit eckigem Turm rechts')).toMatchObject({ tower: 'square', towerPosition: 'front_right' });
    expect(opts('Haus mit Turm hinten links')).toMatchObject({ tower: 'square', towerPosition: 'back_left' });
    expect(opts('Märchenhaus mit Turm')).toMatchObject({ tower: 'round' });
    expect(opts('Haus mit Türmchen')).toMatchObject({ tower: 'round' });
    expect(opts('Haus ohne Turm')).toMatchObject({ tower: 'none' });
    const station = parseDescription('Bahnhof mit Uhrturm');
    expect(station.patch.options?.tower).toBeUndefined();
    expect(station.unsupported.join()).toMatch(/Uhrturm/);
  });

  it('Grundriss: Flügel, L/T/U-Form, Anbau links/rechts', () => {
    expect(opts('Haus in L-Form').wings).toBe('L');
    expect(opts('T-förmiges Haus').wings).toBe('T');
    expect(opts('Haus in U-Form').wings).toBe('U');
    expect(opts('Haus mit Seitenflügel').wings).toBe('L');
    expect(opts('Haus mit zwei Seitenflügeln').wings).toBe('U');
    expect(opts('Haus mit Anbau links')).toMatchObject({ annex: 'left' });
    expect(opts('Haus mit Turm rechts und Anbau links')).toMatchObject({ tower: 'square', towerPosition: 'front_right', annex: 'left' });
  });

  it.each([
    ['zweistöckiges Haus', 2],
    ['dreistöckiges Haus', 3],
    ['Haus mit 4 Stockwerken', 4],
    ['Haus mit zwei Geschossen', 2],
    ['eingeschossiges Haus', 1],
    ['Haus mit Obergeschoss', 2],
    ['Haus mit zwei Obergeschossen', 3],
    ['2-stöckiges Haus', 2],
  ])('Geschosse „%s“ = %d', (text, floors) => {
    expect(opts(text).floors).toBe(floors);
  });

  it('Größe nur für das Bauwerk, nicht für Bauteile', () => {
    expect(parseDescription('kleines Haus').patch.size).toBe('small');
    expect(parseDescription('großes Haus').patch.size).toBe('large');
    expect(parseDescription('grosses Haus').patch.size).toBe('large');
    expect(parseDescription('riesiges Haus').patch.size).toBe('huge');
    expect(parseDescription('ein sehr großes Haus').patch.size).toBe('huge');
    expect(parseDescription('mittelgroßes Haus').patch.size).toBe('medium');
    expect(parseDescription('Häuschen').patch.size).toBe('small');
    expect(parseDescription('Das Haus soll groß sein').patch.size).toBe('large');
    expect(parseDescription('Haus mit großen Fenstern').patch.size).toBeUndefined();
    expect(parseDescription('Haus mit großem Garten').patch.size).toBeUndefined();
    expect(parseDescription('Haus mit großem Turm').patch.size).toBeUndefined();
    expect(parseDescription('mittelalterliches Haus').patch.size).toBeUndefined();
  });

  it('Laternen, Seelenlaternen, Girlanden, Geschenke, Licht', () => {
    expect(opts('Haus mit vielen Laternen').lanternDensity).toBe('many');
    expect(opts('Haus mit Laternen').lanternDensity).toBe('normal');
    expect(opts('Haus mit ein paar Laternen').lanternDensity).toBe('few');
    expect(opts('Haus ohne Laternen').lanternDensity).toBe('none');
    expect(opts('Haus ohne Licht').lanternDensity).toBe('none');
    expect(opts('hell erleuchtetes Haus').lanternDensity).toBe('many');
    expect(opts('Haus mit Seelenlaternen')).toMatchObject({ soulLanterns: true });
    expect(opts('Haus mit vielen Seelenlaternen')).toMatchObject({ soulLanterns: true, lanternDensity: 'many' });
    expect(opts('Haus mit Girlanden').garland).toBe(true);
    expect(opts('Haus mit Lichterketten').garland).toBe(true);
    expect(opts('Haus mit Geschenken').presents).toBe(true);
  });

  it('Fenster und Türen: Dichte und Familien', () => {
    expect(opts('viele Fenster').windows).toBe('many');
    expect(opts('wenige Fenster').windows).toBe('few');
    expect(opts('viele Bogenfenster')).toMatchObject({ windows: 'many', windowFamily: 'arched' });
    expect(opts('Rundfenster').windowFamily).toBe('round');
    expect(opts('Fensterläden').windowFamily).toBe('shuttered');
    expect(opts('Fensterlaeden').windowFamily).toBe('shuttered');
    expect(opts('Shoji-Wände').windowFamily).toBe('shoji');
    expect(opts('Bleiglasfenster').windowFamily).toBe('leaded');
    expect(opts('Fensterband').windowFamily).toBe('band');
    expect(opts('gerahmte Fenster').windowFamily).toBe('framed');
    expect(opts('Doppeltür').doorFamily).toBe('double');
    expect(opts('Rundbogentür').doorFamily).toBe('arched');
    expect(opts('Portal').doorFamily).toBe('arched');
    expect(opts('Tür mit Oberlicht').doorFamily).toBe('transom');
    expect(opts('Schiebetür').doorFamily).toBe('genkan');
  });

  it('Detailgrad', () => {
    expect(parseDescription('schlichtes Haus').patch.detailLevel).toBe(1);
    expect(parseDescription('dekoriertes Haus').patch.detailLevel).toBe(2);
    expect(parseDescription('reich dekoriertes Haus').patch.detailLevel).toBe(3);
    expect(parseDescription('prächtig geschmücktes Haus').patch.detailLevel).toBe(3);
    expect(parseDescription('Haus, Detailgrad 2').patch.detailLevel).toBe(2);
    expect(parseDescription('minimalistisches Haus').patch).toMatchObject({ style: 'modern', detailLevel: 1 });
  });

  it('Materialien nur aus der sicheren Liste (gültige Katalog-IDs)', () => {
    const cases: [string, string, string][] = [
      ['Haus aus Fichtenholz', 'wall', 'spruce_planks'],
      ['Eichenhaus', 'wall', 'oak_planks'],
      ['Haus aus Birke', 'wall', 'birch_planks'],
      ['Haus aus dunklem Holz', 'wall', 'dark_oak_planks'],
      ['Haus aus Backstein', 'wall', 'bricks'],
      ['Steinhaus', 'wall', 'stone_bricks'],
      ['Haus aus Sandstein', 'wall', 'sandstone'],
      ['Haus aus Bruchstein', 'wall', 'cobblestone'],
      ['Haus aus Lehm', 'wall', 'mud_bricks'],
      ['Haus aus Beton', 'wall', 'white_concrete'],
      ['Haus aus Tiefenschiefer', 'wall', 'deepslate_bricks'],
      ['Haus aus Baumstämmen', 'wall', 'spruce_log'],
      ['Haus mit Schieferdach', 'roof', 'deepslate_tiles'],
      ['Haus mit rotem Ziegeldach', 'roof', 'bricks'],
      ['Haus mit grünem Dach', 'roof', 'waxed_oxidized_cut_copper'],
      ['Haus mit Kupferdach', 'roof', 'waxed_cut_copper'],
      ['Haus mit Holzschindeln', 'roof', 'dark_oak_planks'],
      ['Haus mit dunklen Balken', 'frame', 'dark_oak_log'],
      ['Haus mit Eichenbalken', 'frame', 'oak_log'],
      ['Haus mit Sockel aus Bruchstein', 'plinth', 'cobblestone'],
      ['Haus mit Steinsockel', 'plinth', 'cobblestone'],
      ['Haus mit roten Akzenten', 'accent', 'red_wool'],
      ['Haus mit goldenen Akzenten', 'accent', 'gold_block'],
    ];
    for (const [text, role, id] of cases) {
      const materials = opts(text).materials as Record<string, string> | undefined;
      expect(materials?.[role], text).toBe(id);
      expect(hasMaterial(id), id).toBe(true);
    }
    const white = parseDescription('Haus mit weißem Dach');
    expect(white.patch.options?.materials).toBeUndefined();
    expect(white.warnings.join()).toMatch(/Dachfarbe/);
  });

  it('erkennt Maße und passt gerade oder zu große Werte mit Hinweis an', () => {
    expect(opts('Haus 15 x 11 Blöcke')).toMatchObject({ width: 15, depth: 11 });
    expect(opts('Haus 15x11')).toMatchObject({ width: 15, depth: 11 });
    expect(opts('Haus, 13 breit und 9 tief')).toMatchObject({ width: 13, depth: 9 });
    const r = parseDescription('Haus 14 x 80');
    expect(r.patch.options).toMatchObject({ width: 15, depth: 61 });
    expect(r.warnings.join()).toMatch(/angepasst/);
    const floors = parseDescription('Haus mit zehn Stockwerken');
    expect(floors.patch.options?.floors).toBe(8);
    expect(floors.warnings.join()).toMatch(/Geschosse 10 auf 8/);
  });

  it('Verneinungen gelten für Aufzählungen, bis ein neuer positiver Wunsch beginnt', () => {
    expect(opts('Haus ohne Schnee und Girlanden')).toMatchObject({ snow: false, garland: false });
    expect(opts('Haus ohne Schnee, mit Girlanden')).toMatchObject({ snow: false, garland: true });
    expect(opts('Haus ohne Schnee und mit vielen Laternen')).toMatchObject({ snow: false, lanternDensity: 'many' });
    expect(opts('kein Schnee und viele Laternen')).toMatchObject({ snow: false, lanternDensity: 'many' });
    expect(opts('keinen Turm, aber einen Kamin')).toMatchObject({ tower: 'none', chimney: true });
  });

  it('mehrere Wünsche in einem Satz', () => {
    const r = parseDescription('Ich hätte gern ein großes mittelalterliches Fachwerkhaus mit rundem Turm links, Krüppelwalmdach, drei Gauben, vielen Laternen und Girlanden, weihnachtlich, ohne Schnee');
    expect(r.patch).toMatchObject({
      kind: 'house',
      style: 'medieval',
      theme: 'christmas',
      size: 'large',
      options: { tower: 'round', towerPosition: 'front_left', roofType: 'half_hip', dormers: 3, lanternDensity: 'many', garland: true, snow: false },
    });
    expect(r.warnings).toEqual([]);
  });

  it('meldet nicht baubare Wünsche als unsupported, Unverstandenes als Warnung', () => {
    const r = parseDescription('Ein Haus mit Pool, Garage, Balkon, Keller, Möbeln, Springbrunnen, Eiszapfen, einem Schneemann, einer Haustür und einem Einhorn');
    expect(r.patch).toMatchObject({ kind: 'house', options: { balcony: true } });
    const u = r.unsupported.join(' | ');
    for (const word of ['Pool', 'Garage', 'Keller', 'Möbeln', 'Springbrunnen', 'Eiszapfen', 'Schneemann']) expect(u).toContain(word);
    expect(r.warnings.join(' | ')).toMatch(/Einhorn.*nicht erkannt/);
    expect(r.warnings.join(' | ')).not.toMatch(/Pool|Garage|Keller|Haustür/);
  });
});

describe('keine Fehlalarme durch Wortteile', () => {
  it('„Schornstein“ ist kein Stein, „Tannenbaum“ kein Fichtenholz, „Kirschbaum“ kein Weihnachtsbaum', () => {
    const chimney = parseDescription('Haus mit Schornstein');
    expect(chimney.patch.options?.materials).toBeUndefined();
    expect(chimney.patch.style).toBeUndefined();
    const tree = parseDescription('Haus mit Tannenbaum');
    expect(tree.patch.options?.materials).toBeUndefined();
    expect(tree.patch.options?.christmasTree).toBe(true);
    expect(parseDescription('Haus mit Kirschbaum').patch.options?.christmasTree).toBeUndefined();
  });

  it('„Schneesturm“ ist kein Turm, „türkis“ keine Tür, „Haustür“ kein Haus', () => {
    const storm = parseDescription('Haus im Schneesturm');
    expect(storm.patch.options?.tower).toBeUndefined();
    expect(storm.patch.theme).toBe('winter');
    expect(parseDescription('türkise Akzente').patch.options?.doorFamily).toBeUndefined();
    const keep = parseDescription('Turm mit einer schweren Haustür');
    expect(keep.patch.kind).toBe('tower');
    expect(keep.unsupported).toEqual([]);
  });

  it.each([
    ['realistisches Haus', /Möbel/],
    ['Haus mit hundert Laternen', /Tiere/],
    ['Haus mit Kirchenfenstern', /Bauwerkstyp/],
    ['Haus mit Leuchtturm-Laterne', /Bauwerkstyp/],
  ])('„%s“ meldet nichts Falsches', (text, wrong) => {
    const r = parseDescription(text);
    expect([...r.warnings, ...r.unsupported].join(' ')).not.toMatch(wrong);
  });

  it('„mittelalterlich“ ist keine Größe, „besser“ kein Kamin, „Fachwerkhäuschen“ ein kleines Haus', () => {
    expect(parseDescription('mittelalterliches Haus').patch.size).toBeUndefined();
    expect(opts('ein besseres Haus').chimney).toBeUndefined();
    expect(parseDescription('Fachwerkhaeuschen').patch).toMatchObject({ kind: 'house', style: 'medieval', size: 'small' });
  });
});

describe('Parser und Planformat', () => {
  const texts = [DEFAULT_DESCRIPTION, ...PLAN_TESTSET.map((c) => c.wish)];

  it('jedes Ergebnis ist ein gültiger SpecPatch und ergibt eine gültige BuildSpec', () => {
    for (const text of texts) {
      const r = parseDescription(text);
      expect(() => specPatchSchema.parse(r.patch), text).not.toThrow();
      expect(() => resolveSpec(DEFAULT_HOUSE_SPEC, r, {}), text).not.toThrow();
    }
  });

  it('Plan ⇄ Patch ohne Verlust (Parser und KI teilen ein Format)', () => {
    for (const text of texts) {
      const r = parseDescription(text);
      const plan = parsedToPlan(r);
      expect(planToPatch(plan), text).toEqual(r.patch);
      expect(plan.unsupported).toEqual(r.unsupported);
      expect(plan.explanation).toBe(r.explanation);
    }
  });
});

describe('resolveSpec: Einstellungen haben Vorrang vor dem Text', () => {
  it('Text füllt Felder, manuelle Einstellungen überschreiben und erzeugen einen Hinweis', () => {
    const parsed = parseDescription('kleines Fachwerkhaus ohne Schnee');
    const manual = withManual(withManual({}, 'style', 'nordic'), 'options.snow', true);
    const r = resolveSpec(DEFAULT_HOUSE_SPEC, parsed, manual);
    expect(r.spec.size).toBe('small');
    expect(r.spec.style).toBe('nordic');
    expect(r.spec.options.snow).toBe(true);
    expect(r.sources).toMatchObject({ size: 'text', style: 'manuell', 'options.snow': 'manuell' });
    expect(r.conflicts).toHaveLength(2);
    expect(r.conflicts.join()).toMatch(/medieval.*nordic/);
  });

  it('withoutManual stellt den Textwert wieder her', () => {
    const parsed = parseDescription('Haus mit Schieferdach');
    let manual = withManual({}, 'options.materials.roof', 'bricks');
    expect(resolveSpec(DEFAULT_HOUSE_SPEC, parsed, manual).spec.options.materials?.roof).toBe('bricks');
    manual = withoutManual(manual, 'options.materials.roof');
    expect(resolveSpec(DEFAULT_HOUSE_SPEC, parsed, manual).spec.options.materials?.roof).toBe('deepslate_tiles');
  });

  it('ohne Text gelten die Standardwerte', () => {
    const r = resolveSpec(DEFAULT_HOUSE_SPEC, null, {});
    expect(r.spec).toEqual(DEFAULT_HOUSE_SPEC);
    expect(r.sources).toEqual({});
  });
});
