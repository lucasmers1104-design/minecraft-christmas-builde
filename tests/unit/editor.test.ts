import { describe, expect, it } from 'vitest';
import { countMaterials } from '@/core/analysis/materialCounts';
import { blockState } from '@/core/blocks/registry';
import {
  applyCommand,
  blockAtCell,
  EditError,
  EditHistory,
  fillBoxCommand,
  removeBlockCommand,
  replaceAllCommand,
  setBlockCommand,
} from '@/core/editor/editOperations';
import { exportSchematic } from '@/core/export/exportSchematic';
import { generateBuilding } from '@/core/generator/generateBuilding';
import { DEFAULT_HOUSE_SPEC } from '@/core/schema/buildSpec';
import { collectVoxelIssues, linearIndex } from '@/core/schema/voxelModel';
import { buildVoxelMesh } from '@/components/preview/buildVoxelMesh';

const model = generateBuilding(DEFAULT_HOUSE_SPEC);
const gold = blockState('gold_block');
// The upper corner of the bounding box is free air (the roof sits in the middle).
const corner = { x: 0, y: model.dimensions.height - 1, z: 0 };
/** Topmost block above the centre of the house (ridge). */
function ridgeCell() {
  const x = Math.floor(model.dimensions.width / 2);
  const z = Math.floor(model.dimensions.length / 2);
  for (let y = model.dimensions.height - 1; y >= 0; y--) if (blockAtCell(model, { x, y, z }) !== 'minecraft:air') return { x, y, z };
  throw new Error('kein Dach');
}

describe('Editor-Operationen', () => {
  it('Block setzen ergibt ein valides, neu gehashtes Modell; Rückgängig stellt den Hash wieder her', () => {
    const history = new EditHistory();
    expect(blockAtCell(model, corner)).toBe('minecraft:air');
    const cmd = setBlockCommand(model, corner, gold)!;
    const edited = history.execute(model, cmd);
    expect(collectVoxelIssues(edited)).toEqual([]);
    expect(edited.hash).not.toBe(model.hash);
    expect(blockAtCell(edited, corner)).toBe(gold);
    expect(countMaterials(edited).totalBlocks).toBe(countMaterials(model).totalBlocks + 1);
    const undone = history.undo(edited);
    expect(undone.hash).toBe(model.hash);
    expect(undone.palette).toEqual(model.palette);
    const redone = history.redo(undone);
    expect(redone.hash).toBe(edited.hash);
    expect(history.canRedo).toBe(false);
  });

  it('Entfernen, Ersetzen-Alle und Bereich füllen', () => {
    // The most common plain full block of the house (no block state properties).
    const roof = countMaterials(model).entries.find((e) => !e.state.includes('['))!.state;
    const history = new EditHistory();
    const ridge = ridgeCell();
    let m = history.execute(model, removeBlockCommand(model, ridge)!);
    expect(blockAtCell(m, ridge)).toBe('minecraft:air');
    const replace = replaceAllCommand(m, roof, blockState('red_terracotta'))!;
    expect(replace.changes.length).toBe(countMaterials(model).entries.find((e) => e.state === roof)!.count);
    m = history.execute(m, replace);
    expect(m.palette).not.toContain(roof);
    const goldBefore = countMaterials(m).entries.find((e) => e.state === gold)?.count ?? 0;
    m = history.execute(m, fillBoxCommand(m, { x: 0, y: corner.y - 1, z: 0 }, { x: 1, y: corner.y, z: 1 }, gold)!);
    expect(countMaterials(m).entries.find((e) => e.state === gold)!.count).toBe(goldBefore + 8);
    // Undo everything in order.
    m = history.undo(history.undo(history.undo(m)));
    expect(m.hash).toBe(model.hash);
  });

  it('bearbeitete Modelle exportieren verlustfrei', () => {
    const edited = applyCommand(model, setBlockCommand(model, { x: 3, y: 2, z: 5 }, gold)!);
    const { report } = exportSchematic(edited);
    expect(report.ok).toBe(true);
    expect(report.decoded!.palette[report.decoded!.indices[linearIndex(edited.dimensions, 3, 2, 5)]!]).toBe(gold);
  });

  it('lehnt ungültige Blöcke, Positionen und veraltete Befehle ab', () => {
    expect(() => setBlockCommand(model, { x: 0, y: 0, z: 0 }, 'minecraft:bedrock')).toThrow(EditError);
    expect(() => setBlockCommand(model, { x: 0, y: 0, z: 0 }, 'minecraft:spruce_log')).toThrow(EditError);
    expect(() => setBlockCommand(model, { x: -1, y: 0, z: 0 }, gold)).toThrow(/außerhalb/);
    expect(() => setBlockCommand(model, { x: 0, y: model.dimensions.height, z: 0 }, gold)).toThrow(/außerhalb/);
    expect(setBlockCommand(model, corner, 'minecraft:air')).toBeNull(); // no-op
    const cmd = setBlockCommand(model, corner, gold)!;
    const edited = applyCommand(model, cmd);
    expect(() => applyCommand(edited, cmd)).toThrow(/passt nicht mehr/);
  });

  it('Verlauf ist begrenzt', () => {
    const history = new EditHistory(3);
    let m = model;
    for (let x = 0; x < 5; x++) m = history.execute(m, setBlockCommand(m, { x, y: 0, z: 0 }, gold)!);
    let undos = 0;
    while (history.canUndo) {
      m = history.undo(m);
      undos++;
    }
    expect(undos).toBe(3);
  });
});

