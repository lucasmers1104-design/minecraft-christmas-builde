import { describe, expect, it } from 'vitest';
import { lintHouse } from '@/core/analysis/buildingLints';
import { generateBuildingWithReport } from '@/core/generator/generateBuilding';
import { wallTopOf } from '@/core/generator/house/plan';
import { parseDescription } from '@/core/generator/parseDescription';
import { DEFAULT_HOUSE_SPEC, type BuildSpec } from '@/core/schema/buildSpec';
import { COMPOSITION_INFO, COMPOSITIONS, compositionsFor, stylesCompositions, type CompositionId } from '@/core/style/compositions';
import { STYLE_IDS, type StyleId } from '@/core/style/styles';

/**
 * Composition layer (stage "Profi-Builds", phase 2): archetypes per style, a cascade of masses
 * instead of a box, clean intersections, and manual options before the archetype.
 */

function build(style: StyleId, size: BuildSpec['size'], seed: number, options: BuildSpec['options'] = {}) {
  const spec: BuildSpec = { ...DEFAULT_HOUSE_SPEC, style, size, seed, theme: 'none', options };
  return generateBuildingWithReport(spec);
}

describe('Archetypen als Daten', () => {
  it('jeder Stil hat 4–8 Bauformen und für jede Größe mindestens eine', () => {
    for (const style of STYLE_IDS) {
      const forms = stylesCompositions(style);
      expect(forms.length, style).toBeGreaterThanOrEqual(4);
      expect(forms.length, style).toBeLessThanOrEqual(8);
      for (const size of ['small', 'medium', 'large', 'huge'] as const) expect(compositionsFor(style, size).length, `${style}/${size}`).toBeGreaterThan(0);
    }
  });

  it('jede Bauform hat Beschriftung, Kurzbeschreibung und gehört zu mindestens einem Stil', () => {
    for (const id of COMPOSITIONS) {
      if (id === 'auto') continue;
      const info = COMPOSITION_INFO[id];
      expect(info.label.length, id).toBeGreaterThan(3);
      expect(info.summary.length, id).toBeGreaterThan(20);
      expect(STYLE_IDS.some((s) => stylesCompositions(s).includes(id)), id).toBe(true);
    }
  });
});

describe('Kaskade statt Kiste', () => {
  it('ab „mittel“ hat ein Haus mindestens zwei Baumassen (außer Pagode und Engawa-Haus mit eigenem Aufbau)', () => {
    let total = 0;
    let cascade = 0;
    for (const style of STYLE_IDS)
      for (const size of ['medium', 'large', 'huge'] as const)
        for (const seed of [1, 2, 3, 4]) {
          const { house } = build(style, size, seed);
          const plan = house!.plan;
          total++;
          const masses = plan.masses.length + (plan.masses[0]!.setback || plan.masses[0]!.upper ? 1 : 0);
          if (masses >= 2 || plan.input.porchKind === 'engawa' || plan.input.porch) cascade++;
        }
    expect(cascade / total).toBeGreaterThanOrEqual(0.9);
  });

  it('Nebenbaukörper bleiben unter First und Traufe des Hauptbaus und stehen nie bündig vor der Front', () => {
    for (const style of STYLE_IDS)
      for (const size of ['medium', 'large'] as const)
        for (const seed of [1, 2, 3]) {
          const { house } = build(style, size, seed);
          const { plan, roof } = house!;
          const main = plan.masses[0]!;
          const mainRidge = roof.ridgeY[main.id] ?? Math.max(roof.ridgeY[`${main.id}-gable`] ?? -Infinity);
          for (const m of plan.masses) {
            if (m === main || m.kind === 'tower') continue;
            const where = `${style}/${size}/${seed} ${m.id}`;
            expect(wallTopOf(plan, m), where).toBeLessThanOrEqual(wallTopOf(plan, main));
            const ridge = roof.ridgeY[m.id];
            if (ridge !== undefined && mainRidge > -Infinity) expect(ridge, where).toBeLessThan(mainRidge);
            // In front of the main body only with a clear step (research 19 T1: ≥ 2).
            if (m.rect.z0 < main.rect.z0) expect(main.rect.z0 - m.rect.z0, where).toBeGreaterThanOrEqual(2);
          }
        }
  });

  it('Türme überragen den First deutlich', () => {
    for (const style of ['medieval', 'rustic', 'mediterranean'] as const)
      for (const composition of ['stair_tower', 'chapel', 'villa_tower'] as const) {
        const { house, model } = build(style, 'large', 1, { composition });
        const { plan, roof } = house!;
        const tower = plan.masses.find((m) => m.kind === 'tower' && !m.round);
        if (!tower) continue;
        const mainRidge = roof.ridgeY[plan.masses[0]!.id]!;
        expect(wallTopOf(plan, tower), `${style}/${composition}`).toBeGreaterThanOrEqual(mainRidge + 2);
        expect(model.dimensions.height).toBeGreaterThan(wallTopOf(plan, tower));
      }
  });
});

