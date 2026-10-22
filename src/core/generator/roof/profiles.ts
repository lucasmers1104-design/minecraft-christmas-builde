import type { RoofProfile } from '@/core/style/styles';

/**
 * Roof profiles as Δ sequences: the rise (in half blocks) of each roof column from the eave
 * towards the ridge (research report, "Neigung, First, Überstand"; the curved profiles are
 * derived, not taken from a tested build):
 *
 *   45° standard 2,2,2,…   63° steep 4,4,4,…   ≈26.6° shallow 1,1,1,…
 *   flared eave 1,1, then 2,2,…   bell-cast (concave) 1,1,2,2,2,4,4   convex 4,4,2,2,1,1
 *   ogee 1,1,2,4,4,2,1,1 (large roofs only)   mansard 4,4,4 then 1,1
 *
 * Stairs need an even top (a stair always rises from x.5 to x+1); `normalizeDeltas` fixes the
 * parity by turning a Δ into Δ±1 (Δ=3 = top slab + stairs).
 */

export type ProfileName = RoofProfile | 'mansard';

/** Fractions of the slope taken by each Δ, eave first. */
function split(n: number, parts: readonly (readonly [delta: number, fraction: number])[]): number[] {
  const counts = parts.map(([, f]) => Math.round(f * n));
  let diff = n - counts.reduce((a, b) => a + b, 0);
  // Fix rounding on the largest part.
  const largest = counts.indexOf(Math.max(...counts));
  while (diff !== 0) {
    counts[largest] = counts[largest]! + Math.sign(diff);
    diff -= Math.sign(diff);
  }
  return parts.flatMap(([delta], i) => Array.from({ length: Math.max(0, counts[i]!) }, () => delta));
}

/** Raw Δ sequence for `n` slope columns (eave → ridge, ridge column excluded). */
export function rawDeltas(profile: ProfileName, n: number): number[] {
  if (n <= 0) return [];
  switch (profile) {
    case 'standard':
      return Array.from({ length: n }, () => 2);
    case 'steep':
      return Array.from({ length: n }, () => 4);
    case 'shallow':
      return Array.from({ length: n }, () => 1);
    case 'flared':
      return n <= 2 ? Array.from({ length: n }, () => 2) : [1, 1, ...Array.from({ length: n - 2 }, () => 2)];
    case 'bell':
      return n < 4 ? rawDeltas('flared', n) : split(n, [[1, 0.28], [2, 0.42], [4, 0.3]]);
    case 'convex':
      return n < 4 ? rawDeltas('standard', n) : split(n, [[4, 0.34], [2, 0.38], [1, 0.28]]);
    case 'ogee':
      // Needs room: below 7 columns it reads as "a strange mixture of pitches" (wiki).
      return n < 7 ? rawDeltas('bell', n) : split(n, [[1, 0.2], [2, 0.15], [4, 0.3], [2, 0.15], [1, 0.2]]);
    case 'mansard': {
      const steep = Math.max(1, Math.min(n - 1, Math.round(n * 0.4)));
      return [...Array.from({ length: steep }, () => 4), ...Array.from({ length: n - steep }, () => 1)];
    }
  }
}

/** Makes every column whose Δ ≥ 2 end on an even top (stairs). */
export function normalizeDeltas(deltas: readonly number[]): number[] {
  const out: number[] = [];
  let t = 0;
  for (const d of deltas) {
    let delta = d;
    if (delta >= 2 && (t + delta) % 2 === 1) delta = delta >= 3 ? delta - 1 : delta + 1;
    out.push(delta);
    t += delta;
  }
  return out;
}

/**
 * Caps the total rise (half blocks). The rule "rise per roof section ≤ 7 blocks" keeps big
 * roofs from becoming top-heavy; steep columns are softened from the ridge downwards, so the
 * eave keeps its character.
 */
export function capRise(deltas: readonly number[], maxHalfBlocks: number, concave = false): number[] {
  let out = normalizeDeltas(deltas);
  const sum = () => out.reduce((a, b) => a + b, 0);
  // Concave profiles (bell, flared) keep their shape: two eave-side 2s become 1s (parity
  // stays), then the lowest 4 becomes a 2 – the deltas keep rising towards the ridge.
  while (concave && sum() > maxHalfBlocks) {
    const first = out.indexOf(2);
    const second = first < 0 ? -1 : out.indexOf(2, first + 1);
    if (second >= 0) {
      out[first] = 1;
      out[second] = 1;
      continue;
    }
    const four = out.indexOf(4);
    if (four < 0) break;
    out[four] = 2;
  }
  // Each step softens one column and re-normalises (parity fixes may add a half block).
  for (let guard = 0; sum() > maxHalfBlocks && guard < 4 * out.length + 8; guard++) {
    let i = -1;
    for (let j = out.length - 1; j >= 0 && i < 0; j--) if (out[j]! > 1) i = j;
    if (i < 0) break;
    out[i] = out[i]! >= 4 ? 2 : 1;
    out = normalizeDeltas(out);
  }
  return out;
}

export function profileDeltas(profile: ProfileName, n: number, maxRiseBlocks = 7): number[] {
  return capRise(normalizeDeltas(rawDeltas(profile, n)), maxRiseBlocks * 2, profile === 'bell' || profile === 'flared');
}

export type PieceKind = 'stairs' | 'slab_bottom' | 'slab_top' | 'full';

export interface Piece {
  /** Block row relative to the roof base (0 = base y). */
  y: number;
  kind: PieceKind;
}

/**
 * Blocks of one roof column whose top is `t` half blocks above the base, coming from a lower
 * neighbour column with top `tPrev` (the column algorithm of the notes). The gap between
 * both is closed: full blocks per whole block, a top slab for an odd remainder.
 */
export function columnPieces(tPrev: number, t: number): Piece[] {
  const delta = t - tPrev;
  if (delta <= 0) return [];
  if (delta === 1) return [t % 2 === 1 ? { y: (t - 1) / 2, kind: 'slab_bottom' } : { y: t / 2 - 1, kind: 'slab_top' }];
  if (t % 2 === 1) throw new Error(`Treppenspalte mit ungerader Oberkante ${t} (Profil nicht normalisiert)`);
  const pieces: Piece[] = [{ y: t / 2 - 1, kind: 'stairs' }];
  const fillTop = t - 2; // half-block level of the stair's bottom
  if (tPrev % 2 === 1 && fillTop > tPrev) {
    pieces.push({ y: (tPrev - 1) / 2, kind: 'slab_top' });
    for (let y = (tPrev + 1) / 2; y * 2 < fillTop; y++) pieces.push({ y, kind: 'full' });
  } else {
    for (let y = tPrev / 2; y * 2 < fillTop; y++) pieces.push({ y, kind: 'full' });
  }
  return pieces;
}

/** Cumulative tops t_i for a Δ sequence. */
export function tops(deltas: readonly number[]): number[] {
  const out: number[] = [];
  let t = 0;
  for (const d of deltas) {
    t += d;
    out.push(t);
  }
  return out;
}
