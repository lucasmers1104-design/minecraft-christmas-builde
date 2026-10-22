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

/**
 * Reads the raw body as a stream and stops (413) as soon as more than `maxBytes` arrived,
 * so an oversized or lying (no/false Content-Length) request is never buffered completely.
 */
async function readBodyBytes(request: Request, maxBytes: number): Promise<Uint8Array> {
  if (!request.body) return new Uint8Array(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new RequestBodyError(413, `Anfrage zu groß (erlaubt ${maxBytes} Bytes)`);
    }
    chunks.push(value);
  }
  if (chunks.length === 1) return chunks[0]!;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

/** Reads a JSON body with a hard byte limit (checked on the actual bytes, not just the header). */
export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new RequestBodyError(413, `Anfrage zu groß (${declared} Bytes, erlaubt ${maxBytes})`);
  }
  const bytes = await readBodyBytes(request, maxBytes);
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new RequestBodyError(400, 'Anfrage ist kein gültiges UTF-8');
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new RequestBodyError(400, 'Anfrage ist kein gültiges JSON');
  }
}
