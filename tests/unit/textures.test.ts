import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { blockState, listBlockDefinitions } from '@/core/blocks/registry';
import { DEFAULT_HOUSE_SPEC } from '@/core/schema/buildSpec';
import { createVoxelModel } from '@/core/schema/voxelModel';
import type { AssetPack, BlockstateJson, ModelJson } from '@/core/textures/assetTypes';
import { bakeBlockState, bakeVariant, conditionMatches, flattenModel, resolveTextureRef, selectVariants } from '@/core/textures/blockModel';
import { packSubset } from '@/core/textures/closure';
import { buildTexturedMesh, FACE_SHADE, tintColor, type AlphaClass, type AtlasLookup } from '@/core/textures/texturedMesh';
import { findJarCandidates, jarVersionFromPath, pickCandidate, readClientJar } from '@/lib/textures/minecraftJar';
import { ZipArchive, ZipFormatError } from '@/lib/textures/zipReader';
import { buildZip, fakeClientJar } from '../helpers/fakeMinecraftJar';

const FACES = ['down', 'up', 'north', 'south', 'west', 'east'] as const;
const cube = (tex: Record<string, string>): ModelJson => ({ parent: 'block/cube', textures: tex });
const MODELS: Record<string, ModelJson> = {
  'block/block': {},
  'block/cube': {
    parent: 'block/block',
    elements: [{ from: [0, 0, 0], to: [16, 16, 16], faces: Object.fromEntries(FACES.map((f) => [f, { texture: `#${f}`, cullface: f }])) }],
  },
  'block/column': cube({ down: '#end', up: '#end', north: '#side', south: '#side', west: '#side', east: '#side' }),
  'block/log': { parent: 'block/column', textures: { side: 'minecraft:block/log_side', end: 'block/log_top' } },
  'block/front': cube({ down: '#top', up: '#top', north: '#front', south: '#side', west: '#side', east: '#side' }),
  'block/lantern': { parent: 'block/front', textures: { top: 'block/p_top', front: 'block/p_face', side: 'block/p_side' } },
  'block/post': {
    textures: { t: 'block/fence' },
    elements: [{ from: [6, 0, 6], to: [10, 16, 10], faces: { north: { texture: '#t' }, up: { texture: '#t', cullface: 'up' } } }],
  },
  'block/arm': {
    textures: { t: 'block/fence' },
    elements: [{ from: [7, 12, 0], to: [9, 15, 9], faces: { north: { texture: '#t' } } }],
  },
  'block/cross': {
    textures: { c: 'block/flower' },
    elements: [
      {
        from: [0.8, 0, 8],
        to: [15.2, 16, 8],
        rotation: { origin: [8, 8, 8], axis: 'y', angle: 45, rescale: true },
        shade: false,
        faces: { north: { texture: '#c' }, south: { texture: '#c' } },
      },
    ],
  },
};

describe('ZIP-Leser', () => {
  it('liest gespeicherte und komprimierte Einträge und prüft Prüfsummen', () => {
    const zip = buildZip([
      { name: 'a.txt', data: Buffer.from('hallo'), method: 0 },
      { name: 'dir/b.json', data: Buffer.from('{"x":1}'.repeat(50)) },
    ]);
    const archive = ZipArchive.fromBuffer(zip);
    expect(archive.names().sort()).toEqual(['a.txt', 'dir/b.json']);
    expect(archive.readText('a.txt')).toBe('hallo');
    expect(archive.readText('dir/b.json')).toBe('{"x":1}'.repeat(50));
    expect(archive.read('fehlt')).toBeNull();
    // Corrupt the stored data: the CRC check must catch it.
    const broken = Buffer.from(zip);
    broken[30 + 'a.txt'.length] = 'X'.charCodeAt(0);
    expect(() => ZipArchive.fromBuffer(broken).read('a.txt')).toThrow(ZipFormatError);
  });

  it('lehnt Nicht-ZIP-Dateien ab', () => {
    expect(() => ZipArchive.fromBuffer(Buffer.from('kein zip'.repeat(10)))).toThrow(ZipFormatError);
  });
});

