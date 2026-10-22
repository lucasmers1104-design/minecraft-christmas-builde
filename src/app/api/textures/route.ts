import { NextResponse } from 'next/server';
import { getTextureStatus } from '@/lib/textures/textureService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Real-texture status; imports the client jar from a launcher folder on first use. */
export async function GET(): Promise<Response> {
  return NextResponse.json(await getTextureStatus(), { headers: { 'Cache-Control': 'no-store' } });
}
