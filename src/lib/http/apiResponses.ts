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

/** JSON response that is never cached. */
export function jsonNoStore<T>(body: T, status = 200): NextResponse<T> {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

// ---------------------------------------------------------------------------------------------
// Origin checks. `next dev` / `next start` also listen on the LAN, and any web page in the
// browser can send requests to localhost. Routes that change settings or spend money check
// where a request comes from.

/** Host the request was sent to, e.g. "localhost:3000" (Host header, else the URL). */
export function requestHost(request: Request): string {
  const header = request.headers.get('host');
  if (header) return header.trim().toLowerCase();
  try {
    return new URL(request.url).host.toLowerCase();
  } catch {
    return '';
  }
}

/** localhost, 127.x.x.x or [::1] (with or without port). */
export function isLoopbackHost(host: string): boolean {
  if (!host) return false;
  let hostname: string;
  try {
    hostname = new URL(`http://${host}`).hostname.toLowerCase();
  } catch {
    return false;
  }
  return hostname === 'localhost' || hostname === '[::1]' || /^127(\.\d{1,3}){3}$/.test(hostname);
}

/**
 * Why a request does not come from the app's own page, or null. Browsers send Sec-Fetch-Site
 * and Origin; a request without both (curl, server to server) is not a browser attack and
 * passes.
 */
export function crossOriginProblem(request: Request): string | null {
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') return `Sec-Fetch-Site: ${site.slice(0, 40)}`;
  const origin = request.headers.get('origin');
  if (origin === null) return null;
  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    return `Origin: ${origin.slice(0, 100)}`;
  }
  return originHost !== '' && originHost === requestHost(request) ? null : `Origin: ${origin.slice(0, 100)}`;
}

export const CROSS_ORIGIN_MESSAGE =
  'Diese Anfrage kommt nicht von der App selbst (z. B. von einer fremden Webseite) und wurde aus Sicherheitsgründen abgelehnt.';

/**
 * Host names the app is really reached under: localhost, IP literals and single-label LAN
 * names ("desktop-luca"). A dotted name ("evil.example") pointing at this PC is a DNS
 * rebinding attempt – there Origin and Host match, so the origin check alone cannot see it.
 */
export function isDirectHost(host: string): boolean {
  if (isLoopbackHost(host)) return true;
  let hostname: string;
  try {
    hostname = new URL(`http://${host}`).hostname.toLowerCase();
  } catch {
    return false;
  }
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.startsWith('[') || /^[a-z0-9-]+$/.test(hostname);
}

/** 403 unless the request comes from the app's own page (or from no browser at all). */
export function rejectCrossOrigin(request: Request): NextResponse<ApiErrorBody> | null {
  const host = requestHost(request);
  if (!isDirectHost(host)) return jsonError(403, CROSS_ORIGIN_MESSAGE, [`Host: ${host.slice(0, 100)}`]);
  const problem = crossOriginProblem(request);
  return problem ? jsonError(403, CROSS_ORIGIN_MESSAGE, [problem]) : null;
}

/** 403 unless the request was sent to localhost on this PC AND comes from the app's own page. */
export function rejectUnlessLocal(request: Request): NextResponse<ApiErrorBody> | null {
  const host = requestHost(request);
  if (!isLoopbackHost(host)) {
    let port = '';
    try {
      port = new URL(`http://${host}`).port;
    } catch {
      // keep the default
    }
    return jsonError(
      403,
      `Diese Einstellungen lassen sich nur an dem PC ändern, auf dem die App läuft. Öffne sie dort über http://localhost${port ? `:${port}` : ''} (nicht über die Netzwerkadresse).`,
      [`Host: ${host.slice(0, 100)}`],
    );
  }
  return rejectCrossOrigin(request);
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
