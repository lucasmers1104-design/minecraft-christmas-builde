import Dexie, { type Table } from 'dexie';
import { z } from 'zod';
import { SUPPORTED_MINECRAFT_VERSIONS } from '@/core/compat/profile';
import type { SpecPatch } from '@/core/generator/parseDescription';
import { MAX_DESCRIPTION_LENGTH, MAX_SEED } from '@/core/schema/buildSpec';
import { specPatchSchema } from '@/core/schema/resolveSpec';
import type { VoxelModel } from '@/core/schema/voxelModel';
import { decodeVoxelTransport, encodeVoxelTransport, TransportError, voxelTransportSchema } from '@/lib/serialization/voxelTransport';

/**
 * Browser-local project storage (IndexedDB via Dexie). Projects contain everything needed
 * to restore the session exactly: text, manual settings, seed, version and the actual voxel
 * data of every variant (including manual block edits). Data is validated (schema, registry,
 * hash) on every load. Nothing leaves the device; there is no cloud sync.
 */

export const PROJECT_SCHEMA_VERSION = 1;
export const MAX_PROJECT_NAME_LENGTH = 80;
const DB_NAME = 'minecraft-christmas-builder';

export const storedProjectSchema = z
  .object({
    id: z.string().min(1).max(64),
    schemaVersion: z.literal(PROJECT_SCHEMA_VERSION),
    name: z.string().trim().min(1).max(MAX_PROJECT_NAME_LENGTH),
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
    description: z.string().max(MAX_DESCRIPTION_LENGTH),
    manual: specPatchSchema,
    seed: z.number().int().min(0).max(MAX_SEED),
    targetMinecraftVersion: z.string().refine((v) => SUPPORTED_MINECRAFT_VERSIONS.includes(v)),
    variants: z.array(voxelTransportSchema).min(1).max(3),
    /** Number of manual block edits per variant (0 = as generated). */
    edits: z.array(z.number().int().nonnegative()),
    selected: z.number().int().nonnegative(),
  })
  .strict()
  .refine((p) => p.selected < p.variants.length && p.edits.length === p.variants.length, {
    message: 'Ausgewählte Variante oder Bearbeitungszähler passen nicht zu den Varianten',
  });

export type StoredProject = z.infer<typeof storedProjectSchema>;

export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  variantCount: number;
  dimensions: { width: number; height: number; length: number };
  hash: string;
  minecraftVersion: string;
  edited: boolean;
}

/** The in-memory state a project restores. */
export interface ProjectContent {
  description: string;
  manual: SpecPatch;
  seed: number;
  targetMinecraftVersion: string;
  variants: VoxelModel[];
  edits: number[];
  selected: number;
}

