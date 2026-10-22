import { DEFAULT_FEW_SHOT_IDS, FEW_SHOT_EXAMPLES, type FewShotExample } from '@/core/ai/fewShotExamples';

/**
 * Picks the few-shot examples for one request by keyword overlap (deterministic): examples
 * sharing more keyword stems with the wish come first, near-duplicates (same building type
 * and style) are skipped while there are alternatives, and general default examples fill up
 * to the minimum.
 */

const fold = (s: string) => s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');

export interface FewShotOptions {
  min?: number;
  max?: number;
}

export function fewShotScore(example: FewShotExample, description: string): number {
  const text = fold(description);
  return new Set(example.keywords.map(fold).filter((k) => k.length >= 3 && text.includes(k))).size;
}

export function selectFewShotExamples(description: string, { min = 2, max = 3 }: FewShotOptions = {}): FewShotExample[] {
  const lo = Math.max(0, Math.min(min, 4));
  const hi = Math.max(lo, Math.min(max, 4));
  const ranked = FEW_SHOT_EXAMPLES.map((example, index) => ({ example, index, score: fewShotScore(example, description) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const chosen: FewShotExample[] = [];
  const signature = (e: FewShotExample) => `${e.plan.kind ?? 'auto'}|${e.plan.style ?? 'auto'}`;
  for (const r of ranked) {
    if (chosen.length >= hi) break;
    if (chosen.some((c) => signature(c) === signature(r.example))) continue;
    chosen.push(r.example);
  }
  // Near-duplicates are fine if nothing else matched.
  for (const r of ranked) {
    if (chosen.length >= hi) break;
    if (!chosen.includes(r.example)) chosen.push(r.example);
  }
  for (const id of DEFAULT_FEW_SHOT_IDS) {
    if (chosen.length >= lo) break;
    const example = FEW_SHOT_EXAMPLES.find((e) => e.id === id);
    if (example && !chosen.includes(example)) chosen.push(example);
  }
  return chosen;
}
