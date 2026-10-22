import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { AIR, definitionOf, propsOf } from '@/core/blocks/registry';
import { SHAPES } from '@/core/blocks/shapes';
import { generateBuildingWithReport } from '@/core/generator/generateBuilding';
import { DEFAULT_HOUSE_SPEC, type BuildSpec } from '@/core/schema/buildSpec';
import { STYLE_IDS, type StyleId } from '@/core/style/styles';
import type { VoxelModel } from '@/core/schema/voxelModel';

/**
 * Development tool, not a regular test: renders generated buildings as isometric PNGs at
 * half-block resolution (so stairs and slabs are visible) for quick visual checks without a
 * browser. MCB_RENDER=1 MCB_RENDER_DIR=<dir> npx vitest run tests/integration/renderIso.test.ts
 * The real look (with Minecraft textures) is checked with the Playwright screenshots.
 */

const enabled = !!process.env.MCB_RENDER;
const outDir = process.env.MCB_RENDER_DIR ?? 'render-out';

function crcTable(): Uint32Array {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
}
const CRC = crcTable();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function png(width: number, height: number, rgb: Uint8Array): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0;
    Buffer.from(rgb.buffer, y * width * 3, width * 3).copy(raw, y * (width * 3 + 1) + 1);
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const TONES: Record<string, [number, number, number]> = { glow: [255, 210, 122], fire: [255, 154, 60], metal: [59, 65, 72], dark: [74, 52, 38], plant: [70, 110, 50] };

/** Isometric render viewed from the north-west (front) or south-east, half-block voxels. */
export function renderIso(model: VoxelModel, view: 'nw' | 'se', scale = Number(process.env.MCB_RENDER_SCALE ?? 7)): Buffer {
  const { width: W, height: H, length: L } = model.dimensions;
  const R = 2; // sub-voxels per block
  const occ = new Map<number, [number, number, number]>();
  const id3 = (x: number, y: number, z: number) => x + W * R * (z + L * R * y);
  for (let y = 0; y < H; y++)
    for (let z = 0; z < L; z++)
      for (let x = 0; x < W; x++) {
        const state = model.palette[model.indices[x + W * (z + L * y)]!]!;
        if (state === AIR) continue;
        const def = definitionOf(state);
        const base = Number.parseInt(def.render.color.slice(1), 16);
        const rgb: [number, number, number] = [(base >> 16) & 255, (base >> 8) & 255, base & 255];
        for (const { box, tone } of SHAPES[def.shape].boxes(propsOf(state))) {
          const c = tone && tone !== 'main' ? (TONES[tone] ?? rgb) : rgb;
          for (let sy = 0; sy < R; sy++)
            for (let sz = 0; sz < R; sz++)
              for (let sx = 0; sx < R; sx++) {
                const cx = (sx + 0.5) * (16 / R);
                const cy = (sy + 0.5) * (16 / R);
                const cz = (sz + 0.5) * (16 / R);
                if (cx < box[0] || cx > box[3] || cy < box[1] || cy > box[4] || cz < box[2] || cz > box[5]) continue;
                // Thin parts (panes, fences, chains) still fill a sub-voxel so they stay visible.
                occ.set(id3(x * R + sx, y * R + sy, z * R + sz), c);
              }
        }
      }
  const s = scale;
  const cw = Math.ceil((W * R + L * R) * s * 0.866) + 4;
  const ch = Math.ceil(H * R * s + (W * R + L * R) * s * 0.5) + 4;
  const img = new Uint8Array(cw * ch * 3).fill(235);
  const depth = new Float32Array(cw * ch).fill(-Infinity);
  const flip = view === 'se';
  const project = (x: number, y: number, z: number) => {
    const X = flip ? W * R - x : x;
    const Z = flip ? L * R - z : z;
    return [(Z - X) * 0.866 * s + (W * R) * 0.866 * s + 2, -(y * s) - (X + Z) * 0.5 * s + (H * R * s + (W * R + L * R) * 0.5 * s) + 2] as const;
  };
  // Draw every sub-voxel's three visible faces as small filled polygons via point splatting.
  for (const [key, c] of occ) {
    const x = key % (W * R);
    const z = Math.floor(key / (W * R)) % (L * R);
    const y = Math.floor(key / (W * R * L * R));
    const nx = flip ? x + 1 : x - 1;
    const nz = flip ? z + 1 : z - 1;
    const faces: [boolean, number][] = [
      [!occ.has(id3(x, y + 1, z)), 1.0],
      [!occ.has(id3(nx, y, z)) || nx < 0, 0.75],
      [!occ.has(id3(x, y, nz)) || nz < 0, 0.88],
    ];
    if (!faces.some(([v]) => v)) continue;
    // Orthographic view direction (1, -1, 1): closeness = y - (x + z) (mirrored for the south-east view).
    const d = (flip ? x + z : -(x + z)) + y;
    for (let i = 0; i <= s * 2; i++)
      for (let j = 0; j <= s * 2; j++) {
        const u = i / (s * 2);
        const v = j / (s * 2);
        const pts: [number, number, number, number][] = [
          [x + u, y + 1, z + v, 1.0],
          [flip ? x + 1 : x, y + v, z + u, 0.75],
          [x + u, y + v, flip ? z + 1 : z, 0.88],
        ];
        pts.forEach(([px, py, pz, shade], fi) => {
          if (!faces[fi]![0]) return;
          const [sx, sy] = project(px, py, pz);
          const ix = Math.round(sx);
          const iy = Math.round(sy);
          if (ix < 0 || iy < 0 || ix >= cw || iy >= ch) return;
          const pd = d + (fi === 0 ? 0.001 : 0);
          if (pd < depth[iy * cw + ix]!) return;
          depth[iy * cw + ix] = pd;
          img[(iy * cw + ix) * 3] = Math.min(255, c[0] * shade);
          img[(iy * cw + ix) * 3 + 1] = Math.min(255, c[1] * shade);
          img[(iy * cw + ix) * 3 + 2] = Math.min(255, c[2] * shade);
        });
      }
  }
  return png(cw, ch, img);
}

