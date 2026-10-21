import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { generateVariants } from '@/core/generator/generateBuilding';
import { DEFAULT_HOUSE_SPEC } from '@/core/schema/buildSpec';
import {
  deleteProject,
  duplicateProject,
  listProjects,
  loadProject,
  PersistenceError,
  renameProject,
  resetProjectDatabaseForTests,
  saveNewProject,
  updateProject,
  type ProjectContent,
} from '@/lib/persistence/projects';
import Dexie from 'dexie';

const variants = generateVariants(DEFAULT_HOUSE_SPEC);
const content: ProjectContent = {
  description: 'Ein kleines Haus',
  manual: { size: 'small', options: { snow: false } },
  seed: 1,
  targetMinecraftVersion: '1.21.11',
  variants,
  edits: [0, 0, 0],
  selected: 1,
};

beforeEach(async () => {
  await resetProjectDatabaseForTests();
});

describe('Projekte in IndexedDB', () => {
  it('Speichern → Laden ergibt identische Voxeldaten und Hashes', async () => {
    const saved = await saveNewProject('Mein Haus', content);
    const loaded = await loadProject(saved.id);
    expect(loaded.name).toBe('Mein Haus');
    expect(loaded.description).toBe(content.description);
    expect(loaded.manual).toEqual(content.manual);
    expect(loaded.selected).toBe(1);
    expect(loaded.variants.map((v) => v.hash)).toEqual(variants.map((v) => v.hash));
    expect(Array.from(loaded.variants[1]!.indices)).toEqual(Array.from(variants[1]!.indices));
  });

  it('Liste, Umbenennen, Aktualisieren, Duplizieren, Löschen', async () => {
    const a = await saveNewProject('A', content);
    await new Promise((r) => setTimeout(r, 5));
    const b = await saveNewProject('B', { ...content, selected: 0 });
    let list = await listProjects();
    expect(list.map((p) => p.name)).toEqual(['B', 'A']);
    expect(list[0]!.variantCount).toBe(3);
    expect(list[0]!.hash).toBe(variants[0]!.hash);

    await new Promise((r) => setTimeout(r, 5));
    await renameProject(a.id, '  Weihnachtshaus  ');
    list = await listProjects();
    expect(list[0]!.name).toBe('Weihnachtshaus');

    await updateProject(b.id, { ...content, description: 'geändert' });
    expect((await loadProject(b.id)).description).toBe('geändert');

    const copy = await duplicateProject(a.id);
    expect(copy.name).toBe('Weihnachtshaus (Kopie)');
    expect(copy.id).not.toBe(a.id);
    expect((await listProjects()).length).toBe(3);

    await deleteProject(a.id);
    await expect(loadProject(a.id)).rejects.toThrow(PersistenceError);
    expect((await listProjects()).length).toBe(2);
  });

  it('lehnt ungültige Namen und beschädigte Daten mit verständlichem Fehler ab', async () => {
    await expect(saveNewProject('   ', content)).rejects.toThrow(PersistenceError);
    const saved = await saveNewProject('X', content);
    await expect(renameProject(saved.id, '')).rejects.toThrow(/Name/);

    // Manipulate the stored voxel data directly in IndexedDB.
    const raw = new Dexie('minecraft-christmas-builder');
    raw.version(1).stores({ projects: 'id, updatedAt, name' });
    await raw.open();
    const record = await raw.table('projects').get(saved.id);
    record.variants[0].hash = '0'.repeat(64);
    await raw.table('projects').put(record);
    raw.close();
    await expect(loadProject(saved.id)).rejects.toThrow(/beschädigt/);

    const raw2 = new Dexie('minecraft-christmas-builder');
    raw2.version(1).stores({ projects: 'id, updatedAt, name' });
    await raw2.open();
    await raw2.table('projects').put({ ...record, schemaVersion: 99 });
    raw2.close();
    await expect(loadProject(saved.id)).rejects.toThrow(/ungültig/);
  });
});
