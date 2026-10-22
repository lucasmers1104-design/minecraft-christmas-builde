import { crc32, deflateRawSync, deflateSync } from 'node:zlib';
import { blockIdOf, listBlockDefinitions, renderInfoFor } from '@/core/blocks/registry';

/**
 * Builds a small stand-in for a Minecraft client jar in the vanilla resource layout (our own
 * JSON and generated single-colour PNGs – no Mojang assets), for tests of the texture pipeline.
 */

export interface ZipInput {
  name: string;
  data: Buffer;
  /** 0 = stored, 8 = deflate (default). */
  method?: 0 | 8;
}

export function buildZip(entries: ZipInput[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name, 'utf8');
    const method = e.method ?? 8;
    const body = method === 8 ? deflateRawSync(e.data) : e.data;
    const crc = crc32(e.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(e.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, body);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(e.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += 30 + name.length + body.length;
  }
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, eocd]);
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([len, typeAndData, crc]);
}

/** RGBA PNG; pixel(x, y) returns [r, g, b, a]. */
export function encodePng(width: number, height: number, pixel: (x: number, y: number) => [number, number, number, number]): Buffer {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    for (let x = 0; x < width; x++) raw.set(pixel(x, y), y * (width * 4 + 1) + 1 + x * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function hexRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const json = (value: unknown): Buffer => Buffer.from(JSON.stringify(value));

const FACES = ['down', 'up', 'north', 'south', 'west', 'east'] as const;

/** Base models in the vanilla format, written for these tests. */
const BASE_MODELS: Record<string, unknown> = {
  'block/block': {},
  'block/cube': {
    parent: 'block/block',
    elements: [
      {
        from: [0, 0, 0],
        to: [16, 16, 16],
        faces: Object.fromEntries(FACES.map((f) => [f, { texture: `#${f}`, cullface: f }])),
      },
    ],
  },
  'block/cube_all': {
    parent: 'block/cube',
    textures: Object.fromEntries([['particle', '#all'], ...FACES.map((f) => [f, '#all'])]),
  },
  'block/cube_column': {
    parent: 'block/cube',
    textures: { particle: '#side', down: '#end', up: '#end', north: '#side', south: '#side', west: '#side', east: '#side' },
  },
  'block/tinted_cube_all': {
    parent: 'block/block',
    textures: { particle: '#all' },
    elements: [
      {
        from: [0, 0, 0],
        to: [16, 16, 16],
        faces: Object.fromEntries(FACES.map((f) => [f, { texture: '#all', cullface: f, tintindex: 0 }])),
      },
    ],
  },
  'block/flat_plate': {
    textures: { particle: '#rail' },
    elements: [{ from: [0, 1, 0], to: [16, 1, 16], faces: { up: { texture: '#rail' }, down: { texture: '#rail' } } }],
  },
};

export interface FakeJarOptions {
  version?: string;
  /** Block ids to include (default: every registry block). */
  blocks?: string[];
}

/** A client-jar stand-in with a block state, model and texture for every requested block. */
export function fakeClientJar(options: FakeJarOptions = {}): Buffer {
  const version = options.version ?? '1.21.11';
  const ids = options.blocks ?? listBlockDefinitions().map((d) => d.id);
  const entries: ZipInput[] = [
    { name: 'version.json', data: json({ id: version, name: version }) },
    { name: 'assets/minecraft/blockstates/stone.json', data: json({ variants: { '': { model: 'minecraft:block/stone' } } }) },
    { name: 'assets/minecraft/models/block/stone.json', data: json({ parent: 'minecraft:block/cube_all', textures: { all: 'minecraft:block/stone' } }) },
    { name: 'assets/minecraft/textures/block/stone.png', data: encodePng(16, 16, () => [125, 125, 125, 255]) },
  ];
  for (const [name, model] of Object.entries(BASE_MODELS)) entries.push({ name: `assets/minecraft/models/${name}.json`, data: json(model) });

  for (const fullId of ids) {
    const id = blockIdOf(fullId).replace('minecraft:', '');
    if (id === 'air' || id === 'stone') continue;
    const render = renderInfoFor(`minecraft:${id}`);
    const [r, g, b] = hexRgb(render.color);
    const texture = (suffix = '') => `minecraft:block/${id}${suffix}`;
    let blockstate: unknown;
    if (id.endsWith('_log') || id.endsWith('_wood') || id === 'hay_block') {
      // Like the game: one column model, rotated for axis=x/z.
      entries.push({
        name: `assets/minecraft/models/block/${id}.json`,
        data: json({ parent: 'minecraft:block/cube_column', textures: { side: texture(), end: texture('_top') } }),
      });
      entries.push({ name: `assets/minecraft/textures/block/${id}_top.png`, data: encodePng(16, 16, () => [r >> 1, g >> 1, b >> 1, 255]) });
      blockstate = {
        variants: {
          'axis=x': { model: `minecraft:block/${id}`, x: 90, y: 90 },
          'axis=y': { model: `minecraft:block/${id}` },
          'axis=z': { model: `minecraft:block/${id}`, x: 90 },
        },
      };
    } else if (id === 'rail') {
      entries.push({ name: `assets/minecraft/models/block/${id}.json`, data: json({ parent: 'minecraft:block/flat_plate', textures: { rail: texture() } }) });
      blockstate = { variants: { '': { model: `minecraft:block/${id}` } } };
    } else {
      const parent = id.endsWith('_leaves') ? 'minecraft:block/tinted_cube_all' : 'minecraft:block/cube_all';
      entries.push({ name: `assets/minecraft/models/block/${id}.json`, data: json({ parent, textures: { all: texture() } }) });
      blockstate = { variants: { '': { model: `minecraft:block/${id}` } } };
    }
    entries.push({ name: `assets/minecraft/blockstates/${id}.json`, data: json(blockstate) });
    const glass = render.kind === 'translucent';
    const leaves = id.endsWith('_leaves');
    entries.push({
      name: `assets/minecraft/textures/block/${id}.png`,
      data: encodePng(16, 16, (x, y) => {
        if (leaves) return (x + y) % 3 === 0 ? [0, 0, 0, 0] : [200, 200, 200, 255];
        if (glass) return x === 0 || y === 0 || x === 15 || y === 15 ? [r, g, b, 255] : [r, g, b, 120];
        return [r, g, b, 255];
      }),
    });
  }
  return buildZip(entries);
}