describe('Blockstate-Auswahl', () => {
  const log: BlockstateJson = {
    variants: {
      'axis=x': { model: 'minecraft:block/log', x: 90, y: 90 },
      'axis=y': { model: 'minecraft:block/log' },
      'axis=z': { model: 'minecraft:block/log', x: 90 },
    },
  };
  it('wählt die passende Variante nach Eigenschaften', () => {
    expect(selectVariants(log, { axis: 'z' })).toEqual([{ model: 'minecraft:block/log', x: 90 }]);
    expect(selectVariants({ variants: { '': { model: 'm' } } }, { any: 'x' })).toEqual([{ model: 'm' }]);
    expect(selectVariants(log, { axis: 'w' })).toEqual([]);
  });

  it('gewichtete Zufallsvarianten sind deterministisch je Seed', () => {
    const bs: BlockstateJson = { variants: { '': [{ model: 'a', weight: 1 }, { model: 'b', weight: 3 }] } };
    expect(selectVariants(bs, {}, 0)[0]!.model).toBe('a');
    expect(selectVariants(bs, {}, 1)[0]!.model).toBe('b');
    expect(selectVariants(bs, {}, 5)[0]!.model).toBe(selectVariants(bs, {}, 5)[0]!.model);
  });

  it('Multipart: Bedingungen mit Alternativen, OR, AND und Verneinung', () => {
    const fence: BlockstateJson = {
      multipart: [{ apply: { model: 'post' } }, { when: { north: 'true' }, apply: { model: 'arm' } }, { when: { OR: [{ east: 'true' }, { west: 'true' }] }, apply: { model: 'side' } }],
    };
    expect(selectVariants(fence, { north: 'false', east: 'false', west: 'false' }).map((v) => v.model)).toEqual(['post']);
    expect(selectVariants(fence, { north: 'true', east: 'false', west: 'true' }).map((v) => v.model)).toEqual(['post', 'arm', 'side']);
    expect(conditionMatches({ facing: 'north|south' }, { facing: 'south' })).toBe(true);
    expect(conditionMatches({ facing: '!north|south' }, { facing: 'east' })).toBe(true);
    expect(conditionMatches({ AND: [{ a: '1' }, { b: '2' }] }, { a: '1', b: '3' })).toBe(false);
  });
});

describe('Modelle und Texturen', () => {
  const FRONT_MODELS = {
    ...MODELS,
    'block/front': { ...MODELS['block/front']!, textures: { ...MODELS['block/front']!.textures, top: 't', front: 'f', side: 's' } },
  };
  it('Elternkette: Texturen werden vererbt und überschrieben, Referenzen aufgelöst', () => {
    const flat = flattenModel('minecraft:block/log', MODELS);
    expect(flat.elements).toHaveLength(1);
    expect(resolveTextureRef('#north', flat.textures)).toBe('block/log_side');
    expect(resolveTextureRef('#up', flat.textures)).toBe('block/log_top');
    expect(resolveTextureRef('#unbekannt', flat.textures)).toBeNull();
    const missing: string[] = [];
    flattenModel('block/gibtsnicht', MODELS, missing);
    expect(missing).toEqual(['model block/gibtsnicht']);
  });

  it('Stamm: Stirnseiten zeigen in Richtung der Achse, Cullfaces drehen mit', () => {
    const pack = { blockstates: { oak_log: { variants: { 'axis=x': { model: 'block/log', x: 90, y: 90 }, 'axis=y': { model: 'block/log' }, 'axis=z': { model: 'block/log', x: 90 } } } }, models: MODELS };
    const ends = (axis: string) =>
      bakeBlockState('minecraft:oak_log', { axis }, pack)
        .quads.filter((q) => q.texture === 'block/log_top')
        .map((q) => q.direction)
        .sort();
    expect(ends('y')).toEqual(['down', 'up']);
    expect(ends('x')).toEqual(['east', 'west']);
    expect(ends('z')).toEqual(['north', 'south']);
    for (const q of bakeBlockState('minecraft:oak_log', { axis: 'x' }, pack).quads) expect(q.cullface).toBe(q.direction);
    expect(bakeBlockState('minecraft:oak_log', { axis: 'y' }, pack).fullCube).toBe(true);
  });

  it('y-Drehung: Vorderseite zeigt nach facing (wie Kürbislaterne)', () => {
    const pack = {
      blockstates: {
        lantern: {
          variants: {
            'facing=north': { model: 'block/lantern' },
            'facing=east': { model: 'block/lantern', y: 90 },
            'facing=south': { model: 'block/lantern', y: 180 },
            'facing=west': { model: 'block/lantern', y: 270 },
          },
        },
      },
      models: MODELS,
    };
    for (const facing of ['north', 'east', 'south', 'west']) {
      const front = bakeBlockState('lantern', { facing }, pack).quads.find((q) => q.texture === 'block/p_face');
      expect(front?.direction).toBe(facing);
    }
  });

  it('Standard-UVs, Gegen-den-Uhrzeigersinn-Reihenfolge und Elementdrehung', () => {
    const { quads } = bakeVariant({ model: 'block/front' }, FRONT_MODELS);
    const south = quads.find((q) => q.direction === 'south')!;
    // Top-left, bottom-left, bottom-right, top-right as seen from outside (south).
    expect(south.positions).toEqual([[0, 1, 1], [0, 0, 1], [1, 0, 1], [1, 1, 1]]);
    expect(south.uvs).toEqual([[0, 0], [0, 16], [16, 16], [16, 0]]);
    const cross = bakeVariant({ model: 'block/cross' }, MODELS).quads;
    expect(cross).toHaveLength(2);
    // Rotated 45° about y and rescaled by 1/cos 45°: the x extent stays 0.8..15.2 px, the plane runs diagonally.
    const xs = cross[0]!.positions.map((p) => p[0]);
    const zs = cross[0]!.positions.map((p) => p[2]);
    expect(Math.min(...xs)).toBeCloseTo(0.05, 3);
    expect(Math.max(...xs)).toBeCloseTo(0.95, 3);
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(0.9, 3);
    expect(cross.every((q) => !q.shade && q.cullface === null)).toBe(true);
  });

  it('uvlock hält die Textur an der Welt ausgerichtet', () => {
    const { quads } = bakeVariant({ model: 'block/front', y: 90, uvlock: true }, FRONT_MODELS);
    const up = quads.find((q) => q.direction === 'up')!;
    // World-locked: u follows x, v follows z.
    up.positions.forEach((p, i) => expect(up.uvs[i]).toEqual([p[0] * 16, p[2] * 16]));
  });
});

