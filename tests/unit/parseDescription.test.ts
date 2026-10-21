import { describe, expect, it } from 'vitest';
import { generateBuilding } from '@/core/generator/generateBuilding';
import { parseDescription } from '@/core/generator/parseDescription';
import { DEFAULT_DESCRIPTION, DEFAULT_HOUSE_SPEC } from '@/core/schema/buildSpec';
import { resolveSpec, withManual, withoutManual } from '@/core/schema/resolveSpec';

describe('parseDescription', () => {
  it('versteht den Standardtext vollständig ohne Warnungen', () => {
    const r = parseDescription(DEFAULT_DESCRIPTION);
    expect(r.patch).toMatchObject({
      kind: 'house',
      materialTheme: 'spruce',
      style: 'christmas',
      colorTheme: 'red_green',
      options: { snow: true, lights: true, chimney: true, materials: { accent: 'red_wool' } },
    });
    expect(r.warnings).toEqual([]);
    expect(r.recognized.map((x) => x.phrase)).toEqual(
      expect.arrayContaining(['Weihnacht', 'haus', 'Fichte', 'verschneit', 'roten Akzenten', 'leucht', 'Schornstein']),
    );
  });

  it.each([
    ['Eine kleine Hütte aus Eiche', { size: 'small', materialTheme: 'oak', kind: 'house' }],
    ['Großes Steinhaus im Märchenstil', { size: 'large', materialTheme: 'stone', style: 'fairytale' }],
    ['ein riesiges realistisches Haus', { size: 'large', style: 'realistic' }],
    ['eisblaues Haus', { colorTheme: 'ice_blue' }],
    ['rustikales Haus in Naturtönen', { colorTheme: 'natural' }],
    ['schlichtes Haus', { detailLevel: 1 }],
    ['prächtig geschmücktes Haus', { detailLevel: 3 }],
    ['Gruenes Haeuschen', { size: 'small', colorTheme: 'red_green' }],
  ])('„%s“', (text, expected) => {
    expect(parseDescription(text).patch).toMatchObject(expected);
  });

  it('erkennt Feinparameter, Maße und Verneinungen', () => {
    const r = parseDescription('Haus mit Weihnachtsbaum und Geschenken, ohne Schnee, kein Schornstein, 15 x 11 Blöcke, Wände 6 hoch, viele Fenster, steiles Dach, rotes Dach');
    expect(r.patch.options).toEqual({
      christmasTree: true,
      presents: true,
      snow: false,
      chimney: false,
      width: 15,
      depth: 11,
      wallHeight: 6,
      windows: 'many',
      roofShape: 'steep',
      materials: { roof: 'red_terracotta' },
    });
    expect(r.warnings).toEqual([]);
  });

  it('passt gerade oder zu große Maße an und sagt das', () => {
    const r = parseDescription('Haus 14 x 60');
    expect(r.patch.options).toMatchObject({ width: 15, depth: 25 });
    expect(r.warnings.join()).toMatch(/angepasst/);
  });

  it('meldet nicht umsetzbare Wünsche als Warnung statt sie zu ignorieren', () => {
    const r = parseDescription('Ein Haus mit Pool, Garage, Balkon, einer Haustür und einem Einhorn');
    expect(r.patch.kind).toBe('house');
    const w = r.warnings.join(' | ');
    expect(w).toMatch(/Pool/);
    expect(w).toMatch(/Garage/);
    expect(w).toMatch(/Balkon/);
    expect(w).toMatch(/Tür-Blöcke/);
    expect(w).toMatch(/Einhorn.*nicht erkannt/);
  });

  it('Bauwerkstypen, die noch fehlen, werden ehrlich gemeldet', () => {
    const r = parseDescription('Bahnhof im Schnee');
    expect(r.patch.kind).toBe('house');
    expect(r.warnings.join()).toMatch(/Bahnhof ist noch nicht verfügbar/);
  });

  it('„Schornstein“ ist kein Steinhaus, „Tannenbaum“ kein Fichtenholz', () => {
    expect(parseDescription('Haus mit Schornstein').patch.materialTheme).toBeUndefined();
    const tree = parseDescription('Haus mit Tannenbaum');
    expect(tree.patch.materialTheme).toBeUndefined();
    expect(tree.patch.options?.christmasTree).toBe(true);
  });

  it('jede erkannte Einstellung verändert das erzeugte Modell', () => {
    const base = generateBuilding(DEFAULT_HOUSE_SPEC);
    for (const text of ['kleines Haus', 'ohne Schnee', 'kein Schornstein', 'viele Fenster', 'Birkenholz', 'rotes Dach', 'ohne Licht']) {
      const { spec } = resolveSpec(DEFAULT_HOUSE_SPEC, parseDescription(text), {});
      expect(generateBuilding(spec).hash, text).not.toBe(base.hash);
    }
  });
});

describe('resolveSpec: Einstellungen haben Vorrang vor dem Text', () => {
  it('Text füllt Felder, manuelle Einstellungen überschreiben und erzeugen einen Hinweis', () => {
    const parsed = parseDescription('kleines Haus aus Eiche ohne Schnee');
    const manual = withManual(withManual({}, 'materialTheme', 'stone'), 'options.snow', true);
    const r = resolveSpec(DEFAULT_HOUSE_SPEC, parsed, manual);
    expect(r.spec.size).toBe('small');
    expect(r.spec.materialTheme).toBe('stone');
    expect(r.spec.options.snow).toBe(true);
    expect(r.sources).toMatchObject({ size: 'text', materialTheme: 'manuell', 'options.snow': 'manuell' });
    expect(r.conflicts).toHaveLength(2);
    expect(r.conflicts.join()).toMatch(/oak.*stone/);
  });

  it('withoutManual stellt den Textwert wieder her', () => {
    const parsed = parseDescription('rotes Dach');
    let manual = withManual({}, 'options.materials.roof', 'bricks');
    expect(resolveSpec(DEFAULT_HOUSE_SPEC, parsed, manual).spec.options.materials?.roof).toBe('bricks');
    manual = withoutManual(manual, 'options.materials.roof');
    expect(resolveSpec(DEFAULT_HOUSE_SPEC, parsed, manual).spec.options.materials?.roof).toBe('red_terracotta');
  });

  it('ohne Text gelten die Standardwerte', () => {
    const r = resolveSpec(DEFAULT_HOUSE_SPEC, null, {});
    expect(r.spec).toEqual(DEFAULT_HOUSE_SPEC);
    expect(r.sources).toEqual({});
  });
});

describe('keine Fehlalarme durch Wortteile', () => {
  it.each([
    ['realistisches Haus', /tisch|Möbel/i],
    ['Haus im Schneesturm', /Türme/],
    ['türkise Akzente', /Tür-Blöcke/],
    ['Haus mit Schornstein', /Stein/],
  ])('„%s“', (text, wrong) => {
    expect(parseDescription(text).warnings.join(' ')).not.toMatch(wrong);
  });
});
