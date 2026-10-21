import { AIR, checkBlockState } from '@/core/blocks/registry';
import { createVoxelModel, isInside, linearIndex, type VoxelModel } from '@/core/schema/voxelModel';

/**
 * Manual block editing on the canonical VoxelModel. Every operation returns a new, fully
 * validated and re-hashed model, so preview, material list, persistence and export keep
 * reading one single source of truth. Commands store before/after block states (not palette
 * indices), so they stay valid across palette re-canonicalisation.
 */

export interface CellChange {
  index: number;
  before: string;
  after: string;
}

export interface EditCommand {
  label: string;
  changes: CellChange[];
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

function requireValidState(state: string): void {
  const check = checkBlockState(state);
  if (!check.ok) throw new EditError(check.reason);
}

function requireInside(model: VoxelModel, cell: Cell): number {
  if (!isInside(model.dimensions, cell.x, cell.y, cell.z)) {
    const d = model.dimensions;
    throw new EditError(`Position (${cell.x}, ${cell.y}, ${cell.z}) liegt außerhalb des Volumens ${d.width}×${d.height}×${d.length}`);
  }
  return linearIndex(model.dimensions, cell.x, cell.y, cell.z);
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
    requireValidState(target);
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
  requireValidState(state);
  const index = requireInside(model, cell);
  const before = stateAtIndex(model, index);
  if (before === state) return null;
  return {
    label: state === AIR ? `Block bei (${cell.x}, ${cell.y}, ${cell.z}) entfernt` : `Block bei (${cell.x}, ${cell.y}, ${cell.z}) gesetzt`,
    changes: [{ index, before, after: state }],
  };
}

export function removeBlockCommand(model: VoxelModel, cell: Cell): EditCommand | null {
  return setBlockCommand(model, cell, AIR);
}

export function replaceAllCommand(model: VoxelModel, from: string, to: string): EditCommand | null {
  requireValidState(to);
  if (from === to) return null;
  const fromIndex = model.palette.indexOf(from);
  if (fromIndex === -1) return null;
  const changes: CellChange[] = [];
  for (let i = 0; i < model.indices.length; i++) {
    if (model.indices[i] === fromIndex) changes.push({ index: i, before: from, after: to });
  }
  if (changes.length === 0) return null;
  return { label: `${changes.length} × ${from} durch ${to} ersetzt`, changes };
}

/** Fills (or clears, with air) the axis-aligned box between two cells. */
export function fillBoxCommand(model: VoxelModel, a: Cell, b: Cell, state: string): EditCommand | null {
  requireValidState(state);
  requireInside(model, a);
  requireInside(model, b);
  const changes: CellChange[] = [];
  for (let y = Math.min(a.y, b.y); y <= Math.max(a.y, b.y); y++)
    for (let z = Math.min(a.z, b.z); z <= Math.max(a.z, b.z); z++)
      for (let x = Math.min(a.x, b.x); x <= Math.max(a.x, b.x); x++) {
        const index = linearIndex(model.dimensions, x, y, z);
        const before = stateAtIndex(model, index);
        if (before !== state) changes.push({ index, before, after: state });
      }
  if (changes.length === 0) return null;
  return { label: `${changes.length} Blöcke ${state === AIR ? 'geleert' : 'gefüllt'}`, changes };
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
