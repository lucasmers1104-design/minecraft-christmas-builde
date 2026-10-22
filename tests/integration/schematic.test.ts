import { gunzipSync, gzipSync } from 'node:zlib';
import * as nbt from 'prismarine-nbt';
import { describe, expect, it } from 'vitest';
import { exportSchematic } from '@/core/export/exportSchematic';
import { decodeVarIntArray } from '@/core/export/encodeVarInt';
import { validateSchematic } from '@/core/export/validateSchematic';
import { buildSpongeV3Nbt, nbtString, SchematicExportError, writeSpongeV3 } from '@/core/export/writeSpongeV3';
import { generateBuilding, generateVariants } from '@/core/generator/generateBuilding';
import { DEFAULT_HOUSE_SPEC } from '@/core/schema/buildSpec';
import { computeVoxelHash, createVoxelModel, linearIndex, MAX_PALETTE_SIZE, type VoxelModel } from '@/core/schema/voxelModel';
import { largePaletteModel } from '../helpers/syntheticModels';

const house = generateBuilding(DEFAULT_HOUSE_SPEC);

/** Second, independent reader: prismarine-nbt's parser (the writer is not re-used). */
async function readWithPrismarine(file: Buffer) {
  const raw = gunzipSync(file);
  const { parsed, type } = await nbt.parse(raw);
  return { parsed, type, raw };
}

function decodeWithPrismarine(parsed: nbt.NBT): { palette: string[]; indices: Uint32Array; w: number; h: number; l: number } {
  const schem = (parsed.value.Schematic as nbt.Compound).value;
  const w = (schem.Width as nbt.Short).value & 0xffff;
  const h = (schem.Height as nbt.Short).value & 0xffff;
  const l = (schem.Length as nbt.Short).value & 0xffff;
  const blocks = (schem.Blocks as nbt.Compound).value;
  const paletteTag = (blocks.Palette as nbt.Compound).value;
  const palette: string[] = [];
  for (const [state, tag] of Object.entries(paletteTag)) palette[(tag as nbt.Int).value] = state;
  const data = (blocks.Data as nbt.ByteArray).value.map((b) => b & 0xff);
  return { palette, indices: decodeVarIntArray(data, w * h * l), w, h, l };
}

describe('Sponge-v3-Export des Weihnachtshauses', () => {
  it('hat das exakte v3-Layout und die richtigen Tag-Typen (geprüft mit prismarine-nbt als Leser)', async () => {
    const file = writeSpongeV3(house);
    expect(file.subarray(0, 2).toString('hex')).toBe('1f8b'); // GZip magic
    const { parsed, type, raw } = await readWithPrismarine(file);
    expect(type).toBe('big');
    expect(raw[0]).toBe(10); // TAG_Compound root
    expect(parsed.name).toBe('');
    expect(Object.keys(parsed.value)).toEqual(['Schematic']);
    const schem = parsed.value.Schematic as nbt.Compound;
    expect(schem.type).toBe('compound');
    const v = schem.value;
    expect(v.Version).toEqual({ type: 'int', value: 3 });
    expect(v.DataVersion).toEqual({ type: 'int', value: 4671 });
    expect(v.Width).toEqual({ type: 'short', value: house.dimensions.width });
    expect(v.Height).toEqual({ type: 'short', value: house.dimensions.height });
    expect(v.Length).toEqual({ type: 'short', value: house.dimensions.length });
    expect(v.Offset).toEqual({ type: 'intArray', value: [0, 0, 0] });
    expect(v.BlockData).toBeUndefined(); // no v2 layout
    expect(v.Palette).toBeUndefined();
    const blocks = v.Blocks as nbt.Compound;
    expect(blocks.type).toBe('compound');
    expect(blocks.value.Palette?.type).toBe('compound');
    expect(blocks.value.Data?.type).toBe('byteArray');
    expect(blocks.value.BlockEntities).toEqual({ type: 'list', value: { type: 'compound', value: [] } });
    for (const tag of Object.values((blocks.value.Palette as nbt.Compound).value)) expect(tag?.type).toBe('int');
  });

  it('Roundtrip: jeder Block an jeder Koordinate ist identisch, Hash passt', async () => {
    const file = writeSpongeV3(house);
    const { parsed } = await readWithPrismarine(file);
    const d = decodeWithPrismarine(parsed);
    expect([d.w, d.h, d.l]).toEqual([house.dimensions.width, house.dimensions.height, house.dimensions.length]);
    for (let y = 0; y < d.h; y++)
      for (let z = 0; z < d.l; z++)
        for (let x = 0; x < d.w; x++) {
          const i = linearIndex(house.dimensions, x, y, z);
          expect(d.palette[d.indices[i]!]).toBe(house.palette[house.indices[i]!]);
        }
    expect(computeVoxelHash(house.dimensions, d.palette, Uint16Array.from(d.indices))).toBe(house.hash);

    // Our own independent validator agrees.
    const report = validateSchematic(file, { expected: house });
    expect(report.issues).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.decoded?.hash).toBe(house.hash);
  });

  it('alle drei Varianten exportieren verlustfrei', () => {
    for (const variant of generateVariants(DEFAULT_HOUSE_SPEC)) {
      const { report } = exportSchematic(variant);
      expect(report.ok).toBe(true);
      expect(report.decoded?.hash).toBe(variant.hash);
    }
  });

  it('schreibt die DataVersion des gewählten Profils (1.21.11 = 4671, 1.21.1 = 3955)', () => {
    const old = generateBuilding({ ...DEFAULT_HOUSE_SPEC, targetMinecraftVersion: '1.21.1' });
    const report = validateSchematic(writeSpongeV3(old), { expected: old });
    expect(report.ok).toBe(true);
    expect(report.decoded?.dataVersion).toBe(3955);
    expect(report.decoded?.minecraftVersion).toBe('1.21.1');
    expect(validateSchematic(writeSpongeV3(house)).decoded?.dataVersion).toBe(4671);
    // Same blocks, different target => different file, same block hash.
    expect(old.hash).toBe(house.hash);
    expect(writeSpongeV3(old).equals(writeSpongeV3(house))).toBe(false);
    // A 1.21.1 file is rejected when 1.21.11 is expected.
    expect(validateSchematic(writeSpongeV3(old), { expected: house }).issues.join()).toMatch(/DataVersion/);
  });

  it('ist deterministisch (gleiches Modell => identische Datei)', () => {
    expect(writeSpongeV3(house).equals(writeSpongeV3(house))).toBe(true);
  });

  it('Blockdaten als Int8Array ergeben byte-identisch dieselbe Datei wie das frühere number[]', () => {
    for (const model of [house, largePaletteModel()]) {
      const root = buildSpongeV3Nbt(model);
      const data = ((root.value.Schematic as nbt.Compound).value.Blocks as nbt.Compound).value.Data as nbt.ByteArray;
      expect(data.value).toBeInstanceOf(Int8Array);
      const typed = nbt.writeUncompressed(root, 'big');
      // The previous writer passed a plain array of signed bytes.
      data.value = Array.from(data.value as unknown as Int8Array);
      const plain = nbt.writeUncompressed(root, 'big');
      expect(typed.equals(plain)).toBe(true);
      expect(gzipSync(plain, { level: 9 }).equals(writeSpongeV3(model))).toBe(true);
    }
  });
});

