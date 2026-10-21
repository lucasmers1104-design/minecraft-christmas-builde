import { NextResponse } from 'next/server';

export interface ApiErrorBody {
  error: string;
  issues?: string[];
}

export function jsonError(status: number, error: string, issues?: string[]): NextResponse<ApiErrorBody> {
  return NextResponse.json(issues && issues.length > 0 ? { error, issues } : { error }, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export class RequestBodyError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'RequestBodyError';
  }
}

/** Reads a JSON body with a hard byte limit (checked on the actual bytes, not just the header). */
export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new RequestBodyError(413, `Anfrage zu groß (${declared} Bytes, erlaubt ${maxBytes})`);
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) {
    throw new RequestBodyError(413, `Anfrage zu groß (erlaubt ${maxBytes} Bytes)`);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new RequestBodyError(400, 'Anfrage ist kein gültiges JSON');
  }
}
