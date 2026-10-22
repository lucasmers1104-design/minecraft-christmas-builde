import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { checkBlockState } from '@/core/blocks/registry';
import { generateBuilding } from '@/core/generator/generateBuilding';
import { DEFAULT_HOUSE_SPEC } from '@/core/schema/buildSpec';
import { createVoxelModel, MAX_PALETTE_SIZE, MAX_VOLUME } from '@/core/schema/voxelModel';
import { base64LengthFor, base64ToBytes, bytesToBase64 } from '@/lib/serialization/base64';
import {
  decodeIndices,
  decodeIndicesRle,
  decodeIndicesU16le,
  decodeVoxelTransport,
  encodeIndices,
  encodeIndicesU16le,
  encodeRleBytes,
  encodeVoxelTransport,
  MAX_INDICES_BASE64_LENGTH,
  MAX_TRANSPORT_REQUEST_BYTES,
  rleByteLength,
  TransportError,
} from '@/lib/serialization/voxelTransport';
import { allRegistryStates } from '../helpers/syntheticModels';

const model = generateBuilding(DEFAULT_HOUSE_SPEC);

function transportIssues(input: unknown): string {
  let error: unknown;
  try {
    decodeVoxelTransport(input);
  } catch (e) {
    error = e;
  }
  expect(error).toBeInstanceOf(TransportError);
  return (error as TransportError).issues.join(' ');
}

function rleIssues(bytes: number[], count: number, paletteSize = 4): string {
  let error: unknown;
  try {
    decodeIndicesRle(bytesToBase64(Uint8Array.from(bytes)), count, paletteSize);
  } catch (e) {
    error = e;
  }
  expect(error).toBeInstanceOf(TransportError);
  return (error as TransportError).issues.join(' ');
}

/** Legacy payload written independently of our encoder (as the old code did). */
function legacyU16le(indices: Uint16Array): string {
  const bytes = Buffer.alloc(indices.length * 2);
  indices.forEach((v, i) => bytes.writeUInt16LE(v, i * 2));
  return bytes.toString('base64');
}

describe('base64', () => {
  it('stimmt mit Buffer überein und ist strikt', () => {
    for (const len of [0, 1, 2, 3, 4, 5, 100, 1001]) {
      const bytes = Uint8Array.from({ length: len }, (_, i) => (i * 37 + 11) & 0xff);
      const b64 = bytesToBase64(bytes);
      expect(b64).toBe(Buffer.from(bytes).toString('base64'));
      expect(b64.length).toBe(base64LengthFor(len));
      expect(Array.from(base64ToBytes(b64))).toEqual(Array.from(bytes));
    }
    expect(() => base64ToBytes('abc')).toThrow();
    expect(() => base64ToBytes('ab$=')).toThrow();
    expect(() => base64ToBytes('a=bc')).toThrow();
    expect(() => base64ToBytes('ab==abcd')).toThrow();
    expect(() => base64ToBytes('====')).toThrow();
    expect(() => base64ToBytes('abcä')).toThrow();
  });

  it('kodiert und dekodiert mehrere MiB identisch zu Buffer', () => {
    const bytes = new Uint8Array(randomBytes(3 * 1024 * 1024 + 2));
    const b64 = bytesToBase64(bytes);
    expect(b64).toBe(Buffer.from(bytes).toString('base64'));
    expect(Buffer.from(base64ToBytes(b64)).equals(Buffer.from(bytes))).toBe(true);
  });
});

describe('Indexkodierung u16le-base64 (alt, wird weiter gelesen)', () => {
  it('Indizes als little-endian uint16', () => {
    const b64 = encodeIndicesU16le(Uint16Array.from([1, 0x0203]));
    expect(Array.from(Buffer.from(b64, 'base64'))).toEqual([0x01, 0x00, 0x03, 0x02]);
    expect(Array.from(decodeIndicesU16le(b64, 2))).toEqual([1, 0x0203]);
    expect(encodeIndices(Uint16Array.from([1, 0x0203]), 'u16le-base64')).toBe(b64);
    expect(Array.from(decodeIndices('u16le-base64', b64, 2))).toEqual([1, 0x0203]);
    expect(() => decodeIndicesU16le(b64, 3)).toThrow(/Indexdaten/);
  });
});

