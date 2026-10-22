import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { generateVariants } from '@/core/generator/generateBuilding';
import { DEFAULT_HOUSE_SPEC } from '@/core/schema/buildSpec';
import {
  deleteProject,
  duplicateProject,
  listProjects,
  loadProject,
  migrateStoredSpec,
  PersistenceError,
  PROJECT_DB_VERSION,
  PROJECT_SCHEMA_VERSION,
  renameProject,
  resetProjectDatabaseForTests,
  saveNewProject,
  updateProject,
  upgradeStoredVariantEncoding,
  type ProjectContent,
} from '@/lib/persistence/projects';
import type { VoxelModel } from '@/core/schema/voxelModel';
import Dexie from 'dexie';

const DB_NAME = 'minecraft-christmas-builder';
const INDEXES = 'id, updatedAt, name';

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

/** Raw Dexie handle on the current schema version (bypasses the app's validation). */
async function openRaw(version: number = PROJECT_DB_VERSION): Promise<Dexie> {
  const raw = new Dexie(DB_NAME);
  raw.version(version).stores({ projects: INDEXES });
  await raw.open();
  return raw;
}

/** A variant exactly as the version-1 code stored it: indices as u16 little-endian base64. */
function legacyVariant(model: VoxelModel) {
  const bytes = Buffer.alloc(model.indices.length * 2);
  model.indices.forEach((v, i) => bytes.writeUInt16LE(v, i * 2));
  return {
    schemaVersion: 1,
    dimensions: { ...model.dimensions },
    palette: [...model.palette],
    indexEncoding: 'u16le-base64',
    indices: bytes.toString('base64'),
    origin: { x: 0, y: 0, z: 0 },
    spec: model.spec,
    hash: model.hash,
  };
}

function legacyRecord(id: string) {
  return {
    id,
    schemaVersion: 1,
    name: 'Altes Projekt',
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    description: content.description,
    manual: content.manual,
    seed: 1,
    targetMinecraftVersion: '1.21.11',
    variants: variants.map(legacyVariant),
    edits: [0, 2, 0],
    selected: 2,
    aiPlan: null,
  };
}

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

  it('speichert Schema-Version 2 mit RLE-kodierten Varianten', async () => {
    expect(PROJECT_SCHEMA_VERSION).toBe(2);
    const saved = await saveNewProject('Neu', content);
    const raw = await openRaw();
    const record = await raw.table('projects').get(saved.id);
    raw.close();
    expect(record.schemaVersion).toBe(2);
    expect(record.variants.map((v: { indexEncoding: string }) => v.indexEncoding)).toEqual([
      'rle-varint-base64',
      'rle-varint-base64',
      'rle-varint-base64',
    ]);
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
    const raw = await openRaw();
    const record = await raw.table('projects').get(saved.id);
    record.variants[0].hash = '0'.repeat(64);
    await raw.table('projects').put(record);
    raw.close();
    await expect(loadProject(saved.id)).rejects.toThrow(/beschädigt/);

    const raw2 = await openRaw();
    await raw2.table('projects').put({ ...record, schemaVersion: 99 });
    raw2.close();
    await expect(loadProject(saved.id)).rejects.toThrow(/ungültig/);
  });
});

describe('Migration von IndexedDB-Version 1 (u16le-base64)', () => {
  it('lädt einen echten Version-1-Datensatz und kodiert ihn beim Upgrade als RLE', async () => {
    // Exactly what the old app left behind: Dexie schema version 1, record schemaVersion 1.
    const v1 = new Dexie(DB_NAME);
    v1.version(1).stores({ projects: INDEXES });
    await v1.open();
    expect(v1.verno).toBe(1);
    await v1.table('projects').put(legacyRecord('legacy-1'));
    v1.close();

    // First access through the new code opens version 2 and runs the upgrade.
    const loaded = await loadProject('legacy-1');
    expect(loaded.name).toBe('Altes Projekt');
    expect(loaded.selected).toBe(2);
    expect(loaded.edits).toEqual([0, 2, 0]);
    expect(loaded.variants.map((v) => v.hash)).toEqual(variants.map((v) => v.hash));
    loaded.variants.forEach((v, i) => expect(Array.from(v.indices)).toEqual(Array.from(variants[i]!.indices)));
    expect((await listProjects()).map((p) => p.id)).toEqual(['legacy-1']);

    const raw = await openRaw();
    expect(raw.verno).toBe(PROJECT_DB_VERSION);
    const upgraded = await raw.table('projects').get('legacy-1');
    raw.close();
    // Only the encoding changed; the record still says it was written by version 1.
    expect(upgraded.schemaVersion).toBe(1);
    for (const [i, v] of upgraded.variants.entries()) {
      expect(v.indexEncoding).toBe('rle-varint-base64');
      expect(v.hash).toBe(variants[i]!.hash);
      expect(v.indices.length).toBeLessThan(legacyVariant(variants[i]!).indices.length);
    }

    // Saving again writes the current record version.
    await updateProject('legacy-1', loaded);
    const raw2 = await openRaw();
    expect((await raw2.table('projects').get('legacy-1')).schemaVersion).toBe(2);
    raw2.close();
  });

  it('ein beschädigter Version-1-Datensatz blockiert das Upgrade nicht', async () => {
    const v1 = new Dexie(DB_NAME);
    v1.version(1).stores({ projects: INDEXES });
    await v1.open();
    const broken = legacyRecord('broken');
    broken.variants[0]!.indices = broken.variants[0]!.indices.slice(0, -8);
    await v1.table('projects').bulkPut([legacyRecord('good'), broken]);
    v1.close();

    expect((await loadProject('good')).variants[0]!.hash).toBe(variants[0]!.hash);
    await expect(loadProject('broken')).rejects.toThrow(/beschädigt/);
    const raw = await openRaw();
    const stored = await raw.table('projects').get('broken');
    raw.close();
    // The undecodable variant stays as it was; the intact ones were re-encoded.
    expect(stored.variants.map((v: { indexEncoding: string }) => v.indexEncoding)).toEqual([
      'u16le-base64',
      'rle-varint-base64',
      'rle-varint-base64',
    ]);
  });

  it('upgradeStoredVariantEncoding ändert nur die Kodierung und ignoriert Fremdes', () => {
    const record = legacyRecord('x');
    const before = JSON.parse(JSON.stringify(record));
    expect(upgradeStoredVariantEncoding(record)).toBe(3);
    expect(upgradeStoredVariantEncoding(record)).toBe(0); // idempotent
    expect({ ...record, variants: undefined }).toEqual({ ...before, variants: undefined });
    record.variants.forEach((v, i) => {
      expect({ ...v, indexEncoding: undefined, indices: undefined }).toEqual({ ...before.variants[i], indexEncoding: undefined, indices: undefined });
    });
    expect(upgradeStoredVariantEncoding(null)).toBe(0);
    expect(upgradeStoredVariantEncoding({ variants: 'nope' })).toBe(0);
    expect(upgradeStoredVariantEncoding({ variants: [{ indexEncoding: 'u16le-base64', indices: 'AAAA', dimensions: { width: -1 } }] })).toBe(0);
  });

  it('migrateStoredSpec lässt v2-Specs unverändert', () => {
    const spec = { ...DEFAULT_HOUSE_SPEC };
    expect(migrateStoredSpec(spec)).toBe(spec);
    expect(migrateStoredSpec(undefined)).toBeUndefined();
  });
});
