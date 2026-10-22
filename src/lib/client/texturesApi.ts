import type { AssetPack } from '@/core/textures/assetTypes';
import type { TextureStatus } from '@/lib/textures/textureService';

export type { TextureStatus };

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export async function fetchTextureStatus(signal?: AbortSignal): Promise<TextureStatus> {
  const res = await fetch('/api/textures', { cache: 'no-store', signal });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as TextureStatus;
}

export async function fetchTextureResources(signal?: AbortSignal): Promise<AssetPack> {
  const res = await fetch('/api/textures/resources', { cache: 'no-store', signal });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as AssetPack;
}

/** Sends a client jar the user picked to the local server, which extracts the block assets. */
export async function importMinecraftJar(file: File): Promise<TextureStatus> {
  const res = await fetch('/api/textures/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/java-archive', 'X-File-Name': encodeURIComponent(file.name) },
    body: file,
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as TextureStatus;
}

export async function downloadMinecraftJar(version: string): Promise<TextureStatus> {
  const res = await fetch('/api/textures/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version, acceptEula: true }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as TextureStatus;
}
