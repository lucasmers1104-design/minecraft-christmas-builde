import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/http/apiResponses';
import { importJarBytes, MinecraftJarError } from '@/lib/textures/minecraftJar';
import { statusFromEntry } from '@/lib/textures/textureService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Client jars are about 30 MB; anything far larger is not one. */
const MAX_JAR_BYTES = 200 * 1024 * 1024;

/** Imports a Minecraft client jar the user picked in the browser (raw request body). */
export async function POST(request: Request): Promise<Response> {
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > MAX_JAR_BYTES) return jsonError(413, 'Datei zu groß für eine Minecraft-Client-Datei');
  const data = Buffer.from(await request.arrayBuffer());
  if (data.length === 0) return jsonError(400, 'Keine Datei empfangen');
  if (data.length > MAX_JAR_BYTES) return jsonError(413, 'Datei zu groß für eine Minecraft-Client-Datei');
  const fileName = request.headers.get('x-file-name')?.slice(0, 200) || 'ausgewählte Datei';
  try {
    const entry = await importJarBytes(data, { kind: 'upload', label: decodeURIComponent(fileName) });
    return NextResponse.json(statusFromEntry(entry), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof MinecraftJarError) return jsonError(422, error.message);
    throw error;
  }
}
