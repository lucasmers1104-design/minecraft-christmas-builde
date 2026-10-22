import { AIR, blockIdOf, checkBlockState, definitionOf, propsOf } from '@/core/blocks/registry';
import { PaletteGrid, resolveStates, type Region } from '@/core/blocks/stateResolver';
import { validateAndRepair } from '@/core/blocks/validator';
import { createVoxelModel, isInside, linearIndex, type VoxelModel } from '@/core/schema/voxelModel';

/**
 * Manual block editing on the canonical VoxelModel. Every operation returns a new, fully
 * validated and re-hashed model, so preview, material list, persistence and export keep
 * reading one single source of truth. Commands store before/after block states (not palette
 * indices), so they stay valid across palette re-canonicalisation.
 *
 * Every command already contains the consequences of the edit: after the user's change the
 * state resolver runs around the changed cells (stairs corners, fence/pane/wall connections,
 * door halves, leaves) and the validator repairs what the game would break. All resulting
 * cell changes are stored in the command, so undo restores the previous model exactly.
 */

export interface CellChange {
  index: number;
  before: string;
  after: string;
}

export interface EditCommand {
  label: string;
  changes: CellChange[];
  /** Automatic repairs made with the edit (shown to the user). */
  notes?: string[];
}

export class EditError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EditError';
  }
}

export interface Cell {
  x: number;
  y: number;
  z: number;
}

function stateAtIndex(model: VoxelModel, index: number): string {
  return model.palette[model.indices[index]!]!;
}

function requireValidState(state: string, minecraftVersion?: string): void {
  const check = checkBlockState(state, minecraftVersion);
  if (!check.ok) throw new EditError(check.reason);
}

function requireInside(model: VoxelModel, cell: Cell): number {
  if (!isInside(model.dimensions, cell.x, cell.y, cell.z)) {
    const d = model.dimensions;
    throw new EditError(`Position (${cell.x}, ${cell.y}, ${cell.z}) liegt außerhalb des Volumens ${d.width}×${d.height}×${d.length}`);
  }
  return linearIndex(model.dimensions, cell.x, cell.y, cell.z);
}

/** Both halves of a door go together, like in the game. */
function withDoorPartners(model: VoxelModel, changes: Map<number, string>): void {
  const layer = model.dimensions.width * model.dimensions.length;
  for (const [index, after] of [...changes]) {
    const before = stateAtIndex(model, index);
    if (before === AIR || definitionOf(before).shape !== 'door' || blockIdOf(after) === blockIdOf(before)) continue;
    const partner = propsOf(before).half === 'lower' ? index + layer : index - layer;
    if (partner < 0 || partner >= model.indices.length || changes.has(partner)) continue;
    if (blockIdOf(stateAtIndex(model, partner)) === blockIdOf(before)) changes.set(partner, AIR);
  }
}

/**
 * Applies the user's cell changes to a copy, resolves neighbour states and repairs around
 * them, and returns every cell that differs from the model as one command.
 */
function resolvedCommand(model: VoxelModel, userChanges: Map<number, string>, label: string): EditCommand | null {
  if (userChanges.size === 0) return null;
  withDoorPartners(model, userChanges);
  const grid = new PaletteGrid(model.dimensions, model.palette, model.indices.slice());
  const { width, length, height } = model.dimensions;
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const [index, state] of userChanges) {
    const x = index % width;
    const z = Math.floor(index / width) % length;
    const y = Math.floor(index / (width * length));
    grid.set(x, y, z, state);
    min.x = Math.min(min.x, x);
    min.y = Math.min(min.y, y);
    min.z = Math.min(min.z, z);
    max.x = Math.max(max.x, x);
    max.y = Math.max(max.y, y);
    max.z = Math.max(max.z, z);
  }
  const grow = (by: number): Region => ({
    min: { x: min.x - by, y: min.y - by, z: min.z - by },
    max: { x: max.x + by, y: max.y + by, z: max.z + by },
  });
  // Neighbours of changed cells may change too (connections, corners, a wall below).
  resolveStates(grid, grow(1));
  const repairs = validateAndRepair(grid, model.spec.targetMinecraftVersion, grow(1));
  if (repairs.length > 0) resolveStates(grid, grow(2));
  // Leaves distances can change up to 7 blocks away; collect every difference in that area.
  const area = grow(8);
  const changes: CellChange[] = [];
  for (let y = Math.max(0, area.min.y); y <= Math.min(height - 1, area.max.y); y++)
    for (let z = Math.max(0, area.min.z); z <= Math.min(length - 1, area.max.z); z++)
      for (let x = Math.max(0, area.min.x); x <= Math.min(width - 1, area.max.x); x++) {
        const index = linearIndex(model.dimensions, x, y, z);
        const before = stateAtIndex(model, index);
        const after = grid.get(x, y, z);
        if (after !== before) changes.push({ index, before, after });
      }
  const notes = [...new Set(repairs.map((r) => r.reason))];
  // A repaired-away edit (e.g. a floating lantern) changes nothing but must still be explained.
  if (changes.length === 0) return notes.length > 0 ? { label, changes, notes } : null;
  return notes.length > 0 ? { label, changes, notes } : { label, changes };
}

