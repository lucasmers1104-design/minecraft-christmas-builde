import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { AssetPack, BlockstateJson, ModelJson, TextureEntry } from '@/core/textures/assetTypes';
import { ZipArchive, ZipFormatError } from '@/lib/textures/zipReader';

/**
 * Reads block models and textures from the user's OWN Minecraft client jar (found in the
 * launcher folders, uploaded by the user, or downloaded from Mojang on explicit request) and
 * caches them locally in .minecraft-assets/. Nothing of Mojang's assets is part of this project.
 */

export class MinecraftJarError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MinecraftJarError';
  }
}

export type AssetSourceKind = 'env' | 'launcher' | 'upload' | 'mojang';

export interface AssetSource {
  kind: AssetSourceKind;
  /** Launcher name or file path shown to the user. */
  label: string;
  path?: string;
}

export interface CachedAssets {
  pack: AssetPack;
  source: AssetSource;
  importedAt: string;
}

const PREFIX = 'assets/minecraft/';

/** Extracts all block states, block models and block textures from a client jar. */
export function readClientJar(data: Buffer): AssetPack {
  let zip: ZipArchive;
  try {
    zip = ZipArchive.fromBuffer(data);
  } catch (error) {
    if (error instanceof ZipFormatError) throw new MinecraftJarError(`Die Datei ist keine gültige Minecraft-Datei: ${error.message}`);
    throw error;
  }
  if (!zip.has(`${PREFIX}blockstates/stone.json`) || !zip.has(`${PREFIX}models/block/cube_all.json`)) {
    throw new MinecraftJarError(
      'In der Datei fehlen die Minecraft-Blockdaten. Bitte die Client-Datei der Minecraft-Version wählen (z. B. versions/1.21.11/1.21.11.jar), nicht eine Mod- oder Server-Datei.',
    );
  }
  let version = 'unbekannt';
  try {
    const info = JSON.parse(zip.readText('version.json') ?? '{}') as { id?: string; name?: string };
    version = info.id ?? info.name ?? version;
  } catch {
    // keep "unbekannt"
  }
  const blockstates: Record<string, BlockstateJson> = {};
  const models: Record<string, ModelJson> = {};
  const textures: Record<string, TextureEntry> = {};
  for (const name of zip.names()) {
    if (!name.startsWith(PREFIX)) continue;
    const rest = name.slice(PREFIX.length);
    try {
      if (rest.startsWith('blockstates/') && rest.endsWith('.json')) {
        blockstates[rest.slice('blockstates/'.length, -5)] = JSON.parse(zip.readText(name)!) as BlockstateJson;
      } else if (rest.startsWith('models/block/') && rest.endsWith('.json')) {
        models[rest.slice('models/'.length, -5)] = JSON.parse(zip.readText(name)!) as ModelJson;
      } else if (rest.startsWith('textures/block/') && rest.endsWith('.png')) {
        textures[rest.slice('textures/'.length, -4)] = {
          png: zip.read(name)!.toString('base64'),
          animated: zip.has(`${name}.mcmeta`),
        };
      }
    } catch (error) {
      if (error instanceof SyntaxError) continue; // a broken file only affects that one block
      throw error;
    }
  }
  return { version, blockstates, models, textures };
}

// ---------------------------------------------------------------- cache

export function assetCacheDir(env: Record<string, string | undefined> = process.env): string {
  return env.MCB_ASSET_CACHE_DIR?.trim() || join(process.cwd(), '.minecraft-assets');
}

const CACHE_FILE = 'block-assets.json';