describe('Paletten mit mehr als 127 Einträgen (Mehrbyte-VarInts)', () => {
  it('schreibt und liest Indizes >= 128 korrekt', async () => {
    const model = largePaletteModel();
    expect(model.palette.length).toBeGreaterThan(127);
    const file = writeSpongeV3(model);
    const { parsed } = await readWithPrismarine(file);
    const data = ((parsed.value.Schematic as nbt.Compound).value.Blocks as nbt.Compound).value.Data as nbt.ByteArray;
    expect(data.value.length).toBeGreaterThan(model.indices.length); // some entries take 2 bytes
    expect(data.value.some((b) => b < 0)).toBe(true); // continuation bit set
    const d = decodeWithPrismarine(parsed);
    expect(Array.from(d.indices)).toEqual(Array.from(model.indices));
    expect(validateSchematic(file, { expected: model }).ok).toBe(true);
  });
});

describe('Negative Fälle', () => {
  const tamper = (mutate: (root: nbt.NBT) => void): Buffer => {
    const root = buildSpongeV3Nbt(house);
    mutate(root);
    return gzipSync(nbt.writeUncompressed(root, 'big'));
  };
  const schem = (root: nbt.NBT) => (root.value.Schematic as nbt.Compound).value;
  const blocks = (root: nbt.NBT) => (schem(root).Blocks as nbt.Compound).value;

  it('Export verweigert ungültige Modelle (kein scheinbar erfolgreicher Download)', () => {
    const cases: [string, VoxelModel, RegExp][] = [
      ['kaputter Hash', { ...house, hash: 'f'.repeat(64) }, /Hash/],
      ['unbekannter Block', { ...house, palette: house.palette.map((p, i) => (i === 1 ? 'minecraft:bedrock' : p)) }, /nicht freigegeben/],
      ['ungültige Eigenschaft', { ...house, palette: house.palette.map((p) => p.replace('axis=y', 'axis=up')) }, /Ungültiger Wert/],
      ['zu groß', { ...house, dimensions: { width: 193, height: 14, length: 13 } }, /Limit/],
      ['inkonsistente Palette', { ...house, palette: house.palette.slice(0, 3) }, /außerhalb der Palette/],
      ['unbekannte Zielversion', { ...house, spec: { ...house.spec, targetMinecraftVersion: '1.20.4' } }, /Exportprofil/],
    ];
    for (const [name, model, reason] of cases) {
      let error: unknown;
      try {
        writeSpongeV3(model);
      } catch (e) {
        error = e;
      }
      expect(error, name).toBeInstanceOf(SchematicExportError);
      expect((error as SchematicExportError).issues.join(' '), name).toMatch(reason);
    }
  });

  it('Validator erkennt abgeschnittene VarInt-Daten, falsche Typen, v2-Layout und falsche DataVersion', () => {
    const truncated = tamper((r) => {
      const data = blocks(r).Data as nbt.ByteArray;
      data.value = data.value.slice(0, -1);
    });
    expect(validateSchematic(truncated).issues.join()).toMatch(/abgeschnitten/);

    const wrongType = tamper((r) => {
      schem(r).Width = { type: 'int', value: house.dimensions.width } as nbt.Int;
    });
    expect(validateSchematic(wrongType).issues.join()).toMatch(/Width hat Tag-Typ/);

    const v2 = tamper((r) => {
      schem(r).BlockData = { type: 'byteArray', value: [0] } as nbt.ByteArray;
    });
    expect(validateSchematic(v2).issues.join()).toMatch(/Sponge-v2/);

    const dataVersion = tamper((r) => {
      schem(r).DataVersion = { type: 'int', value: 3700 } as nbt.Int;
    });
    expect(validateSchematic(dataVersion).issues.join()).toMatch(/DataVersion/);

    const badIndex = tamper((r) => {
      const data = blocks(r).Data as nbt.ByteArray;
      data.value = data.value.map((b, i) => (i === 0 ? 120 : b));
    });
    expect(validateSchematic(badIndex).issues.join()).toMatch(/verweist auf keinen Paletteneintrag/);

    const unknownState = tamper((r) => {
      const palette = (blocks(r).Palette as nbt.Compound).value;
      const first = Object.keys(palette).find((k) => k !== 'minecraft:air')!;
      palette['minecraft:bedrock'] = palette[first];
      delete palette[first];
    });
    expect(validateSchematic(unknownState).issues.join()).toMatch(/nicht freigegeben/);

    expect(validateSchematic(Buffer.from('not gzip')).issues.join()).toMatch(/GZip/);
    expect(validateSchematic(gzipSync(Buffer.from([10, 0, 0]))).issues.join()).toMatch(/Dateiende/);
    // Forged array lengths must not allocate gigabytes: int array / list "with 2^31-1 entries".
    const forgedIntArray = Buffer.from([10, 0, 0, 11, 0, 1, 0x4f, 0x7f, 0xff, 0xff, 0xff]);
    expect(validateSchematic(gzipSync(forgedIntArray)).issues.join()).toMatch(/Dateiende/);
    const forgedList = Buffer.from([10, 0, 0, 9, 0, 1, 0x4c, 1, 0x7f, 0xff, 0xff, 0xff]);
    expect(validateSchematic(gzipSync(forgedList)).issues.join()).toMatch(/Dateiende/);

    const hugePalette = tamper((r) => {
      const palette = (blocks(r).Palette as nbt.Compound).value;
      for (let i = Object.keys(palette).length; i <= MAX_PALETTE_SIZE; i++) palette[`minecraft:dummy_${i}`] = { type: 'int', value: i } as nbt.Int;
    });
    expect(validateSchematic(hugePalette).issues.join()).toMatch(/Palette zu groß/);
  });

  it('Validator erkennt Abweichungen gegenüber dem erwarteten Modell', () => {
    // Same volume, one block different.
    const indices = house.indices.slice();
    indices[0] = indices[0] === 0 ? 1 : 0;
    const report = validateSchematic(writeSpongeV3(createVoxelModel(house.spec, house.dimensions, house.palette, indices)), { expected: house });
    expect(report.ok).toBe(false);
    expect(report.issues.join()).toMatch(/Blöcke weichen ab|Hash/);
    // Another seed: other measurements.
    const other = generateBuilding({ ...DEFAULT_HOUSE_SPEC, seed: 2 });
    if (other.dimensions.width !== house.dimensions.width || other.dimensions.length !== house.dimensions.length) {
      expect(validateSchematic(writeSpongeV3(other), { expected: house }).issues.join()).toMatch(/Maße/);
    }
  });
});

describe('Java-kompatible NBT-Strings', () => {
  it('lehnt Zeichen ab, bei denen UTF-8 und Javas modified UTF-8 voneinander abweichen', () => {
    expect(nbtString('Weihnachtshaus (Seed 1) äöü €')).toEqual({ type: 'string', value: 'Weihnachtshaus (Seed 1) äöü €' });
    expect(() => nbtString('Schneemann ☃️🎄')).toThrow(SchematicExportError);
    expect(() => nbtString('a\u0000b')).toThrow(SchematicExportError);
  });
});
