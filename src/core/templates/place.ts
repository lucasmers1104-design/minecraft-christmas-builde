import { clockwise, type HorizontalDirection } from '@/core/blocks/directions';
import { AIR, blockState, profileBlockId } from '@/core/blocks/registry';
import { mirrorState, rotateState } from '@/core/blocks/transform';
import { Priority, type PriorityValue, type VoxelBuilder } from '@/core/generator/geometry';
import { formOf, type Form } from '@/core/style/materials';
import type { Role } from '@/core/style/palettes';
import type { FacadeTemplate, TemplateCell } from '@/core/templates/types';

/**
 * Places facade templates (designed for a south facade) on any facade: positions and states
 * are rotated to the facade's outward direction and optionally mirrored left/right.
 */

export interface FacadeFrame {
  /** World position of the template origin (x = 0, y = 0, d = 0). */
  origin: { x: number; y: number; z: number };
  /** Outward normal of the facade. */
  outward: HorizontalDirection;
  /** Mirror left/right (asymmetric details, door hinges). */
  mirror?: boolean;
}

/** Materials per role for one building (resolved palette). */
export type RoleMaterials = Readonly<Record<Role, string>>;

const TURNS_FROM_SOUTH: Readonly<Record<HorizontalDirection, number>> = { south: 0, west: 1, north: 2, east: 3 };

/** World offset of a canonical (x, d) step for a facade. */
function rotateVector(dx: number, dz: number, turns: number): [number, number] {
  let x = dx;
  let z = dz;
  for (let i = 0; i < turns; i++) [x, z] = [-z, x];
  return [x, z];
}

export function templateWidth(t: FacadeTemplate): { minX: number; maxX: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  for (const c of t.cells) {
    minX = Math.min(minX, c.x);
    maxX = Math.max(maxX, c.x);
  }
  return { minX, maxX };
}

/** World position of a template cell. */
export function cellPosition(t: FacadeTemplate, cell: Pick<TemplateCell, 'x' | 'y' | 'd'>, frame: FacadeFrame): { x: number; y: number; z: number } {
  const turns = TURNS_FROM_SOUTH[frame.outward];
  const cx = frame.mirror ? t.width - 1 - cell.x : cell.x;
  const [rx, rz] = rotateVector(1, 0, turns);
  const [ox, oz] = rotateVector(0, 1, turns);
  return {
    x: frame.origin.x + cx * rx + cell.d * ox,
    y: frame.origin.y + cell.y,
    z: frame.origin.z + cx * rz + cell.d * oz,
  };
}

/** Block state of a template cell for the given materials, rotated to the facade. */
export function cellState(cell: TemplateCell, frame: FacadeFrame, materials: RoleMaterials, minecraftVersion: string): string | null {
  if (cell.role === 'air' && !cell.block) return AIR;
  let id: string | null;
  if (cell.block) id = cell.block;
  else {
    const role: Role = cell.role === 'glass' ? 'window' : (cell.role as Role);
    const material = materials[role];
    const form: Form = cell.form ?? 'block';
    id = formOf(material, form);
    // Frames without logs (concrete trims) use the plain block.
    if (!id && form === 'pillar') id = formOf(material, 'block');
  }
  if (!id) return null;
  const props = { ...(cell.props ?? {}) };
  let state = blockState(profileBlockId(id, minecraftVersion), filterProps(id, props));
  if (frame.mirror) state = mirrorState(state, 'x');
  return rotateState(state, TURNS_FROM_SOUTH[frame.outward]);
}

/** Drops properties a block does not have (e.g. `axis` on a plain block used as frame). */
function filterProps(id: string, props: Record<string, string>): Record<string, string> {
  const probe = blockState(id);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(props)) if (probe.includes(`${k}=`)) out[k] = v;
  return out;
}

/** True if every cell in front of the wall (d ≥ 1) is free, so sills and shutters fit. */
export function templateFits(builder: VoxelBuilder, t: FacadeTemplate, frame: FacadeFrame): boolean {
  for (const cell of t.cells) {
    const p = cellPosition(t, cell, frame);
    if (!builder.inside(p.x, p.y, p.z)) return false;
    if (cell.d >= 1 && !builder.isAir(p.x, p.y, p.z)) return false;
  }
  return true;
}

export interface PlacedTemplate {
  cells: { x: number; y: number; z: number; state: string }[];
}

/** Writes a template. Openings and template parts override the wall (OPENING priority). */
export function placeTemplate(
  builder: VoxelBuilder,
  t: FacadeTemplate,
  frame: FacadeFrame,
  materials: RoleMaterials,
  minecraftVersion: string,
  priority: PriorityValue = Priority.OPENING,
): PlacedTemplate {
  const placed: PlacedTemplate = { cells: [] };
  for (const cell of t.cells) {
    const state = cellState(cell, frame, materials, minecraftVersion);
    if (state === null) continue;
    const p = cellPosition(t, cell, frame);
    if (!builder.inside(p.x, p.y, p.z)) continue;
    if (builder.setBlock(p.x, p.y, p.z, state, priority)) placed.cells.push({ ...p, state });
  }
  return placed;
}

/** Direction to the right when looking at a facade from outside (south facade → east). */
export function rightOf(outward: HorizontalDirection): HorizontalDirection {
  return clockwise(outward, -1);
}