describe('Teilmenge für die Vorschau', () => {
  it('enthält genau die benötigten Blockstates, Modelle (mit Eltern) und Texturen', () => {
    const pack: AssetPack = {
      version: '1.21.11',
      blockstates: { oak_log: { variants: { '': { model: 'block/log' } } }, other: { variants: { '': { model: 'block/lantern' } } } },
      models: MODELS,
      textures: { 'block/log_side': { png: 'a', animated: false }, 'block/log_top': { png: 'b', animated: false }, 'block/p_face': { png: 'c', animated: false } },
    };
    const sub = packSubset(pack, ['minecraft:oak_log']);
    expect(Object.keys(sub.blockstates)).toEqual(['oak_log']);
    expect(Object.keys(sub.models).sort()).toEqual(['block/block', 'block/column', 'block/cube', 'block/log']);
    expect(Object.keys(sub.textures).sort()).toEqual(['block/log_side', 'block/log_top']);
  });
});

describe('Texturiertes Mesh', () => {
  const pack = readClientJar(fakeClientJar());
  const bake = (state: string) => {
    const [id, rest] = state.split('[');
    const props = Object.fromEntries((rest ? rest.slice(0, -1).split(',') : []).map((p) => p.split('=') as [string, string]));
    return bakeBlockState(id!, props, pack);
  };
  const atlas = (alpha: Record<string, AlphaClass> = {}): AtlasLookup => ({
    rect: (name) => (pack.textures[name] ? [0, 0, 1, 1] : null),
    alpha: (name) => alpha[name] ?? 'opaque',
  });
  const row = (states: string[]) => {
    const palette = [...new Set(['minecraft:air', ...states])];
    return createVoxelModel(DEFAULT_HOUSE_SPEC, { width: states.length, height: 1, length: 1 }, palette, Uint16Array.from(states.map((s) => palette.indexOf(s))));
  };

  it('blendet Flächen zwischen festen Blöcken aus', () => {
    const planks = blockState('spruce_planks');
    const mesh = buildTexturedMesh(row([planks, planks]), bake, atlas());
    expect(mesh.solid.faceCount).toBe(10);
    expect(mesh.faceCount).toBe(10);
  });

  it('Glas neben gleichem Glas ohne Zwischenfläche, Laub neben Laub mit', () => {
    const glass = blockState('glass');
    const leaves = blockState('spruce_leaves');
    const alpha = { 'block/glass': 'translucent', 'block/spruce_leaves': 'cutout' } as const;
    expect(buildTexturedMesh(row([glass, glass]), bake, atlas(alpha)).translucent.faceCount).toBe(10);
    expect(buildTexturedMesh(row([leaves, leaves]), bake, atlas(alpha)).cutout.faceCount).toBe(12);
    // Glass does not hide a solid neighbour's face.
    const mixed = buildTexturedMesh(row([glass, blockState('spruce_planks')]), bake, atlas(alpha));
    expect(mixed.solid.faceCount + mixed.translucent.faceCount).toBe(11);
  });

  it('Richtungsabhängige Helligkeit und Laubfärbung wie im Spiel', () => {
    expect(FACE_SHADE).toEqual({ down: 0.5, up: 1, north: 0.8, south: 0.8, west: 0.6, east: 0.6 });
    expect(tintColor('minecraft:spruce_leaves', 0)).toEqual([0x61 / 255, 0x99 / 255, 0x61 / 255]);
    expect(tintColor('minecraft:spruce_leaves', -1)).toEqual([1, 1, 1]);
    const mesh = buildTexturedMesh(row([blockState('spruce_leaves')]), bake, atlas({ 'block/spruce_leaves': 'cutout' }));
    // Top face of the leaves: shade 1 × spruce tint, stored as linear RGB (green channel brightest).
    const colors = Array.from(mesh.cutout.colors);
    expect(Math.max(...colors.filter((_, i) => i % 3 === 1))).toBeGreaterThan(Math.max(...colors.filter((_, i) => i % 3 === 0)));
  });

  it('Ebenenansicht schneidet oberhalb ab und zeigt die Schnittfläche', () => {
    const planks = blockState('spruce_planks');
    const palette = ['minecraft:air', planks];
    const tower = createVoxelModel(DEFAULT_HOUSE_SPEC, { width: 1, height: 3, length: 1 }, palette, Uint16Array.from([1, 1, 1]));
    expect(buildTexturedMesh(tower, bake, atlas()).faceCount).toBe(14);
    expect(buildTexturedMesh(tower, bake, atlas(), { maxY: 0 }).faceCount).toBe(6);
  });

  it('jeder Registry-Zustand lässt sich mit dem Test-Jar backen', () => {
    for (const def of listBlockDefinitions()) {
      if (def.id === 'minecraft:air') continue;
      const baked = bake(blockState(def.id));
      expect(baked.missing, def.id).toEqual([]);
      expect(baked.quads.length, def.id).toBeGreaterThan(0);
    }
  });
});