describe('Ebenenansicht', () => {
  it('blendet Blöcke oberhalb der Ebene aus und zeigt Schnittflächen', () => {
    const full = buildVoxelMesh(model).faceCount;
    const cut = buildVoxelMesh(model, { maxY: 2 });
    expect(cut.faceCount).toBeLessThan(full);
    expect(cut.faceCount).toBeGreaterThan(0);
    for (let i = 1; i < cut.opaque.positions.length; i += 3) expect(cut.opaque.positions[i]).toBeLessThanOrEqual(3);
  });
});

describe('Editor mit Zustandsauflöser', () => {
  const empty = () =>
    applyCommand(
      generateBuilding(DEFAULT_HOUSE_SPEC),
      fillBoxCommand(generateBuilding(DEFAULT_HOUSE_SPEC), { x: 0, y: 0, z: 0 }, { x: 4, y: 3, z: 4 }, 'minecraft:air')!,
    );

  it('eine neue Treppe macht aus der Nachbartreppe eine Ecke; Rückgängig stellt alles exakt wieder her', () => {
    const base = empty();
    const history = new EditHistory();
    const a = history.execute(base, setBlockCommand(base, { x: 1, y: 1, z: 1 }, blockState('oak_stairs', { facing: 'south' }))!);
    const cmd = setBlockCommand(a, { x: 1, y: 1, z: 2 }, blockState('oak_stairs', { facing: 'east' }))!;
    expect(cmd.changes.length).toBe(2);
    const b = history.execute(a, cmd);
    expect(blockAtCell(b, { x: 1, y: 1, z: 1 })).toContain('shape=outer_left');
    expect(history.undo(b).hash).toBe(a.hash);
  });

  it('Tür: die obere Hälfte entsteht automatisch und verschwindet mit der unteren', () => {
    const base = empty();
    const floor = applyCommand(base, setBlockCommand(base, { x: 2, y: 0, z: 2 }, blockState('stone'))!);
    const withDoor = applyCommand(floor, setBlockCommand(floor, { x: 2, y: 1, z: 2 }, blockState('spruce_door', { facing: 'south' }))!);
    expect(blockAtCell(withDoor, { x: 2, y: 2, z: 2 })).toContain('half=upper');
    const removed = applyCommand(withDoor, removeBlockCommand(withDoor, { x: 2, y: 2, z: 2 })!);
    expect(blockAtCell(removed, { x: 2, y: 1, z: 2 })).toBe('minecraft:air');
  });

  it('Zäune verbinden sich beim Setzen, eine schwebende Laterne wird gemeldet', () => {
    const base = empty();
    const one = applyCommand(base, setBlockCommand(base, { x: 1, y: 1, z: 1 }, blockState('oak_fence'))!);
    const two = applyCommand(one, setBlockCommand(one, { x: 2, y: 1, z: 1 }, blockState('oak_fence'))!);
    expect(blockAtCell(two, { x: 1, y: 1, z: 1 })).toContain('east=true');
    const lantern = setBlockCommand(two, { x: 3, y: 3, z: 3 }, blockState('lantern'))!;
    expect(lantern.notes?.[0]).toMatch(/ohne Halt/);
  });
});
