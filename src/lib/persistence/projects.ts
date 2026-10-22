import Dexie, { type Table } from 'dexie';
import { z } from 'zod';
import { SUPPORTED_MINECRAFT_VERSIONS } from '@/core/compat/profile';
import type { SpecPatch } from '@/core/generator/parseDescription';
import { MAX_DESCRIPTION_LENGTH, MAX_SEED } from '@/core/schema/buildSpec';
import { specPatchSchema } from '@/core/schema/resolveSpec';
import { MAX_VOLUME, type VoxelModel } from '@/core/schema/voxelModel';
import {
  decodeIndicesU16le,
  decodeVoxelTransport,
  encodeIndexPayload,
  encodeVoxelTransport,
  LEGACY_INDEX_ENCODING,
  TransportError,
  voxelTransportSchema,
} from '@/lib/serialization/voxelTransport';

/**
 * Browser-local project storage (IndexedDB via Dexie). Projects contain everything needed
 * to restore the session exactly: text, manual settings, seed, version and the actual voxel
 * data of every variant (including manual block edits). Data is validated (schema, registry,
 * hash) on every load. Nothing leaves the device; there is no cloud sync.
 */

/**
 * Version of the project record. Written: always the current one. Read: 1 and 2.
 * - 1: written before large models; variant indices usually `u16le-base64`.
 * - 2: variant indices `rle-varint-base64` (or u16le for noise-like data, see voxelTransport).
 * The record layout is otherwise identical. Spec changes are handled by migrateStoredSpec.
 */
export const PROJECT_SCHEMA_VERSION = 2;
export const READABLE_PROJECT_SCHEMA_VERSIONS = [1, 2] as const;
export const MAX_PROJECT_NAME_LENGTH = 80;
const DB_NAME = 'minecraft-christmas-builder';
/** Dexie schema version (IndexedDB stores it as 10x this number). */
export const PROJECT_DB_VERSION = 2;
const PROJECT_INDEXES = 'id, updatedAt, name';

// ===================================================================================
// MIGRATION HOOK – migrateStoredSpec
// Applied to every stored BuildSpec (variants[].spec) and every stored spec patch
// (manual, aiPlan.patch) of a project record BEFORE zod parsing, on every load.
// Identity for now. When BuildSpec gets schemaVersion 2, convert older shapes here
// (input: whatever was stored, possibly outdated or corrupt; output: the current shape,
// or the input unchanged so that zod reports it). Must be pure and must not throw.
// ===================================================================================
export function migrateStoredSpec(raw: unknown): unknown {
  return raw;
}

/** A local-AI plan the project was generated from (kept so reopening restores the same settings). */
const storedAiPlanSchema = z
  .object({
    description: z.string().max(MAX_DESCRIPTION_LENGTH),
    model: z.string().max(120),
    durationMs: z.number().nonnegative(),
    explanation: z.string().max(600),
    unsupported: z.array(z.string().max(200)).max(12),
    patch: specPatchSchema,
  })
  .strict();

export const storedProjectSchema = z
  .object({
    id: z.string().min(1).max(64),
    schemaVersion: z.literal(READABLE_PROJECT_SCHEMA_VERSIONS),
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
    /** Optional (added before the first release, in schema version 1 and later). */
    aiPlan: storedAiPlanSchema.nullable().optional(),
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
  aiPlan?: z.infer<typeof storedAiPlanSchema> | null;
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

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Re-encodes legacy `u16le-base64` variant indices of a stored record as RLE, in place
 * (used by the Dexie version-2 upgrade). Only the encoding changes: the decoded indices,
 * palette, hash, spec and the record's schemaVersion stay exactly as stored. Variants that
 * cannot be decoded are left untouched, so a single damaged record never blocks opening
 * the database; it is reported as damaged when it is loaded. Returns the number of
 * re-encoded variants.
 */
export function upgradeStoredVariantEncoding(record: unknown): number {
  if (!isObject(record) || !Array.isArray(record.variants)) return 0;
  let changed = 0;
  const variants = record.variants.map((variant: unknown) => {
    if (!isObject(variant) || variant.indexEncoding !== LEGACY_INDEX_ENCODING || typeof variant.indices !== 'string') return variant;
    const d = variant.dimensions;
    if (!isObject(d)) return variant;
    const { width, height, length } = d;
    if (![width, height, length].every((n) => typeof n === 'number' && Number.isInteger(n) && n > 0)) return variant;
    const count = (width as number) * (height as number) * (length as number);
    if (count > MAX_VOLUME) return variant;
    try {
      const payload = encodeIndexPayload(decodeIndicesU16le(variant.indices, count));
      if (payload.indexEncoding === LEGACY_INDEX_ENCODING) return variant; // RLE would be larger
      changed++;
      return { ...variant, ...payload };
    } catch {
      return variant;
    }
  });
  if (changed > 0) record.variants = variants;
  return changed;
}

class ProjectDatabase extends Dexie {
  projects!: Table<StoredProject, string>;
  constructor() {
    super(DB_NAME);
    // v1: initial schema. v2: same indexes, variant voxel data re-encoded as RLE.
    // Bump with another upgrade() step when the stored shape changes again.
    this.version(1).stores({ projects: PROJECT_INDEXES });
    this.version(PROJECT_DB_VERSION)
      .stores({ projects: PROJECT_INDEXES })
      .upgrade((tx) =>
        tx
          .table('projects')
          .toCollection()
          .modify((record: unknown) => {
            upgradeStoredVariantEncoding(record);
          }),
      );
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
    variants: content.variants.map((variant) => encodeVoxelTransport(variant)),
    edits: content.edits,
    selected: content.selected,
    aiPlan: content.aiPlan ?? null,
  };
  const parsed = storedProjectSchema.safeParse(record);
  if (!parsed.success) {
    throw new PersistenceError('Projekt kann nicht gespeichert werden', parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
  }
  return parsed.data;
}

/** Runs migrateStoredSpec on every stored spec and patch of a raw record (no mutation). */
function migrateStoredRecord(raw: unknown): unknown {
  if (!isObject(raw)) return raw;
  const out: Record<string, unknown> = { ...raw };
  if ('manual' in out) out.manual = migrateStoredSpec(out.manual);
  if (Array.isArray(out.variants)) {
    out.variants = out.variants.map((variant: unknown) =>
      isObject(variant) && 'spec' in variant ? { ...variant, spec: migrateStoredSpec(variant.spec) } : variant,
    );
  }
  if (isObject(out.aiPlan) && 'patch' in out.aiPlan) out.aiPlan = { ...out.aiPlan, patch: migrateStoredSpec(out.aiPlan.patch) };
  return out;
}

function fromStored(raw: unknown): LoadedProject {
  const parsed = storedProjectSchema.safeParse(migrateStoredRecord(raw));
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
      aiPlan: p.aiPlan ?? null,
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