export async function loadCachedAssets(dir = assetCacheDir()): Promise<CachedAssets | null> {
  try {
    const parsed = JSON.parse(await readFile(join(dir, CACHE_FILE), 'utf8')) as CachedAssets;
    return parsed?.pack?.blockstates && parsed.pack.models && parsed.pack.textures ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveCachedAssets(entry: CachedAssets, dir = assetCacheDir()): Promise<void> {
  await mkdir(dir, { recursive: true });
  const file = join(dir, CACHE_FILE);
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(entry));
  await rename(tmp, file);
}

// ---------------------------------------------------------------- finding the jar

export interface JarCandidate {
  path: string;
  launcher: string;
  version: string;
}

interface LauncherRoot {
  launcher: string;
  root: string;
}

/** Launcher folders on this computer (default locations; custom ones are found via upload). */
export function launcherRoots(env: Record<string, string | undefined> = process.env, platform = process.platform): LauncherRoot[] {
  const home = env.USERPROFILE || env.HOME || homedir();
  const appData = env.APPDATA || join(home, 'AppData', 'Roaming');
  if (platform === 'win32') {
    return [
      { launcher: 'Minecraft Launcher', root: join(appData, '.minecraft') },
      { launcher: 'CurseForge', root: join(home, 'curseforge', 'minecraft') },
      { launcher: 'Modrinth App', root: join(appData, 'ModrinthApp') },
      { launcher: 'Modrinth App', root: join(appData, 'com.modrinth.theseus') },
      { launcher: 'Prism Launcher', root: join(appData, 'PrismLauncher') },
      { launcher: 'PolyMC', root: join(appData, 'PolyMC') },
      { launcher: 'ATLauncher', root: join(appData, 'ATLauncher') },
      { launcher: 'GDLauncher', root: join(appData, 'gdlauncher_carbon') },
    ];
  }
  if (platform === 'darwin') {
    const support = join(home, 'Library', 'Application Support');
    return [
      { launcher: 'Minecraft Launcher', root: join(support, 'minecraft') },
      { launcher: 'CurseForge', root: join(home, 'Documents', 'curseforge', 'minecraft') },
      { launcher: 'Modrinth App', root: join(support, 'ModrinthApp') },
      { launcher: 'Prism Launcher', root: join(support, 'PrismLauncher') },
    ];
  }
  return [
    { launcher: 'Minecraft Launcher', root: join(home, '.minecraft') },
    { launcher: 'Modrinth App', root: join(home, '.local', 'share', 'ModrinthApp') },
    { launcher: 'Prism Launcher', root: join(home, '.local', 'share', 'PrismLauncher') },
  ];
}

/** Folders that never contain the client jar but can be huge. */
const SKIP_DIRS = new Set([
  'mods', 'saves', 'resourcepacks', 'shaderpacks', 'screenshots', 'logs', 'crash-reports', 'objects',
  'indexes', 'config', 'cache', 'caches', 'natives', 'java', 'runtime', 'jre', 'backups', 'downloads',
  'datapacks', 'schematics', 'journeymap', 'xaero', 'replay_recordings',
]);

const VERSION_PATTERN = /^\d+\.\d+(?:\.\d+)?$/;

/** Recognises client jar file names: "<v>/<v>.jar" (vanilla layout) or "minecraft-<v>-client.jar" (Prism/MultiMC). */
export function jarVersionFromPath(path: string): string | null {
  const parts = path.split(/[\\/]/);
  const file = parts.at(-1) ?? '';
  const parent = parts.at(-2) ?? '';
  const prism = /^minecraft-(\d+\.\d+(?:\.\d+)?)-client\.jar$/.exec(file);
  if (prism) return prism[1]!;
  const plain = /^(\d+\.\d+(?:\.\d+)?)\.jar$/.exec(file);
  if (plain && parent === plain[1]) return plain[1]!;
  if (file === 'client.jar' && VERSION_PATTERN.test(parent)) return parent;
  return null;
}

/** Bounded search for client jars in the launcher folders (depth and directory count limited). */
export async function findJarCandidates(
  roots: LauncherRoot[] = launcherRoots(),
  limits: { maxDepth?: number; maxDirs?: number } = {},
): Promise<JarCandidate[]> {
  const maxDepth = limits.maxDepth ?? 7;
  let budget = limits.maxDirs ?? 4000;
  const found: JarCandidate[] = [];
  const seen = new Set<string>();
  for (const { launcher, root } of roots) {
    if (!existsSync(root)) continue;
    const queue: { dir: string; depth: number }[] = [{ dir: root, depth: 0 }];
    while (queue.length > 0 && budget > 0) {
      const { dir, depth } = queue.shift()!;
      budget--;
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (depth < maxDepth && !SKIP_DIRS.has(entry.name.toLowerCase())) queue.push({ dir: full, depth: depth + 1 });
        } else if (entry.name.endsWith('.jar')) {
          const version = jarVersionFromPath(full);
          if (version && !seen.has(full)) {
            seen.add(full);
            found.push({ path: full, launcher, version });
          }
        }
      }
    }
  }
  return found;
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** Prefers the wanted version, then the newest one. */
export function pickCandidate(candidates: JarCandidate[], preferred: readonly string[]): JarCandidate | null {
  for (const v of preferred) {
    const hit = candidates.find((c) => c.version === v);
    if (hit) return hit;
  }
  return [...candidates].sort((a, b) => compareVersions(b.version, a.version))[0] ?? null;
}

export async function importJarFile(path: string, source: AssetSource, dir = assetCacheDir()): Promise<CachedAssets> {
  const info = await stat(path).catch(() => null);
  if (!info?.isFile()) throw new MinecraftJarError(`Datei nicht gefunden: ${path}`);
  const pack = readClientJar(await readFile(path));
  const entry: CachedAssets = { pack, source, importedAt: new Date().toISOString() };
  await saveCachedAssets(entry, dir);
  return entry;
}

export async function importJarBytes(data: Buffer, source: AssetSource, dir = assetCacheDir()): Promise<CachedAssets> {
  const pack = readClientJar(data);
  const entry: CachedAssets = { pack, source, importedAt: new Date().toISOString() };
  await saveCachedAssets(entry, dir);
  return entry;
}
