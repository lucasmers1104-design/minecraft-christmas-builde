/**
 * Strict, isomorphic base64 (RFC 4648, with padding). Works without Buffer or btoa.
 *
 * Both directions are linear and allocation-light so that multi-megabyte index payloads
 * (up to 36 MiB of base64 for the largest models) stay fast: encoding writes ASCII codes
 * into one byte array and converts it with a single native TextDecoder call (no repeated
 * string `+=`), decoding reads char codes directly into the output array.
 */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const ENCODE = new Uint8Array(64);
for (let i = 0; i < ALPHABET.length; i++) ENCODE[i] = ALPHABET.charCodeAt(i);
const LOOKUP = new Int16Array(128).fill(-1);
for (let i = 0; i < ALPHABET.length; i++) LOOKUP[ALPHABET.charCodeAt(i)] = i;
const PAD = 0x3d; // '='

/** Length of the base64 text (with padding) for `byteLength` bytes. */
export function base64LengthFor(byteLength: number): number {
  return Math.ceil(byteLength / 3) * 4;
}

/** The output is pure ASCII, so UTF-8 decoding is exact; the native decoder builds the string in one step. */
const asciiDecoder = new TextDecoder();

export function bytesToBase64(bytes: Uint8Array): string {
  const out = new Uint8Array(base64LengthFor(bytes.length));
  let o = 0;
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8) | bytes[i + 2]!;
    out[o++] = ENCODE[(n >> 18) & 63]!;
    out[o++] = ENCODE[(n >> 12) & 63]!;
    out[o++] = ENCODE[(n >> 6) & 63]!;
    out[o++] = ENCODE[n & 63]!;
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i]! << 16;
    out[o++] = ENCODE[(n >> 18) & 63]!;
    out[o++] = ENCODE[(n >> 12) & 63]!;
    out[o++] = PAD;
    out[o++] = PAD;
  } else if (rest === 2) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8);
    out[o++] = ENCODE[(n >> 18) & 63]!;
    out[o++] = ENCODE[(n >> 12) & 63]!;
    out[o++] = ENCODE[(n >> 6) & 63]!;
    out[o++] = PAD;
  }
  return asciiDecoder.decode(out);
}

function sextet(text: string, position: number): number {
  const ch = text.charCodeAt(position);
  const v = ch < 128 ? LOOKUP[ch]! : -1;
  if (v < 0) throw new Error(`Ungültiges Base64-Zeichen an Position ${position}`);
  return v;
}

/** Decodes strictly: length multiple of 4, only alphabet characters, padding only at the end. */
export function base64ToBytes(text: string): Uint8Array {
  if (text.length % 4 !== 0) throw new Error('Base64-Länge ist kein Vielfaches von 4');
  if (text.length === 0) return new Uint8Array(0);
  const padding = text.endsWith('==') ? 2 : text.endsWith('=') ? 1 : 0;
  const out = new Uint8Array((text.length / 4) * 3 - padding);
  const fullQuads = text.length - 4;
  let o = 0;
  for (let i = 0; i < fullQuads; i += 4) {
    const n = (sextet(text, i) << 18) | (sextet(text, i + 1) << 12) | (sextet(text, i + 2) << 6) | sextet(text, i + 3);
    out[o++] = (n >> 16) & 0xff;
    out[o++] = (n >> 8) & 0xff;
    out[o++] = n & 0xff;
  }
  // Last quad: may carry one or two '=' (already counted in `padding`).
  const last = fullQuads;
  const a = sextet(text, last);
  const b = sextet(text, last + 1);
  const c = padding === 2 ? 0 : sextet(text, last + 2);
  const d = padding >= 1 ? 0 : sextet(text, last + 3);
  const n = (a << 18) | (b << 12) | (c << 6) | d;
  out[o++] = (n >> 16) & 0xff;
  if (padding < 2) out[o++] = (n >> 8) & 0xff;
  if (padding < 1) out[o++] = n & 0xff;
  return out;
}
