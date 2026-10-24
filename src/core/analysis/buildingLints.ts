import { VECTOR, type HorizontalDirection } from '@/core/blocks/directions';
import { AIR, blockIdOf, definitionOf, propsOf } from '@/core/blocks/registry';
import { PaletteGrid, resolveStates } from '@/core/blocks/stateResolver';
import type { HouseResult } from '@/core/generator/house/buildHouse';
import { floorY, joinedAt, storeyRect } from '@/core/generator/house/plan';
import { coveredColumns, facadeOf, facadePos } from '@/core/generator/house/walls';
import { planRoofs } from '@/core/generator/roof/roofEngine';
import { blockAt, type VoxelModel } from '@/core/schema/voxelModel';

/**
 * Automatic checks of a generated building (phase 8, research report "Abnahme"): structure
 * (nothing floating, resolver is a fixpoint, doors and windows free, roofs closed) and
 * aesthetics (no flat wall area wider than 5 blocks without a depth change, overhang ≥ 1,
 * rise per roof section ≤ 7, a lantern at every entrance).
 */

export interface LintIssue {
  rule: string;
  message: string;
}

/**
 * Non-air blocks not connected to the ground layer. Blocks touching along an edge count as
 * connected (18-neighbourhood): stair roofs rise diagonally, each row touching the next one
 * along an edge – closed in the game and to the eye.
 */
const NEIGHBOURS_18: readonly [number, number, number][] = (() => {
  const out: [number, number, number][] = [];
  for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++)
      for (let dz = -1; dz <= 1; dz++) {
        const n = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
        if (n === 1 || n === 2) out.push([dx, dy, dz]);
      }
  return out;
})();

export function floatingBlocks(model: Pick<VoxelModel, 'dimensions' | 'palette' | 'indices'>): number {
  const { width: W, height: H, length: L } = model.dimensions;
  const seen = new Uint8Array(W * H * L);
  const stack: number[] = [];
  const airIndex = model.palette.indexOf(AIR);
  for (let z = 0; z < L; z++)
    for (let x = 0; x < W; x++) {
      const i = x + W * z;
      if (model.indices[i] !== airIndex) {
        seen[i] = 1;
        stack.push(i);
      }
    }
  while (stack.length > 0) {
    const i = stack.pop()!;
    const x = i % W;
    const z = Math.floor(i / W) % L;
    const y = Math.floor(i / (W * L));
    for (const [dx, dy, dz] of NEIGHBOURS_18) {
      const nx = x + dx;
      const ny = y + dy;
      const nz = z + dz;
      if (nx < 0 || ny < 0 || nz < 0 || nx >= W || ny >= H || nz >= L) continue;
      const j = nx + W * (nz + L * ny);
      if (seen[j] || model.indices[j] === airIndex) continue;
      seen[j] = 1;
      stack.push(j);
    }
  }
  let floating = 0;
  for (let i = 0; i < model.indices.length; i++) if (model.indices[i] !== airIndex && !seen[i]) floating++;
  return floating;
}

/** Running the resolver again must not change anything (WorldEdit neighbour updates). */
export function resolverChanges(model: VoxelModel): number {
  const grid = new PaletteGrid(model.dimensions, model.palette, model.indices.slice());
  resolveStates(grid);
  let changes = 0;
  for (let i = 0; i < model.indices.length; i++) if (grid.palette[grid.indices[i]!] !== model.palette[model.indices[i]!]) changes++;
  return changes;
}

const DECOR_DEPTH_MAX = 2;

/**
 * Outermost depth (+2 … −1) at which a facade cell is occupied and the shape class of that
 * block: a lattice of fences in front of glass is not flat even if it is in one plane.
 */
function depthAt(model: VoxelModel, side: HorizontalDirection, u: number, y: number, rect: ReturnType<typeof storeyRect>): string {
  const f = facadeOf(rect, side);
  for (let d = DECOR_DEPTH_MAX; d >= -1; d--) {
    const p = facadePos(f, u, d);
    const state = blockAt(model, p.x, y, p.z);
    if (state !== AIR) return `${d}:${definitionOf(state).shape}`;
  }
  return 'none';
}

