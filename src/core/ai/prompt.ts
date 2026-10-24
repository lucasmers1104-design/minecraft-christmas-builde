import { selectFewShotExamples } from '@/core/ai/fewShot';
import type { FewShotExample } from '@/core/ai/fewShotExamples';
import { completePlan, PLAN_LIMITS, PLAN_MATERIAL_ROLES, PLAN_MATERIALS, PLAN_VALUE_LABELS, type PlanField } from '@/core/ai/planSchema';
import { DOOR_FAMILIES, LANTERN_DENSITIES, SYMMETRIES, TOWER_KINDS, TOWER_POSITIONS, WINDOW_DENSITIES, WINDOW_FAMILIES, WING_LAYOUTS, ANNEX_SIDES } from '@/core/schema/buildOptions';
import { BUILD_SIZES } from '@/core/schema/buildSpec';
import { getMaterial } from '@/core/style/materials';
import { PALETTES } from '@/core/style/palettes';
import { ROOF_PROFILES, ROOF_TYPES, STYLE_IDS, STYLES } from '@/core/style/styles';
import { COMPOSITION_INFO, stylesCompositions } from '@/core/style/compositions';

/**
 * Prompt for the local planner: the style catalogue with the style descriptions as
 * "function documentation", the plan schema as text (generated from the same catalogue as
 * the JSON schema), the rules, and 2–4 curated examples chosen by keyword overlap.
 * The model only makes catalogue decisions – no coordinates, no block ids.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** "value (deutsches Label)" list of an enum field. */
function values(field: PlanField, list: readonly (string | number)[]): string {
  const labels = PLAN_VALUE_LABELS[field] ?? {};
  return list.map((v) => (labels[String(v)] && labels[String(v)] !== String(v) ? `"${v}" (${labels[String(v)]})` : `"${v}"`)).join(', ');
}

export function styleCatalogText(): string {
  return STYLE_IDS.map((id) => {
    const s = STYLES[id];
    const palettes = s.palettes.map((p) => `"${p}" (${PALETTES.find((x) => x.id === p)?.label ?? p})`).join(', ');
    const forms = stylesCompositions(id)
      .map((c) => `"${c}"`)
      .join(', ');
    return `- "${id}" – ${s.label}: ${s.llm.description} Stichworte: ${s.llm.keywords.slice(0, 8).join(', ')}. Paletten: ${palettes}. Bauformen: ${forms}.`;
  }).join('\n');
}

export function planSchemaText(): string {
  const range = (k: keyof typeof PLAN_LIMITS) => `${PLAN_LIMITS[k].min}–${PLAN_LIMITS[k].max}`;
  const materials = PLAN_MATERIAL_ROLES.map((role) => {
    const field = `${role}Material`;
    return `- ${field}: "auto" oder ${PLAN_MATERIALS[role].map((id) => `"${id}" (${getMaterial(id).label})`).join(', ')}.`;
  }).join('\n');
  return `Alle Felder sind Pflicht. "auto" (bei Auswahlfeldern) bzw. null (bei Zahlen und Ja/Nein-Feldern) heißt: nicht angegeben, der Stil entscheidet.
- explanation: 1–2 kurze deutsche Sätze, was geplant ist.
- unsupported: Liste kurzer deutscher Stichworte für Wünsche, die der Generator nicht bauen kann (z. B. "Pool", "Garage", "Keller", "Möbel", "Brunnen", "Eiszapfen", "Schneemann", "zweites Gebäude"). Leere Liste, wenn alles umsetzbar ist.
- kind: "auto" oder "house" (Haus, Hütte, Villa, Tempel …), "tree" (freistehender Weihnachtsbaum), "market_stall" (Marktstand, Weihnachtsmarkt, Buden), "station" (Bahnhof), "tower" (freistehender Turm, Burgturm, Wachturm).
- style: "auto" oder ein Stil aus dem Stilkatalog.
- palette: "auto" oder eine Palette des gewählten Stils (nur wenn der Wunsch sie klar nahelegt).
- theme: "auto", "none" (ausdrücklich ohne Thema), "winter" (winterlich, verschneit, im Schnee), "christmas" (weihnachtlich, Advent, Weihnachtsmarkt).
- size: "auto" oder ${values('size', BUILD_SIZES)}.
- detailLevel: null oder 1 (schlicht), 2 (normal), 3 (festlich, viele Details).
- composition: Bauform (Anordnung der Baukörper), nur bei Häusern: "auto" oder ${Object.values(COMPOSITION_INFO)
    .map((c) => `"${c.id}" (${c.label}: ${c.summary})`)
    .join(', ')}. Nur setzen, wenn der Wunsch eine Bauform nennt oder klar nahelegt ("Stadthaus", "Kapelle", "Pagode", "Hexenhaus", "Blockhütte", "Langhaus" …).
- floors: null oder Geschosse ${range('floors')} (zweistöckig = 2).
- width, depth: null oder Grundfläche in Blöcken, ungerade, ${range('width')}. Nur bei ausdrücklichen Maßen („15 x 11“ = width 15, depth 11).
- roofType: "auto" oder ${values('roofType', ROOF_TYPES)}. Kein Pultdach im Katalog.
- roofProfile: "auto" oder ${values('roofProfile', ROOF_PROFILES)}.
- overhang: null oder Dachüberstand ${range('overhang')} Blöcke ("großer Überstand" = 2).
- dormers: null oder Anzahl Gauben ${range('dormers')} ("ohne Gauben" = 0, "Gauben" ohne Zahl = 2).
- wings: "auto" oder ${values('wings', WING_LAYOUTS)}.
- annex: "auto" oder ${values('annex', ANNEX_SIDES)} (Anbau an einer Seite).
- tower: "auto" oder ${values('tower', TOWER_KINDS)} (Turm am Haus).
- towerPosition: "auto" oder ${values('towerPosition', TOWER_POSITIONS)}.
- symmetry: ${values('symmetry', SYMMETRIES)}. "Cottage" ohne weitere Angabe = "asymmetric".
- windows: "auto" oder ${values('windows', WINDOW_DENSITIES)}.
- windowFamily: ${values('windowFamily', WINDOW_FAMILIES)}.
- doorFamily: ${values('doorFamily', DOOR_FAMILIES)}.
- porch (Veranda/Vordach), balcony (Balkon), chimney (Schornstein/Kamin), oriel (Erker), jetty (vorkragendes Obergeschoss), garden (Garten, Hecke, Zaun): true, false oder null.
- lanternDensity: "auto" oder ${values('lanternDensity', LANTERN_DENSITIES)}.
- soulLanterns (Seelenlaternen), garland (Girlanden, Lichterketten), christmasTree (Weihnachtsbaum neben einem Haus), presents (Geschenke), snow (Schnee auf dem Dach): true, false oder null.
${materials}`;
}

