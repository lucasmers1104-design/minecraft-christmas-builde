import { describe, expect, it } from 'vitest';
import { decodeVarIntArray, encodeVarInt, encodeVarIntArray, VarIntDecodeError } from '@/core/export/encodeVarInt';

const enc = (v: number) => {
  const out: number[] = [];
  encodeVarInt(v, out);
  return out;
};

describe('VarInt', () => {
  it.each([
    [0, [0x00]],
    [1, [0x01]],
    [127, [0x7f]],
    [128, [0x80, 0x01]],
    [255, [0xff, 0x01]],
    [300, [0xac, 0x02]],
    [16383, [0xff, 0x7f]],
    [16384, [0x80, 0x80, 0x01]],
    [2097151, [0xff, 0xff, 0x7f]],
    [2147483647, [0xff, 0xff, 0xff, 0xff, 0x07]],
    [4294967295, [0xff, 0xff, 0xff, 0xff, 0x0f]],
  ])('kodiert %i als %j', (value, bytes) => {
    expect(enc(value)).toEqual(bytes);
    expect(Array.from(decodeVarIntArray(bytes, 1))).toEqual([value]);
  });

  it('Roundtrip gemischter Werte < 128 und >= 128', () => {
    const values = [0, 5, 127, 128, 129, 200, 1000, 65535, 3, 70000];
    const bytes = encodeVarIntArray(values);
    expect(bytes.length).toBe(1 + 1 + 1 + 2 + 2 + 2 + 2 + 3 + 1 + 3);
    expect(Array.from(decodeVarIntArray(bytes, values.length))).toEqual(values);
  });

  it('lehnt ungültige Werte und Datenströme ab', () => {
    expect(() => enc(-1)).toThrow(RangeError);
    expect(() => enc(1.5)).toThrow(RangeError);
    expect(() => enc(2 ** 32)).toThrow(RangeError);
    expect(() => decodeVarIntArray([0x80], 1)).toThrow(/abgeschnitten/);
    expect(() => decodeVarIntArray([0x01], 2)).toThrow(/abgeschnitten/);
    expect(() => decodeVarIntArray([0x01, 0x02], 1)).toThrow(/überzählige/);
    expect(() => decodeVarIntArray([0x80, 0x80, 0x80, 0x80, 0x80, 0x01], 1)).toThrow(VarIntDecodeError);
  });
});
