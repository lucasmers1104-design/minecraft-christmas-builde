import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/http/apiResponses';
import { getBlockResources } from '@/lib/textures/textureService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Block states, models and textures for every block the app can place (from the user's own jar). */
export async function GET(): Promise<Response> {
  const pack = await getBlockResources();
  if (!pack) return jsonError(404, 'Noch keine Minecraft-Texturen eingerichtet');
  return NextResponse.json(pack, { headers: { 'Cache-Control': 'no-store' } });
}