export function plannerSystemPrompt(): string {
  return `Du bist der Planer eines Minecraft-Bauwerksgenerators (Java Edition 1.21.11, nur Vanilla-Blöcke).
Du setzt selbst KEINE Blöcke. Du übersetzt den deutschen Wunsch des Nutzers in einen Bauplan aus festen Katalogwerten; Geometrie, Blöcke und Details erzeugt der regelbasierte Generator.
Antworte ausschließlich mit einem JSON-Objekt nach dem Schema unten, ohne Text davor oder danach.

## Stilkatalog (Feld style)
${styleCatalogText()}

## Bauplan (alle Felder)
${planSchemaText()}

## Regeln
1. Keine Koordinaten, keine Block-IDs, keine zusätzlichen Felder. Nur Werte aus den Listen oben.
2. Setze nur, was der Wunsch sagt oder klar nahelegt (z. B. "Fachwerk" → style "medieval", "Pagode" → style "japanese" und roofType "pagoda", "Villa" → "modern", "toskanisch" → "mediterranean"). Alles andere bleibt "auto" bzw. null – der Stil ergänzt es.
3. Verneinungen beachten: "ohne X" / "kein X" → false, 0 oder "none".
4. Winter ist ein Thema, kein Schnee: snow nur true, wenn ausdrücklich Schnee auf dem Dach, ein verschneites Dach oder "mit Schnee" gewünscht ist.
5. Ein Weihnachtsbaum bei einem Haus → kind "house" und christmasTree true. Nur ein Baum allein → kind "tree".
6. Ein Turm am Haus → tower; ein freistehender Turm → kind "tower".
7. Was der Generator nicht bauen kann (Pool, Garage, Keller, Möbel, Brunnen, Tiere, Figuren, ein zweites Gebäude …), kommt in unsupported – nichts weglassen, nichts erfinden.
8. explanation kurz und auf Deutsch.`;
}

/** The user turn for one wish (same format in the examples and the real request). */
export function wishMessage(description: string): string {
  return `Wunsch: """${description.trim()}"""`;
}

/** Few-shot example as a pair of chat turns (the answer is the complete plan as JSON). */
export function exampleMessages(example: FewShotExample): ChatMessage[] {
  return [
    { role: 'user', content: wishMessage(example.wish) },
    { role: 'assistant', content: JSON.stringify(completePlan(example.plan)) },
  ];
}

export interface PlannerPrompt {
  messages: ChatMessage[];
  /** Ids of the few-shot examples used (for reports). */
  exampleIds: string[];
}

/** System prompt, 2–4 matching few-shot pairs, then the wish. */
export function plannerMessages(description: string, examples: readonly FewShotExample[] = selectFewShotExamples(description)): PlannerPrompt {
  return {
    messages: [{ role: 'system', content: plannerSystemPrompt() }, ...examples.flatMap(exampleMessages), { role: 'user', content: wishMessage(description) }],
    exampleIds: examples.map((e) => e.id),
  };
}
