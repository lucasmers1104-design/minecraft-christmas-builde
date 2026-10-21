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

describe('Editor-Operationen', () => {
  it('Block setzen ergibt ein valides, neu gehashtes Modell; Rückgängig stellt den Hash wieder her', () => {
    const history = new EditHistory();
    const cmd = setBlockCommand(model, { x: 0, y: 0, z: 0 }, gold)!;
    const edited = history.execute(model, cmd);
    expect(collectVoxelIssues(edited)).toEqual([]);
    expect(edited.hash).not.toBe(model.hash);
    expect(blockAtCell(edited, { x: 0, y: 0, z: 0 })).toBe(gold);
    expect(countMaterials(edited).totalBlocks).toBe(countMaterials(model).totalBlocks + 1);
    const undone = history.undo(edited);
    expect(undone.hash).toBe(model.hash);
    expect(undone.palette).toEqual(model.palette);
    const redone = history.redo(undone);
    expect(redone.hash).toBe(edited.hash);
    expect(history.canRedo).toBe(false);
  });

  it('Entfernen, Ersetzen-Alle und Bereich füllen', () => {
    const roof = blockState('dark_oak_planks');
    const history = new EditHistory();
    let m = history.execute(model, removeBlockCommand(model, { x: 7, y: 0, z: 0 })!); // path block
    expect(blockAtCell(m, { x: 7, y: 0, z: 0 })).toBe('minecraft:air');
    const replace = replaceAllCommand(m, roof, blockState('red_terracotta'))!;
    expect(replace.changes.length).toBe(countMaterials(model).entries.find((e) => e.state === roof)!.count);
    m = history.execute(m, replace);
    expect(m.palette).not.toContain(roof);
    const goldBefore = countMaterials(m).entries.find((e) => e.state === gold)?.count ?? 0; // tree star
    m = history.execute(m, fillBoxCommand(m, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 }, gold)!);
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
    expect(() => setBlockCommand(model, { x: 0, y: 99, z: 0 }, gold)).toThrow(/außerhalb/);
    expect(setBlockCommand(model, { x: 0, y: 0, z: 0 }, 'minecraft:air')).toBeNull(); // no-op
    const cmd = setBlockCommand(model, { x: 0, y: 0, z: 0 }, gold)!;
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
