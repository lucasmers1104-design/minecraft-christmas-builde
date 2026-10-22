import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SUPPORTED_MINECRAFT_VERSIONS } from '@/core/compat/profile';
import { jsonError, readJsonBody, RequestBodyError } from '@/lib/http/apiResponses';
import { importJarBytes, MinecraftJarError } from '@/lib/textures/minecraftJar';
import { downloadClientJar } from '@/lib/textures/mojangDownload';
import { statusFromEntry } from '@/lib/textures/textureService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z
  .object({
    version: z.string().refine((v) => SUPPORTED_MINECRAFT_VERSIONS.includes(v)),
    // The user must confirm owning Minecraft Java and accepting the Minecraft EULA.
    acceptEula: z.literal(true),
  })
  .strict();

/** Downloads the official client jar from Mojang (only with explicit consent) and imports it. */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await readJsonBody(request, 1024);
  } catch (error) {
    if (error instanceof RequestBodyError) return jsonError(error.status, error.message);
    throw error;
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError(400, 'Download nur mit Zustimmung zur Minecraft-EULA und unterstützter Version');
  try {
    const jar = await downloadClientJar(parsed.data.version);
    const entry = await importJarBytes(jar, { kind: 'mojang', label: `von Mojang geladen, ${parsed.data.version}` });
    return NextResponse.json(statusFromEntry(entry), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof MinecraftJarError) return jsonError(502, error.message);
    throw error;
  }
}
