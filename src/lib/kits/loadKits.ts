import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createKitLibrary, EMPTY_KIT_LIBRARY, type KitLibrary } from '@/core/kits/library';
import { isKitScope, parseKit } from '@/core/kits/parseKit';
import { KIT_SCOPE_ALL, type DetailKit } from '@/core/kits/types';
import { STYLE_IDS } from '@/core/style/styles';

/**
 * Server-side loader for the kit folder (node:fs – import it only from server code such as API
 * routes, never from components):
 *
 *   `${MCB_KITS_DIR || <cwd>/kits}/<style>/<name>.schem` + `<name>.json`, `kits/alle/` for all
 *   styles (docs/DETAIL_KITS.md).
 *
 * Returns the library of all valid kits and German problems per file; one broken kit never
 * blocks the others. A missing folder is an empty library without problems. Results are cached
 * per folder and reused as long as no relevant file changed (names, sizes, modification times).
 */

type Env = Record<string, string | undefined>;

export const KITS_DIR_ENV = 'MCB_KITS_DIR';

export function kitsDir(env: Env = process.env): string {
  const custom = env[KITS_DIR_ENV]?.trim();
  return custom ? resolve(process.cwd(), custom) : join(process.cwd(), 'kits');
}

export interface KitFileProblem {
  /** Path relative to the kit folder, e.g. "rustic/fenster.schem". */
  file: string;
  problems: readonly string[];
}

export interface KitLoadResult {
  dir: string;
  library: KitLibrary;
  problems: readonly KitFileProblem[];
}

interface CacheEntry {
  signature: string;
  result: KitLoadResult;
}

const cache = new Map<string, CacheEntry>();

/** Forgets cached results (tests, or after the user replaced files with identical timestamps). */
export function clearKitCache(): void {
  cache.clear();
}

const SCOPES = [...STYLE_IDS, KIT_SCOPE_ALL].join(', ');
const byCodeUnits = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function extensionOf(file: string): string {
  const dot = file.lastIndexOf('.');
  return dot <= 0 ? '' : file.slice(dot + 1).toLowerCase();
}

function baseName(file: string): string {
  const dot = file.lastIndexOf('.');
  return dot <= 0 ? file : file.slice(0, dot);
}

interface Pair {
  scope: string;
  name: string;
  schem?: string;
  json?: string;
}

export async function loadKits(options: { dir?: string } = {}): Promise<KitLoadResult> {
  const dir = options.dir ?? kitsDir();
  const problems: KitFileProblem[] = [];
  const empty = (): KitLoadResult => ({ dir, library: EMPTY_KIT_LIBRARY, problems });

  let rootStat;
  try {
    rootStat = await stat(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return empty();
    problems.push({ file: '.', problems: [`Der Kit-Ordner ${dir} ist nicht lesbar (${(error as NodeJS.ErrnoException).code ?? 'Fehler'}).`] });
    return empty();
  }
  if (!rootStat.isDirectory()) {
    problems.push({ file: '.', problems: [`${dir} ist kein Ordner.`] });
    return empty();
  }

  // 1. Inventory: file pairs per scope folder, plus a signature for the cache.
  const pairs = new Map<string, Pair>();
  const signature: string[] = [];
  const rootEntries = (await readdir(dir, { withFileTypes: true })).sort((a, b) => byCodeUnits(a.name, b.name));
  for (const entry of rootEntries) {
    // Every entry name is part of the signature: new folders or stray files change the problems.
    signature.push(`${entry.name}|${entry.isDirectory() ? 'dir' : 'file'}`);
    if (!entry.isDirectory()) {
      const ext = extensionOf(entry.name);
      if (ext === 'schem' || ext === 'json') problems.push({ file: entry.name, problems: [`Kits gehören in einen Stilordner (${SCOPES}), nicht direkt in den Kit-Ordner.`] });
      continue;
    }
    if (!isKitScope(entry.name)) {
      problems.push({ file: `${entry.name}/`, problems: [`Unbekannter Ordner „${entry.name}“: erlaubt sind ${SCOPES}.`] });
      continue;
    }
    const scope = entry.name;
    const files = (await readdir(join(dir, scope), { withFileTypes: true })).sort((a, b) => byCodeUnits(a.name, b.name));
    for (const file of files) {
      const rel = `${scope}/${file.name}`;
      signature.push(`${rel}|${file.isDirectory() ? 'dir' : 'file'}`);
      if (file.isDirectory()) {
        problems.push({ file: `${rel}/`, problems: ['Unterordner werden nicht gelesen – lege die Kit-Dateien direkt in den Stilordner.'] });
        continue;
      }
      const ext = extensionOf(file.name);
      if (ext === 'schematic') {
        problems.push({ file: rel, problems: ['Altes Format (.schematic). Speichere das Kit mit WorldEdit 7.3 oder neuer als .schem.'] });
        continue;
      }
      if (ext !== 'schem' && ext !== 'json') continue;
      const info = await stat(join(dir, scope, file.name));
      signature.push(`${rel}|${info.size}|${info.mtimeMs}`);
      const name = baseName(file.name);
      const id = `${scope}/${name}`;
      const pair = pairs.get(id) ?? { scope, name };
      if (ext === 'schem') pair.schem = file.name;
      else pair.json = file.name;
      pairs.set(id, pair);
    }
  }

  const key = signature.join('\n');
  const cached = cache.get(dir);
  if (cached && cached.signature === key) return cached.result;

  // 2. Parse every complete pair; report incomplete ones.
  const kits: DetailKit[] = [];
  for (const pair of [...pairs.values()].sort((a, b) => byCodeUnits(`${a.scope}/${a.name}`, `${b.scope}/${b.name}`))) {
    const base = `${pair.scope}/${pair.name}`;
    if (!pair.schem || !pair.json) {
      problems.push({
        file: `${pair.scope}/${pair.schem ?? pair.json}`,
        problems: [pair.schem ? `Die Beschreibung ${pair.name}.json fehlt.` : `Die Schematic ${pair.name}.schem fehlt.`],
      });
      continue;
    }
    try {
      const [schematic, description] = await Promise.all([readFile(join(dir, pair.scope, pair.schem)), readFile(join(dir, pair.scope, pair.json), 'utf8')]);
      const result = parseKit({ scope: pair.scope, name: pair.name, schematic, description });
      if (result.ok) kits.push(result.kit);
      else problems.push({ file: `${base}.schem`, problems: result.problems });
    } catch (error) {
      problems.push({ file: `${base}.schem`, problems: [`Datei nicht lesbar (${(error as NodeJS.ErrnoException).code ?? (error as Error).message}).`] });
    }
  }

  const result: KitLoadResult = { dir, library: createKitLibrary(kits), problems: problems.sort((a, b) => byCodeUnits(a.file, b.file)) };
  cache.set(dir, { signature: key, result });
  return result;
}