describe('Indexkodierung rle-varint-base64', () => {
  it('schreibt Läufe als (Wert, Länge)-VarInt-Paare', () => {
    const indices = Uint16Array.from([0, 0, 0, 5, 5, 200, ...new Array<number>(300).fill(1)]);
    const bytes = encodeRleBytes(indices);
    // 0×3, 5×2, 200×1 (200 = 0xc8 0x01), 1×300 (300 = 0xac 0x02)
    expect(Array.from(bytes)).toEqual([0x00, 0x03, 0x05, 0x02, 0xc8, 0x01, 0x01, 0x01, 0xac, 0x02]);
    expect(rleByteLength(indices)).toBe(bytes.length);
    const b64 = encodeIndices(indices);
    expect(b64).toBe(Buffer.from(bytes).toString('base64'));
    expect(Array.from(decodeIndicesRle(b64, indices.length, 201))).toEqual(Array.from(indices));
    expect(encodeIndices(new Uint16Array(0))).toBe('');
    expect(decodeIndicesRle('', 0, 1).length).toBe(0);
  });

  it('Roundtrip mit Mehrbyte-Werten und langen Läufen', () => {
    const indices = new Uint16Array(70_000);
    for (let i = 0; i < indices.length; i++) indices[i] = i < 20_000 ? 0 : i % 7 === 0 ? 4095 : Math.floor(i / 1000);
    const decoded = decodeIndices('rle-varint-base64', encodeIndices(indices), indices.length, MAX_PALETTE_SIZE);
    expect(Buffer.from(decoded.buffer).equals(Buffer.from(indices.buffer))).toBe(true);
  });

  it('dekodiert strikt und begrenzt auf width*height*length', () => {
    expect(rleIssues([0x00], 1)).toMatch(/Lauflänge.*abgeschnitten/);
    expect(rleIssues([0x80], 1)).toMatch(/Wert.*abgeschnitten/);
    expect(rleIssues([0x00, 0x00], 1)).toMatch(/Länge 0/);
    expect(rleIssues([0x00, 0x02], 1)).toMatch(/geht über/);
    expect(rleIssues([0x00, 0x01], 2)).toMatch(/1 Blöcke dekodiert, erwartet 2/);
    expect(rleIssues([0x00, 0x01, 0x00, 0x01], 1)).toMatch(/geht über/);
    expect(rleIssues([0x04, 0x01], 1, 4)).toMatch(/außerhalb der Palette/);
    expect(rleIssues([0x81, 0x00, 0x01], 1)).toMatch(/nicht minimal/);
    expect(rleIssues([0x00, 0x80, 0x80, 0x80, 0x80, 0x80, 0x01], 1)).toMatch(/länger als 5 Bytes/);
    // A forged run of 2^32-1 blocks in 6 bytes is rejected before anything is expanded.
    expect(rleIssues([0x00, 0xff, 0xff, 0xff, 0xff, 0x0f], 10)).toMatch(/geht über/);
    expect(() => decodeIndicesRle('!!!!', 1, 1)).toThrow(/Base64/);
  });
});