export interface LoadedProject extends ProjectContent {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export class PersistenceError extends Error {
  constructor(
    message: string,
    readonly issues: string[] = [],
  ) {
    super(message);
    this.name = 'PersistenceError';
  }
}

class ProjectDatabase extends Dexie {
  projects!: Table<StoredProject, string>;
  constructor() {
    super(DB_NAME);
    // Version 1 of the IndexedDB schema; bump with an upgrade() step when the shape changes.
    this.version(1).stores({ projects: 'id, updatedAt, name' });
  }
}

let database: ProjectDatabase | null = null;
function db(): ProjectDatabase {
  if (typeof indexedDB === 'undefined') throw new PersistenceError('Dieser Browser stellt kein IndexedDB bereit – Speichern ist nicht möglich.');
  database ??= new ProjectDatabase();
  return database;
}

/** For tests: drop the connection so a fresh database can be used. */
export async function resetProjectDatabaseForTests(): Promise<void> {
  if (database) {
    database.close();
    database = null;
  }
  await Dexie.delete(DB_NAME);
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function wrap<T>(action: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof PersistenceError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new PersistenceError(`${action} fehlgeschlagen: ${message}`);
  }
}

function toStored(id: string, name: string, createdAt: number, content: ProjectContent): StoredProject {
  const record: StoredProject = {
    id,
    schemaVersion: PROJECT_SCHEMA_VERSION,
    name: name.trim(),
    createdAt,
    updatedAt: Date.now(),
    description: content.description,
    manual: content.manual,
    seed: content.seed,
    targetMinecraftVersion: content.targetMinecraftVersion,
    variants: content.variants.map(encodeVoxelTransport),
    edits: content.edits,
    selected: content.selected,
  };
  const parsed = storedProjectSchema.safeParse(record);
  if (!parsed.success) {
    throw new PersistenceError('Projekt kann nicht gespeichert werden', parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
  }
  return parsed.data;
}

function fromStored(raw: unknown): LoadedProject {
  const parsed = storedProjectSchema.safeParse(raw);
  if (!parsed.success) {
    throw new PersistenceError('Gespeichertes Projekt ist ungültig oder beschädigt', parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
  }
  const p = parsed.data;
  try {
    return {
      id: p.id,
      name: p.name,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      description: p.description,
      manual: p.manual,
      seed: p.seed,
      targetMinecraftVersion: p.targetMinecraftVersion,
      variants: p.variants.map((v) => decodeVoxelTransport(v)),
      edits: p.edits,
      selected: p.selected,
    };
  } catch (error) {
    if (error instanceof TransportError) throw new PersistenceError('Voxeldaten des Projekts sind beschädigt', error.issues);
    throw error;
  }
}

export async function saveNewProject(name: string, content: ProjectContent): Promise<LoadedProject> {
  return wrap('Speichern', async () => {
    const record = toStored(newId(), name, Date.now(), content);
    await db().projects.add(record);
    return fromStored(record);
  });
}

export async function updateProject(id: string, content: ProjectContent, name?: string): Promise<LoadedProject> {
  return wrap('Speichern', async () => {
    const existing = await db().projects.get(id);
    if (!existing) throw new PersistenceError('Projekt existiert nicht mehr (wurde es gelöscht?)');
    const record = toStored(id, name ?? existing.name, existing.createdAt, content);
    await db().projects.put(record);
    return fromStored(record);
  });
}

export async function loadProject(id: string): Promise<LoadedProject> {
  return wrap('Laden', async () => {
    const record = await db().projects.get(id);
    if (!record) throw new PersistenceError('Projekt nicht gefunden');
    return fromStored(record);
  });
}

export async function listProjects(): Promise<ProjectSummary[]> {
  return wrap('Laden der Projektliste', async () => {
    const records = await db().projects.orderBy('updatedAt').reverse().toArray();
    return records.map((r) => {
      const v = r.variants[r.selected] ?? r.variants[0];
      return {
        id: r.id,
        name: r.name,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        variantCount: r.variants.length,
        dimensions: v?.dimensions ?? { width: 0, height: 0, length: 0 },
        hash: v?.hash ?? '',
        minecraftVersion: r.targetMinecraftVersion,
        edited: (r.edits ?? []).some((n) => n > 0),
      };
    });
  });
}

export async function renameProject(id: string, name: string): Promise<void> {
  return wrap('Umbenennen', async () => {
    const trimmed = name.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_PROJECT_NAME_LENGTH) {
      throw new PersistenceError(`Name muss 1–${MAX_PROJECT_NAME_LENGTH} Zeichen lang sein`);
    }
    const changed = await db().projects.update(id, { name: trimmed, updatedAt: Date.now() });
    if (changed === 0) throw new PersistenceError('Projekt nicht gefunden');
  });
}

export async function duplicateProject(id: string): Promise<ProjectSummary> {
  return wrap('Duplizieren', async () => {
    const source = await loadProject(id);
    const copyName = `${source.name} (Kopie)`.slice(0, MAX_PROJECT_NAME_LENGTH);
    const copy = await saveNewProject(copyName, source);
    const summary = (await listProjects()).find((p) => p.id === copy.id);
    if (!summary) throw new PersistenceError('Kopie wurde nicht gefunden');
    return summary;
  });
}

export async function deleteProject(id: string): Promise<void> {
  return wrap('Löschen', async () => {
    await db().projects.delete(id);
  });
}