describe('Jede Bauform in jedem Stil', () => {
  it('baut ohne Validator-Reparatur und ohne Befund der Bau-Lints', () => {
    const problems: string[] = [];
    for (const style of STYLE_IDS)
      for (const id of COMPOSITIONS) {
        if (id === 'auto') continue;
        const { model, repairs, house } = build(style, 'medium', 1, { composition: id });
        const lints = lintHouse(model, house!);
        if (repairs.length > 0 || lints.length > 0) problems.push(`${style}/${id}: ${repairs.length} Reparaturen, ${lints.map((l) => l.rule).join(', ')}`);
        expect(house!.plan.input.composition?.id).toBe(id);
      }
    expect(problems).toEqual([]);
  });

  it('eine stilfremde Bauform wird gebaut und mit Hinweis gemeldet', () => {
    const { notes, house } = build('medieval', 'medium', 1, { composition: 'pagoda' });
    expect(house!.plan.input.composition?.id).toBe('pagoda');
    expect(notes.some((n) => n.includes('Pagode') && n.includes('ungewöhnlich'))).toBe(true);
  });
});

describe('Manuelle Optionen haben Vorrang', () => {
  it('Maße, Turm und Flügel aus den Feinparametern schlagen den Archetyp', () => {
    const chapel = build('rustic', 'large', 1, { composition: 'chapel' }).house!.plan;
    expect(chapel.masses.some((m) => m.kind === 'tower')).toBe(true);
    const noTower = build('rustic', 'large', 1, { composition: 'chapel', tower: 'none', width: 15, depth: 9 }).house!.plan;
    expect(noTower.masses.some((m) => m.kind === 'tower')).toBe(false);
    expect(noTower.input.width).toBe(15);
    expect(noTower.input.depth).toBe(9);
    const wing = build('medieval', 'medium', 1, { composition: 'cross_gable', wings: 'L' }).house!.plan;
    expect(wing.masses.some((m) => m.kind === 'wing')).toBe(true);
    expect(wing.masses.some((m) => m.kind === 'cross')).toBe(true);
  });

  it('gleiche Eingabe ergibt dasselbe Modell', () => {
    const a = build('japanese', 'large', 7, { composition: 'pagoda' }).model;
    const b = build('japanese', 'large', 7, { composition: 'pagoda' }).model;
    expect(a.hash).toBe(b.hash);
  });
});

describe('Text → Bauform', () => {
  const cases: [string, CompositionId][] = [
    ['Ein schmales Stadthaus', 'town_house'],
    ['Kapelle mit Turm', 'chapel'],
    ['Japanische Pagode', 'pagoda'],
    ['Hexenhaus im Wald', 'witch_house'],
    ['Blockhütte in den Bergen', 'log_cabin'],
    ['Wikinger-Langhaus', 'longhouse'],
    ['Fachwerkhaus mit Zwerchgiebel', 'cross_gable'],
  ];
  it.each(cases)('„%s“ → %s', (text, id) => {
    expect(parseDescription(text).patch.options?.composition).toBe(id);
  });

  it('„Pagode“ setzt weiterhin Stil und Dachform', () => {
    const { patch } = parseDescription('Japanische Pagode');
    expect(patch.style).toBe('japanese');
    expect(patch.options?.roofType).toBe('pagoda');
  });
});