export function lintHouse(model: VoxelModel, house: HouseResult): LintIssue[] {
  const issues: LintIssue[] = [];
  const { plan, sections, roof, openings } = house;

  const floating = floatingBlocks(model);
  if (floating > 0) issues.push({ rule: 'schwebend', message: `${floating} Blöcke ohne Verbindung zum Boden` });
  const changes = resolverChanges(model);
  if (changes > 0) issues.push({ rule: 'fixpunkt', message: `Ein zweiter Resolver-Lauf ändert ${changes} Blöcke` });

  // Flat walls: every 6-wide stretch of a storey's wall must contain a depth change.
  for (const mass of plan.masses) {
    if (mass.round) continue;
    for (let k = 0; k < mass.floors; k++) {
      const rect = storeyRect(mass, k);
      const y0 = floorY(plan, k) + 1;
      const y1 = floorY(plan, k + 1) - 1;
      for (const side of ['north', 'east', 'south', 'west'] as const) {
        if (joinedAt(plan, mass, side, k)) continue;
        const f = facadeOf(rect, side);
        // Parts with another mass in front (cross gable, wing, annex) are no facade.
        const covered = coveredColumns(plan, mass, side, k);
        const depth: string[][] = [];
        for (let u = 0; u < f.length; u++) {
          const column: string[] = [];
          for (let y = y0; y <= y1; y++) column.push(depthAt(model, side, u, y, rect));
          depth.push(column);
        }
        for (let u = 0; u + 6 <= f.length; u++) {
          if ([0, 1, 2, 3, 4, 5].some((i) => covered.has(u + i))) continue;
          const first = depth[u]![0];
          const flat = depth.slice(u, u + 6).every((col) => col.every((d) => d === first));
          if (flat) {
            issues.push({ rule: 'flache-wand', message: `${mass.id} Geschoss ${k} ${side}: Wandfläche ab Spalte ${u} breiter als 5 ohne Tiefensprung` });
            break;
          }
        }
      }
    }
  }

  for (const s of sections) {
    const main = plan.masses.find((m) => m.id === s.id);
    if (!main) continue;
    // Overhang ≥ 1 (modern flat roofs may sit flush with a parapet).
    if (s.overhang < 1 && s.type !== 'flat') issues.push({ rule: 'ueberstand', message: `${s.id}: Dachüberstand ${s.overhang}` });
    // Rise per section ≤ the style's cap (+1 for the ridge piece); towers and A-frames excluded.
    // Shed roofs of annexes need their minimum slope and are only held to the general 7.
    if (main.kind !== 'tower' && s.type !== 'a_frame' && s.type !== 'flat') {
      const rise = planRoofs([s]).topY - s.wallTop;
      const cap = s.type === 'shed' ? 7 : (s.maxRise ?? 7);
      if (rise > cap + 1) issues.push({ rule: 'anstieg', message: `${s.id}: Dachanstieg ${rise} Blöcke` });
    }
    // Closed roof: every column of the footprint (incl. overhang) carries roof blocks.
    for (let x = s.x0 - s.overhang; x <= s.x1 + s.overhang; x++)
      for (let z = s.z0 - s.overhang; z <= s.z1 + s.overhang; z++) {
        if (!roof.surface.has(`${x},${z}`)) {
          issues.push({ rule: 'dachluecke', message: `${s.id}: keine Dachdeckung bei ${x},${z}` });
          x = Infinity;
          break;
        }
      }
  }

  // A house without a door (all templates rejected) is a fault, not a style.
  if (openings.doors.length === 0) issues.push({ rule: 'eingang', message: 'Keine Tür gesetzt' });
  // Doors: both halves present, free in front (2) and behind (1).
  for (const d of openings.doors) {
    const lower = blockAt(model, d.x, d.y, d.z);
    const upper = blockAt(model, d.x, d.y + 1, d.z);
    if (definitionOf(lower).shape !== 'door' || propsOf(lower).half !== 'lower' || blockIdOf(upper) !== blockIdOf(lower)) {
      issues.push({ rule: 'tuer', message: `Tür bei ${d.x},${d.y},${d.z} unvollständig (${lower})` });
      continue;
    }
    const [ox, , oz] = VECTOR[d.outward];
    for (const dist of [1, 2, -1])
      for (const dy of [0, 1]) {
        const s = blockAt(model, d.x + ox * dist, d.y + dy, d.z + oz * dist);
        if (s !== AIR && !s.includes('_carpet') && !s.includes('_door')) issues.push({ rule: 'tuer-frei', message: `Vor/hinter der Tür bei ${d.x},${d.y},${d.z} steht ${s}` });
      }
    if (plan.input.lanternDensity !== 'none') {
      let found = false;
      for (let dx = -4; dx <= 4 && !found; dx++)
        for (let dz = -4; dz <= 4 && !found; dz++)
          for (let dy = -1; dy <= 4 && !found; dy++) if (blockIdOf(blockAt(model, d.x + dx, d.y + dy, d.z + dz)).endsWith('lantern')) found = true;
      if (!found) issues.push({ rule: 'laterne-eingang', message: `Keine Laterne am Eingang ${d.x},${d.y},${d.z}` });
    }
  }
  return issues;
}