describe('Voxel-Transport', () => {
  it('kodiert standardmäßig als RLE; Roundtrip ist verlustfrei inkl. Hash', () => {
    const t = encodeVoxelTransport(model);
    expect(t.indexEncoding).toBe('rle-varint-base64');
    expect(t.indices.length).toBeLessThan(encodeIndicesU16le(model.indices).length / 4);
    const decoded = decodeVoxelTransport(JSON.parse(JSON.stringify(t)));
    expect(decoded.hash).toBe(model.hash);
    expect(decoded.palette).toEqual(model.palette);
    expect(Array.from(decoded.indices)).toEqual(Array.from(model.indices));
    expect(decoded.spec).toEqual(model.spec);
  });

  it('liest weiterhin alte u16le-base64-Transporte', () => {
    const legacy = { ...encodeVoxelTransport(model), indexEncoding: 'u16le-base64', indices: legacyU16le(model.indices) };
    expect(encodeVoxelTransport(model, { indexEncoding: 'u16le-base64' })).toEqual(legacy);
    const decoded = decodeVoxelTransport(JSON.parse(JSON.stringify(legacy)));
    expect(decoded.hash).toBe(model.hash);
    expect(Array.from(decoded.indices)).toEqual(Array.from(model.indices));
  });

  it('fällt bei Rauschen auf u16le zurück, damit nie mehr als 2 Bytes pro Block übertragen werden', () => {
    const states = allRegistryStates()
      .filter((s) => checkBlockState(s, DEFAULT_HOUSE_SPEC.targetMinecraftVersion).ok)
      .slice(0, 300);
    const indices = new Uint16Array(16 * 16 * 16);
    for (let i = 0; i < indices.length; i++) indices[i] = (i * 7919) % states.length;
    const noise = createVoxelModel(DEFAULT_HOUSE_SPEC, { width: 16, height: 16, length: 16 }, states, indices);
    expect(rleByteLength(noise.indices)).toBeGreaterThan(noise.indices.length * 2);
    const t = encodeVoxelTransport(noise);
    expect(t.indexEncoding).toBe('u16le-base64');
    expect(decodeVoxelTransport(t).hash).toBe(noise.hash);
    const forced = encodeVoxelTransport(noise, { indexEncoding: 'rle-varint-base64' });
    expect(forced.indexEncoding).toBe('rle-varint-base64');
    expect(decodeVoxelTransport(forced).hash).toBe(noise.hash);
  });

  it('maximale Payload ist dokumentiert und begrenzt', () => {
    expect(MAX_VOLUME).toBe(192 * 384 * 192);
    expect(MAX_INDICES_BASE64_LENGTH).toBe(base64LengthFor(MAX_VOLUME * 2));
    expect(MAX_INDICES_BASE64_LENGTH).toBe(37_748_736);
    expect(MAX_TRANSPORT_REQUEST_BYTES).toBe(MAX_INDICES_BASE64_LENGTH + MAX_PALETTE_SIZE * 259 + 64 * 1024);
  });

  it('lehnt manipulierte oder kaputte Daten ab', () => {
    const t = encodeVoxelTransport(model);
    const legacy = encodeVoxelTransport(model, { indexEncoding: 'u16le-base64' });
    expect(transportIssues({ ...t, hash: 'a'.repeat(64) })).toMatch(/Hash/);
    expect(transportIssues({ ...t, hash: 'nope' })).toMatch(/hash/);
    expect(transportIssues({ ...t, dimensions: { ...t.dimensions, width: 193 } })).toMatch(/width/);
    expect(transportIssues({ ...t, dimensions: { ...t.dimensions, height: 385 } })).toMatch(/height/);
    expect(transportIssues({ ...t, dimensions: { ...t.dimensions, width: t.dimensions.width + 1 } })).toMatch(/Indexdaten/);
    expect(transportIssues({ ...t, indices: t.indices.slice(0, -4) })).toMatch(/Indexdaten/);
    expect(transportIssues({ ...legacy, indices: legacy.indices.slice(0, -4) })).toMatch(/Indexdaten/);
    expect(transportIssues({ ...t, indices: '!!!!' })).toMatch(/Base64|Indexdaten/);
    expect(transportIssues({ ...t, indices: 'A'.repeat(MAX_INDICES_BASE64_LENGTH + 4) })).toMatch(/indices/);
    expect(transportIssues({ ...t, palette: ['minecraft:air', 'minecraft:tnt'] })).toMatch(/nicht freigegeben|Palette|Index/);
    expect(transportIssues({ ...t, palette: new Array(MAX_PALETTE_SIZE + 1).fill('minecraft:air') })).toMatch(/palette/);
    expect(transportIssues({ ...t, indexEncoding: 'u32' })).toMatch(/indexEncoding/);
    // RLE data declared as u16le (and the other way round) never passes.
    expect(transportIssues({ ...t, indexEncoding: 'u16le-base64' })).toMatch(/Indexdaten/);
    expect(transportIssues({ ...legacy, indexEncoding: 'rle-varint-base64' })).toMatch(/Indexdaten|Hash/);
    expect(transportIssues({ ...t, spec: { ...t.spec, kind: 'castle' } })).toMatch(/kind/);
    expect(transportIssues(null)).toMatch(/root|expected/i);
  });
});