/** Applies the "after" (or, with `reverse`, the "before") side of a command. */
export function applyCommand(model: VoxelModel, command: EditCommand, reverse = false): VoxelModel {
  if (command.changes.length === 0) return model;
  const palette = [...model.palette];
  const lookup = new Map(palette.map((s, i) => [s, i]));
  const indices = model.indices.slice();
  for (const change of command.changes) {
    const expected = reverse ? change.after : change.before;
    const target = reverse ? change.before : change.after;
    if (change.index < 0 || change.index >= indices.length) throw new EditError(`Index ${change.index} außerhalb des Modells`);
    if (stateAtIndex(model, change.index) !== expected) {
      throw new EditError('Bearbeitung passt nicht mehr zum aktuellen Modell (Zustand wurde zwischenzeitlich verändert)');
    }
    requireValidState(target, model.spec.targetMinecraftVersion);
    let p = lookup.get(target);
    if (p === undefined) {
      p = palette.length;
      palette.push(target);
      lookup.set(target, p);
    }
    indices[change.index] = p;
  }
  return createVoxelModel(model.spec, model.dimensions, palette, indices);
}

export function setBlockCommand(model: VoxelModel, cell: Cell, state: string): EditCommand | null {
  requireValidState(state, model.spec.targetMinecraftVersion);
  const index = requireInside(model, cell);
  if (stateAtIndex(model, index) === state) return null;
  const label = state === AIR ? `Block bei (${cell.x}, ${cell.y}, ${cell.z}) entfernt` : `Block bei (${cell.x}, ${cell.y}, ${cell.z}) gesetzt`;
  return resolvedCommand(model, new Map([[index, state]]), label);
}

export function removeBlockCommand(model: VoxelModel, cell: Cell): EditCommand | null {
  return setBlockCommand(model, cell, AIR);
}

export function replaceAllCommand(model: VoxelModel, from: string, to: string): EditCommand | null {
  requireValidState(to, model.spec.targetMinecraftVersion);
  if (from === to) return null;
  const fromIndex = model.palette.indexOf(from);
  if (fromIndex === -1) return null;
  const changes = new Map<number, string>();
  for (let i = 0; i < model.indices.length; i++) {
    if (model.indices[i] === fromIndex) changes.set(i, to);
  }
  return resolvedCommand(model, changes, `${changes.size} × ${from} durch ${to} ersetzt`);
}

/** Fills (or clears, with air) the axis-aligned box between two cells. */
export function fillBoxCommand(model: VoxelModel, a: Cell, b: Cell, state: string): EditCommand | null {
  requireValidState(state, model.spec.targetMinecraftVersion);
  requireInside(model, a);
  requireInside(model, b);
  const changes = new Map<number, string>();
  for (let y = Math.min(a.y, b.y); y <= Math.max(a.y, b.y); y++)
    for (let z = Math.min(a.z, b.z); z <= Math.max(a.z, b.z); z++)
      for (let x = Math.min(a.x, b.x); x <= Math.max(a.x, b.x); x++) {
        const index = linearIndex(model.dimensions, x, y, z);
        if (stateAtIndex(model, index) !== state) changes.set(index, state);
      }
  return resolvedCommand(model, changes, `${changes.size} Blöcke ${state === AIR ? 'geleert' : 'gefüllt'}`);
}

export function blockAtCell(model: VoxelModel, cell: Cell): string {
  return stateAtIndex(model, requireInside(model, cell));
}

/** Undo/redo stack per variant (bounded). */
export class EditHistory {
  private undoStack: EditCommand[] = [];
  private redoStack: EditCommand[] = [];
  constructor(private readonly limit = 200) {}

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }
  get lastLabel(): string | null {
    return this.undoStack.at(-1)?.label ?? null;
  }

  /** Applies a new command; clears the redo stack. */
  execute(model: VoxelModel, command: EditCommand): VoxelModel {
    const next = applyCommand(model, command);
    this.undoStack.push(command);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
    return next;
  }

  undo(model: VoxelModel): VoxelModel {
    const command = this.undoStack.pop();
    if (!command) return model;
    const next = applyCommand(model, command, true);
    this.redoStack.push(command);
    return next;
  }

  redo(model: VoxelModel): VoxelModel {
    const command = this.redoStack.pop();
    if (!command) return model;
    const next = applyCommand(model, command);
    this.undoStack.push(command);
    return next;
  }
}
