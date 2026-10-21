/** Strict, isomorphic base64 (RFC 4648, with padding). Works without Buffer or btoa. */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP = new Int16Array(128).fill(-1);
for (let i = 0; i < ALPHABET.length; i++) LOOKUP[ALPHABET.charCodeAt(i)] = i;

export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8) | bytes[i + 2]!;
    out += ALPHABET[(n >> 18) & 63]! + ALPHABET[(n >> 12) & 63]! + ALPHABET[(n >> 6) & 63]! + ALPHABET[n & 63]!;
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i]! << 16;
    out += ALPHABET[(n >> 18) & 63]! + ALPHABET[(n >> 12) & 63]! + '==';
  } else if (rest === 2) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8);
    out += ALPHABET[(n >> 18) & 63]! + ALPHABET[(n >> 12) & 63]! + ALPHABET[(n >> 6) & 63]! + '=';
  }
  return out;
}

export function base64ToBytes(text: string): Uint8Array {
  if (text.length % 4 !== 0) throw new Error('Base64-Länge ist kein Vielfaches von 4');
  const padding = text.endsWith('==') ? 2 : text.endsWith('=') ? 1 : 0;
  const out = new Uint8Array((text.length / 4) * 3 - padding);
  let o = 0;
  for (let i = 0; i < text.length; i += 4) {
    const isLast = i + 4 === text.length;
    const values = [0, 0, 0, 0];
    for (let j = 0; j < 4; j++) {
      const ch = text.charCodeAt(i + j);
      if (isLast && j >= 4 - padding) {
        if (text[i + j] !== '=') throw new Error('Ungültiges Base64-Padding');
        continue;
      }
      const v = ch < 128 ? LOOKUP[ch]! : -1;
      if (v < 0) throw new Error(`Ungültiges Base64-Zeichen an Position ${i + j}`);
      values[j] = v;
    }
    const n = (values[0]! << 18) | (values[1]! << 12) | (values[2]! << 6) | values[3]!;
    if (o < out.length) out[o++] = (n >> 16) & 0xff;
    if (o < out.length) out[o++] = (n >> 8) & 0xff;
    if (o < out.length) out[o++] = n & 0xff;
  }
  return out;
}
