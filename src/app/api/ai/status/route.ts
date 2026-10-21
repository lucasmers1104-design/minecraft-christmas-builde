import { NextResponse } from 'next/server';
import { getAiStatus, readAiConfig } from '@/lib/ai/ollamaPlanner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Reports whether the optional local AI (Ollama) is enabled, reachable and has the model. */
export async function GET(): Promise<NextResponse> {
  const status = await getAiStatus(readAiConfig());
  return NextResponse.json(status, { headers: { 'Cache-Control': 'no-store' } });
}
