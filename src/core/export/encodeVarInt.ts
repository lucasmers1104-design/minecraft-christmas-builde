/**
 * VarInt as used by Sponge schematics (same as the Minecraft protocol): 7 data bits per
 * byte, least-significant group first, high bit = "more bytes follow". Only non-negative
 * 32-bit values are valid palette indices.
 */
export const MAX_VARINT_BYTES = 5;

export function encodeVarInt(value: number, out: number[]): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError(`VarInt-Wert außerhalb des Bereichs: ${value}`);
  }
  let v = value >>> 0;
  while (v >= 0x80) {
    out.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  out.push(v);
}

export function encodeVarIntArray(values: ArrayLike<number>): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) encodeVarInt(values[i]!, out);
  return Uint8Array.from(out);
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
