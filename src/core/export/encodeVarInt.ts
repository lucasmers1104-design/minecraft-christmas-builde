/**
 * VarInt as used by Sponge schematics (same as the Minecraft protocol): 7 data bits per
 * byte, least-significant group first, high bit = "more bytes follow". Only non-negative
 * 32-bit values are valid palette indices.
 */
export const MAX_VARINT_BYTES = 5;

function checkVarIntValue(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError(`VarInt-Wert außerhalb des Bereichs: ${value}`);
  }
}

export function encodeVarInt(value: number, out: number[]): void {
  checkVarIntValue(value);
  let v = value >>> 0;
  while (v >= 0x80) {
    out.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  out.push(v);
}

/**
 * Encodes all values into one byte array. Writes into a typed buffer sized for one byte per
 * value (the common case: palette ids < 128) and grows it geometrically only when wider
 * VarInts appear, so millions of values never pass through a JS number[]. Returns a view
 * of exactly the written bytes.
 */
export function encodeVarIntArray(values: ArrayLike<number>): Uint8Array {
  let out = new Uint8Array(Math.max(16, values.length));
  let pos = 0;
  for (let i = 0; i < values.length; i++) {
    const value = values[i]!;
    checkVarIntValue(value);
    if (pos + MAX_VARINT_BYTES > out.length) {
      // At least double, and always leave room for the remaining values at one byte each.
      const grown = new Uint8Array(Math.max(out.length * 2, pos + (values.length - i) + MAX_VARINT_BYTES));
      grown.set(out.subarray(0, pos));
      out = grown;
    }
    let v = value >>> 0;
    while (v >= 0x80) {
      out[pos++] = (v & 0x7f) | 0x80;
      v >>>= 7;
    }
    out[pos++] = v;
  }
  return out.subarray(0, pos);
}

export class VarIntDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VarIntDecodeError';
  }
}

/** Decodes exactly `count` VarInts and requires the stream to end right after them. */
export function decodeVarIntArray(bytes: ArrayLike<number>, count: number): Uint32Array {
  const result = new Uint32Array(count);
  let pos = 0;
  for (let i = 0; i < count; i++) {
    if (pos >= bytes.length) {
      throw new VarIntDecodeError(`VarInt-Datenstrom abgeschnitten bei Eintrag ${i} von ${count} (Byte ${pos})`);
    }
    const first = bytes[pos]! & 0xff;
    if (first < 0x80) {
      // Fast path: single-byte VarInt (palette ids < 128).
      result[i] = first;
      pos++;
      continue;
    }
    let value = 0;
    let shift = 0;
    let byteCount = 0;
    for (;;) {
      if (pos >= bytes.length) {
        throw new VarIntDecodeError(`VarInt-Datenstrom abgeschnitten bei Eintrag ${i} von ${count} (Byte ${pos})`);
      }
      const byte = bytes[pos++]! & 0xff;
      byteCount++;
      if (byteCount > MAX_VARINT_BYTES) throw new VarIntDecodeError(`VarInt bei Eintrag ${i} ist länger als 5 Bytes`);
      value += (byte & 0x7f) * 2 ** shift;
      shift += 7;
      if ((byte & 0x80) === 0) break;
    }
    if (value > 0xffffffff) throw new VarIntDecodeError(`VarInt bei Eintrag ${i} überschreitet 32 Bit`);
    result[i] = value;
  }
  if (pos !== bytes.length) {
    throw new VarIntDecodeError(`Nach ${count} VarInts folgen noch ${bytes.length - pos} überzählige Bytes`);
  }
  return result;
}