describe('Minecraft-Datei finden', () => {
  it('erkennt Client-Dateien der Launcher am Pfad', () => {
    expect(jarVersionFromPath('C:\\Users\\L\\curseforge\\minecraft\\Install\\versions\\1.21.11\\1.21.11.jar')).toBe('1.21.11');
    expect(jarVersionFromPath('/home/x/.minecraft/versions/1.21.1/1.21.1.jar')).toBe('1.21.1');
    expect(jarVersionFromPath('C:/P/libraries/com/mojang/minecraft/1.21.11/minecraft-1.21.11-client.jar')).toBe('1.21.11');
    expect(jarVersionFromPath('/x/versions/fabric-loader-0.16-1.21.11/fabric-loader-0.16-1.21.11.jar')).toBeNull();
    expect(jarVersionFromPath('/x/mods/sodium-1.21.11.jar')).toBeNull();
  });

  it('durchsucht Launcher-Ordner begrenzt und bevorzugt die gewünschte Version', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mcb-launcher-'));
    try {
      for (const v of ['1.20.4', '1.21.11']) {
        await mkdir(join(root, 'Install', 'versions', v), { recursive: true });
        await writeFile(join(root, 'Install', 'versions', v, `${v}.jar`), 'x');
      }
      await mkdir(join(root, 'Instances', 'Pack', 'mods'), { recursive: true });
      await writeFile(join(root, 'Instances', 'Pack', 'mods', '1.21.11.jar'), 'x');
      const found = await findJarCandidates([{ launcher: 'CurseForge', root }]);
      expect(found.map((c) => c.version).sort()).toEqual(['1.20.4', '1.21.11']);
      expect(pickCandidate(found, ['1.21.11', '1.21.1'])?.version).toBe('1.21.11');
      expect(pickCandidate(found.filter((c) => c.version !== '1.21.11'), ['1.21.11'])?.version).toBe('1.20.4');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('liest Version, Blockstates, Modelle und Texturen aus einem Client-Jar und lehnt Fremdes ab', () => {
    const pack = readClientJar(fakeClientJar({ version: '1.21.11' }));
    expect(pack.version).toBe('1.21.11');
    expect(pack.blockstates.spruce_planks).toBeDefined();
    expect(pack.models['block/cube_all']).toBeDefined();
    expect(pack.textures['block/spruce_planks']?.png.length).toBeGreaterThan(10);
    expect(() => readClientJar(buildZip([{ name: 'readme.txt', data: Buffer.from('mod') }]))).toThrow(/Blockdaten/);
    expect(() => readClientJar(Buffer.from('kein jar'))).toThrow(/keine gültige Minecraft-Datei/);
  });
});
