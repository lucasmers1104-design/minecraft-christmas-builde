import { listBlockDefinitions } from '@/core/blocks/registry';
import { SUPPORTED_MINECRAFT_VERSIONS } from '@/core/compat/profile';
import type { AssetPack } from '@/core/textures/assetTypes';
import { packSubset } from '@/core/textures/closure';
import {
  assetCacheDir,
  findJarCandidates,
  importJarFile,
  launcherRoots,
  loadCachedAssets,
  MinecraftJarError,
  pickCandidate,
  type AssetSource,
  type CachedAssets,
  type JarCandidate,
} from '@/lib/textures/minecraftJar';

/** What the UI shows about the real-texture setup. */
export interface TextureStatus {
  available: boolean;
  version?: string;
  source?: AssetSource;
  importedAt?: string;
  /** Client jars found in launcher folders. */
  candidates: { launcher: string; version: string; path: string }[];
  message: string;
}

function readyMessage(entry: CachedAssets): string {
  return `Echte Texturen aus Minecraft ${entry.pack.version} (${entry.source.label}).`;
}

/**
 * Status, importing on first use: an explicit MINECRAFT_JAR path wins, then a cached import,
 * then a client jar found in the launcher folders (preferring the app's Minecraft versions).
 */
export async function getTextureStatus(env: Record<string, string | undefined> = process.env): Promise<TextureStatus> {
  const dir = assetCacheDir(env);
  const explicit = env.MINECRAFT_JAR?.trim();
  let cached = await loadCachedAssets(dir);
  if (explicit && cached?.source.path !== explicit) {
    try {
      cached = await importJarFile(explicit, { kind: 'env', label: 'MINECRAFT_JAR', path: explicit }, dir);
    } catch (error) {
      if (!(error instanceof MinecraftJarError)) throw error;
      return { available: false, candidates: [], message: `MINECRAFT_JAR: ${error.message}` };
    }
  }
  if (cached) {
    return {
      available: true,
      version: cached.pack.version,
      source: cached.source,
      importedAt: cached.importedAt,
      candidates: [],
      message: readyMessage(cached),
    };
  }

  let candidates: JarCandidate[] = [];
  try {
    candidates = await findJarCandidates(launcherRoots(env));
  } catch {
    candidates = [];
  }
  const pick = pickCandidate(candidates, SUPPORTED_MINECRAFT_VERSIONS);
  if (pick) {
    try {
      const entry = await importJarFile(pick.path, { kind: 'launcher', label: `${pick.launcher}, ${pick.version}`, path: pick.path }, dir);
      return {
        available: true,
        version: entry.pack.version,
        source: entry.source,
        importedAt: entry.importedAt,
        candidates,
        message: readyMessage(entry),
      };
    } catch (error) {
      if (!(error instanceof MinecraftJarError)) throw error;
      return { available: false, candidates, message: `${pick.path}: ${error.message}` };
    }
  }
  return {
    available: false,
    candidates,
    message:
      'Keine Minecraft-Installation gefunden. Wähle die Minecraft-Datei (…/versions/1.21.11/1.21.11.jar) aus oder lade sie von Mojang.',
  };
}

export function statusFromEntry(entry: CachedAssets): TextureStatus {
  return {
    available: true,
    version: entry.pack.version,
    source: entry.source,
    importedAt: entry.importedAt,
    candidates: [],
    message: readyMessage(entry),
  };
}

/** Models and textures for every block the app can place. */
export async function getBlockResources(env: Record<string, string | undefined> = process.env): Promise<AssetPack | null> {
  const cached = await loadCachedAssets(assetCacheDir(env));
  if (!cached) return null;
  return packSubset(
    cached.pack,
    listBlockDefinitions().map((d) => d.id),
  );
}
