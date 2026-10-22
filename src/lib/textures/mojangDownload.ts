import { createHash } from 'node:crypto';
import { MinecraftJarError } from '@/lib/textures/minecraftJar';

/**
 * Downloads the official client jar of one Minecraft version from Mojang's servers – only after
 * the user confirmed owning Minecraft Java and accepting the Minecraft EULA in the UI. The
 * download URL and SHA-1 come from Mojang's version manifest; the file is verified before use.
 */

export const VERSION_MANIFEST_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
const ALLOWED_HOSTS = new Set(['piston-meta.mojang.com', 'piston-data.mojang.com', 'launchermeta.mojang.com', 'launcher.mojang.com']);

type FetchLike = typeof fetch;

function checkedUrl(url: string): string {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
    throw new MinecraftJarError(`Unerwartete Download-Adresse: ${parsed.hostname}`);
  }
  return parsed.toString();
}

async function getJson<T>(url: string, fetchImpl: FetchLike, timeoutMs: number): Promise<T> {
  const res = await fetchImpl(checkedUrl(url), { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new MinecraftJarError(`Mojang-Server antwortete mit HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function downloadClientJar(version: string, fetchImpl: FetchLike = fetch, timeoutMs = 120_000): Promise<Buffer> {
  try {
    const manifest = await getJson<{ versions?: { id: string; url: string }[] }>(VERSION_MANIFEST_URL, fetchImpl, 20_000);
    const entry = manifest.versions?.find((v) => v.id === version);
    if (!entry) throw new MinecraftJarError(`Minecraft ${version} ist in Mojangs Versionsliste nicht vorhanden`);
    const meta = await getJson<{ downloads?: { client?: { url: string; sha1: string; size: number } } }>(entry.url, fetchImpl, 20_000);
    const client = meta.downloads?.client;
    if (!client) throw new MinecraftJarError(`Für Minecraft ${version} gibt es keine Client-Datei`);
    const res = await fetchImpl(checkedUrl(client.url), { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) throw new MinecraftJarError(`Download fehlgeschlagen (HTTP ${res.status})`);
    const data = Buffer.from(await res.arrayBuffer());
    const sha1 = createHash('sha1').update(data).digest('hex');
    if (data.length !== client.size || sha1 !== client.sha1) {
      throw new MinecraftJarError('Die heruntergeladene Datei ist unvollständig oder beschädigt (Prüfsumme falsch)');
    }
    return data;
  } catch (error) {
    if (error instanceof MinecraftJarError) throw error;
    const name = (error as Error).name;
    if (name === 'TimeoutError' || name === 'AbortError') throw new MinecraftJarError('Der Download von Mojang hat zu lange gedauert');
    throw new MinecraftJarError(`Mojang-Server nicht erreichbar: ${(error as Error).message}`);
  }
}
