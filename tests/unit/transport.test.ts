import { describe, expect, it } from 'vitest';
import { generateBuilding } from '@/core/generator/generateBuilding';
import { DEFAULT_HOUSE_SPEC } from '@/core/schema/buildSpec';
import { MAX_VOLUME } from '@/core/schema/voxelModel';
import { base64ToBytes, bytesToBase64 } from '@/lib/serialization/base64';
import {
  decodeIndices,
  decodeVoxelTransport,
  encodeIndices,
  encodeVoxelTransport,
  MAX_INDICES_BASE64_LENGTH,
  TransportError,
} from '@/lib/serialization/voxelTransport';

const model = generateBuilding(DEFAULT_HOUSE_SPEC);

describe('base64', () => {
  it('stimmt mit Buffer überein und ist strikt', () => {
    for (const len of [0, 1, 2, 3, 4, 5, 100, 1001]) {
      const bytes = Uint8Array.from({ length: len }, (_, i) => (i * 37 + 11) & 0xff);
      const b64 = bytesToBase64(bytes);
      expect(b64).toBe(Buffer.from(bytes).toString('base64'));
      expect(Array.from(base64ToBytes(b64))).toEqual(Array.from(bytes));
    }
    expect(() => base64ToBytes('abc')).toThrow();
    expect(() => base64ToBytes('ab$=')).toThrow();
    expect(() => base64ToBytes('a=bc')).toThrow();
  });
});

describe('Voxel-Transport', () => {
  it('Indizes als little-endian uint16', () => {
    const b64 = encodeIndices(Uint16Array.from([1, 0x0203]));
    expect(Array.from(Buffer.from(b64, 'base64'))).toEqual([0x01, 0x00, 0x03, 0x02]);
    expect(Array.from(decodeIndices(b64, 2))).toEqual([1, 0x0203]);
  });

  it('Roundtrip ist verlustfrei inkl. Hash', () => {
    const transport = JSON.parse(JSON.stringify(encodeVoxelTransport(model)));
    const decoded = decodeVoxelTransport(transport);
    expect(decoded.hash).toBe(model.hash);
    expect(decoded.palette).toEqual(model.palette);
    expect(Array.from(decoded.indices)).toEqual(Array.from(model.indices));
    expect(decoded.spec).toEqual(model.spec);
  });

  it('maximale Payload ist dokumentiert und begrenzt', () => {
    expect(MAX_VOLUME).toBe(48 * 32 * 48);
    expect(MAX_INDICES_BASE64_LENGTH).toBe(196_608);
  });

  it('lehnt manipulierte oder kaputte Daten ab', () => {
    const t = encodeVoxelTransport(model);
    const reject = (input: unknown, reason: RegExp) => {
      let error: unknown;
      try {
        decodeVoxelTransport(input);
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(TransportError);
      expect((error as TransportError).issues.join(' ')).toMatch(reason);
    };
    reject({ ...t, hash: 'a'.repeat(64) }, /Hash/);
    reject({ ...t, hash: 'nope' }, /hash/);
    reject({ ...t, dimensions: { ...t.dimensions, width: 49 } }, /width/);
    reject({ ...t, indices: t.indices.slice(0, -4) }, /Indexdaten/);
    reject({ ...t, indices: '!!!!' }, /Base64|Indexdaten/);
    reject({ ...t, palette: ['minecraft:air', 'minecraft:tnt'] }, /nicht freigegeben|Palette|Index/);
    reject({ ...t, indexEncoding: 'u32' }, /indexEncoding/);
    reject({ ...t, spec: { ...t.spec, kind: 'castle' } }, /kind/);
    reject(null, /root|expected/i);
  });
});