describe.skipIf(!enabled)('Iso-Vorschau (Werkzeug)', () => {
  it('rendert Bauwerke aller Stile', () => {
    mkdirSync(outDir, { recursive: true });
    const styles = (process.env.MCB_RENDER_STYLES?.split(',') as StyleId[] | undefined) ?? [...STYLE_IDS];
    const sizes = (process.env.MCB_RENDER_SIZES?.split(',') as BuildSpec['size'][] | undefined) ?? ['medium'];
    const kind = (process.env.MCB_RENDER_KIND ?? 'house') as BuildSpec['kind'];
    const theme = (process.env.MCB_RENDER_THEME ?? 'christmas') as BuildSpec['theme'];
    const seeds = (process.env.MCB_RENDER_SEEDS ?? '1').split(',').map(Number);
    for (const style of styles)
      for (const size of sizes)
        for (const seed of seeds) {
          const spec: BuildSpec = { ...DEFAULT_HOUSE_SPEC, kind, style, theme, size, seed, options: JSON.parse(process.env.MCB_RENDER_OPTIONS ?? '{}') };
          const { model, repairs } = generateBuildingWithReport(spec);
          const name = `${kind}-${style}-${size}-${theme}-${seed}`;
          writeFileSync(join(outDir, `${name}-nw.png`), renderIso(model, 'nw'));
          writeFileSync(join(outDir, `${name}-se.png`), renderIso(model, 'se'));
          const d = model.dimensions;
          console.log(name, `${d.width}x${d.height}x${d.length}`, 'repairs', repairs.length, repairs.slice(0, 3).map((r) => r.reason));
        }
    expect(true).toBe(true);
  });
});
