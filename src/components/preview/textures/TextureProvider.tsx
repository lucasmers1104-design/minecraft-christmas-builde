'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  downloadMinecraftJar,
  fetchTextureResources,
  fetchTextureStatus,
  importMinecraftJar,
  type TextureStatus,
} from '@/lib/client/texturesApi';
import { buildTexturePack, type ClientTexturePack } from '@/components/preview/textures/textureAtlas';

export interface TextureContextValue {
  status: TextureStatus | null;
  /** Checking, importing or building the atlas. */
  busy: string | null;
  error: string | null;
  /** Ready-to-use textures, or null (preview then uses plain colours). */
  pack: ClientTexturePack | null;
  /** User switch: show real textures when available. */
  enabled: boolean;
  setEnabled: (on: boolean) => void;
  refresh: () => void;
  importFile: (file: File) => Promise<void>;
  downloadFromMojang: (version: string) => Promise<void>;
}

const TextureContext = createContext<TextureContextValue | null>(null);

export function useTextures(): TextureContextValue {
  const value = useContext(TextureContext);
  if (!value) throw new Error('useTextures außerhalb von TextureProvider');
  return value;
}

/** Active pack for rendering: only when available and switched on. */
export function useActiveTexturePack(): ClientTexturePack | null {
  const { pack, enabled } = useTextures();
  return enabled ? pack : null;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function TextureProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<TextureStatus | null>(null);
  const [busy, setBusy] = useState<string | null>('Suche Minecraft-Texturen …');
  const [error, setError] = useState<string | null>(null);
  const [pack, setPack] = useState<ClientTexturePack | null>(null);
  const [enabled, setEnabled] = useState(true);
  const generation = useRef(0);

  // Every request gets a generation number; answers of older requests are ignored, so a slow
  // first status check can never overwrite a newer import.
  const apply = useCallback(async (next: TextureStatus, id: number) => {
    if (generation.current !== id) return;
    setStatus(next);
    if (!next.available) {
      setPack(null);
      return;
    }
    setBusy('Texturen werden vorbereitet …');
    const resources = await fetchTextureResources();
    if (generation.current !== id) return;
    const built = await buildTexturePack(resources);
    if (generation.current === id) setPack(built);
  }, []);

  const run = useCallback(
    async (label: string, action: () => Promise<TextureStatus>) => {
      const id = ++generation.current;
      setBusy(label);
      setError(null);
      try {
        await apply(await action(), id);
      } catch (e) {
        if (generation.current === id) setError(describe(e));
      } finally {
        if (generation.current === id) setBusy(null);
      }
    },
    [apply],
  );

  useEffect(() => {
    const id = ++generation.current;
    fetchTextureStatus()
      .then((s) => apply(s, id))
      .catch((e) => {
        if (generation.current === id) setError(describe(e));
      })
      .finally(() => {
        if (generation.current === id) setBusy(null);
      });
  }, [apply]);

  const value = useMemo<TextureContextValue>(
    () => ({
      status,
      busy,
      error,
      pack,
      enabled,
      setEnabled,
      refresh: () => void run('Suche Minecraft-Texturen …', () => fetchTextureStatus()),
      importFile: (file) => run('Minecraft-Datei wird gelesen …', () => importMinecraftJar(file)),
      downloadFromMojang: (version) => run(`Minecraft ${version} wird von Mojang geladen …`, () => downloadMinecraftJar(version)),
    }),
    [status, busy, error, pack, enabled, run],
  );

  return <TextureContext.Provider value={value}>{children}</TextureContext.Provider>;
}
