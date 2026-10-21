/**
 * Minimal, strict big-endian NBT reader (Java Edition). Deliberately independent of the
 * prismarine-nbt writer so that validating a freshly written file is a second, separate
 * implementation of the format rather than a roundtrip through the same library.
 */

export const TAG = {
  End: 0,
  Byte: 1,
  Short: 2,
  Int: 3,
  Long: 4,
  Float: 5,
  Double: 6,
  ByteArray: 7,
  String: 8,
  List: 9,
  Compound: 10,
  IntArray: 11,
  LongArray: 12,
} as const;
export type TagId = (typeof TAG)[keyof typeof TAG];

export type NbtTag =
  | { type: typeof TAG.Byte; value: number }
  | { type: typeof TAG.Short; value: number }
  | { type: typeof TAG.Int; value: number }
  | { type: typeof TAG.Long; value: bigint }
  | { type: typeof TAG.Float; value: number }
  | { type: typeof TAG.Double; value: number }
  | { type: typeof TAG.ByteArray; value: Int8Array }
  | { type: typeof TAG.String; value: string }
  | { type: typeof TAG.List; elementType: TagId; value: NbtTag[] }
  | { type: typeof TAG.Compound; value: Map<string, NbtTag> }
  | { type: typeof TAG.IntArray; value: Int32Array }
  | { type: typeof TAG.LongArray; value: BigInt64Array };

export interface NamedRoot {
  name: string;
  tag: NbtTag & { type: typeof TAG.Compound };
}

export class NbtReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NbtReadError';
  }
}

const MAX_DEPTH = 64;

class Cursor {
  private pos = 0;
  private readonly view: DataView;
  constructor(private readonly bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  get position(): number {
    return this.pos;
  }
  get remaining(): number {
    return this.bytes.length - this.pos;
  }
  private need(n: number): void {
    if (n < 0 || this.pos + n > this.bytes.length) {
      throw new NbtReadError(`Unerwartetes Dateiende bei Byte ${this.pos} (benötigt ${n})`);
    }
  }
  u8(): number {
    this.need(1);
    return this.view.getUint8(this.pos++);
  }
  i8(): number {
    this.need(1);
    return this.view.getInt8(this.pos++);
  }
  i16(): number {
    this.need(2);
    const v = this.view.getInt16(this.pos, false);
    this.pos += 2;
    return v;
  }
  u16(): number {
    this.need(2);
    const v = this.view.getUint16(this.pos, false);
    this.pos += 2;
    return v;
  }
  i32(): number {
    this.need(4);
    const v = this.view.getInt32(this.pos, false);
    this.pos += 4;
    return v;
  }
  i64(): bigint {
    this.need(8);
    const v = this.view.getBigInt64(this.pos, false);
    this.pos += 8;
    return v;
  }
  f32(): number {
    this.need(4);
    const v = this.view.getFloat32(this.pos, false);
    this.pos += 4;
    return v;
  }
  f64(): number {
    this.need(8);
    const v = this.view.getFloat64(this.pos, false);
    this.pos += 8;
    return v;
  }
  slice(n: number): Uint8Array {
    this.need(n);
    const out = this.bytes.slice(this.pos, this.pos + n);
    this.pos += n;
    return out;
  }
  string(): string {
    const length = this.u16();
    // Java uses "modified UTF-8"; for the ASCII identifiers used in schematics it is identical.
    return new TextDecoder('utf-8', { fatal: true }).decode(this.slice(length));
  }
  arrayLength(): number {
    const length = this.i32();
    if (length < 0) throw new NbtReadError(`Negative Array-Länge ${length} bei Byte ${this.pos - 4}`);
    return length;
  }
}

function readPayload(c: Cursor, type: number, depth: number): NbtTag {
  if (depth > MAX_DEPTH) throw new NbtReadError('NBT zu tief verschachtelt');
  switch (type) {
    case TAG.Byte:
      return { type: TAG.Byte, value: c.i8() };
    case TAG.Short:
      return { type: TAG.Short, value: c.i16() };
    case TAG.Int:
      return { type: TAG.Int, value: c.i32() };
    case TAG.Long:
      return { type: TAG.Long, value: c.i64() };
    case TAG.Float:
      return { type: TAG.Float, value: c.f32() };
    case TAG.Double:
      return { type: TAG.Double, value: c.f64() };
    case TAG.ByteArray: {
      const length = c.arrayLength();
      const raw = c.slice(length);
      return { type: TAG.ByteArray, value: new Int8Array(raw.buffer, raw.byteOffset, raw.byteLength) };
    }
    case TAG.String:
      return { type: TAG.String, value: c.string() };
    case TAG.List: {
      const elementType = c.u8();
      const length = c.arrayLength();
      if (elementType > TAG.LongArray) throw new NbtReadError(`Unbekannter Listen-Elementtyp ${elementType}`);
      if (elementType === TAG.End && length > 0) throw new NbtReadError('Liste vom Typ TAG_End mit Elementen');
      const items: NbtTag[] = [];
      for (let i = 0; i < length; i++) items.push(readPayload(c, elementType, depth + 1));
      return { type: TAG.List, elementType: elementType as TagId, value: items };
    }
    case TAG.Compound: {
      const value = new Map<string, NbtTag>();
      for (;;) {
        const childType = c.u8();
        if (childType === TAG.End) break;
        if (childType > TAG.LongArray) throw new NbtReadError(`Unbekannter Tag-Typ ${childType} bei Byte ${c.position - 1}`);
        const name = c.string();
        if (value.has(name)) throw new NbtReadError(`Doppelter Schlüssel "${name}" im Compound`);
        value.set(name, readPayload(c, childType, depth + 1));
      }
      return { type: TAG.Compound, value };
    }
    case TAG.IntArray: {
      const length = c.arrayLength();
      const out = new Int32Array(length);
      for (let i = 0; i < length; i++) out[i] = c.i32();
      return { type: TAG.IntArray, value: out };
    }
    case TAG.LongArray: {
      const length = c.arrayLength();
      const out = new BigInt64Array(length);
      for (let i = 0; i < length; i++) out[i] = c.i64();
      return { type: TAG.LongArray, value: out };
    }
    default:
      throw new NbtReadError(`Unbekannter Tag-Typ ${type}`);
  }
}

/** Reads one named root compound and requires the buffer to end right after it. */
export function readNbt(bytes: Uint8Array): NamedRoot {
  const c = new Cursor(bytes);
  const rootType = c.u8();
  if (rootType !== TAG.Compound) throw new NbtReadError(`Root-Tag ist kein Compound (Typ ${rootType})`);
  const name = c.string();
  const tag = readPayload(c, TAG.Compound, 0) as NbtTag & { type: typeof TAG.Compound };
  if (c.remaining !== 0) throw new NbtReadError(`${c.remaining} überzählige Bytes nach dem Root-Compound`);
  return { name, tag };
}
