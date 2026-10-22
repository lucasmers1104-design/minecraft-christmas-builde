import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { blockState, isAvailableIn, listBlockDefinitions, propsOf } from '@/core/blocks/registry';
import { bakeBlockState } from '@/core/textures/blockModel';
import { tintColor } from '@/core/textures/texturedMesh';
import { readClientJar } from '@/lib/textures/minecraftJar';

/**
 * Tool, not a regular test: derives colour statistics for every registry block from the
 * user's own Minecraft client jar and writes them to src/core/style/textureStats.ts. Only
 * numbers end up in the repository (mean colour, CIELAB L*, chroma, hue) – no textures.
 *
 *   MCB_DERIVE_TEXTURE_STATS=1 MCB_MINECRAFT_JAR=<1.21.11.jar> npx vitest run tests/integration/deriveTextureStats.test.ts
 *
 * The values are compared with research_notes/…/helligkeit_texturen.tsv (measured with the
 * same definition: mean of per-pixel L*, chroma and hue of the mean a*, b*).
 */

const jar = process.env.MCB_MINECRAFT_JAR;
const enabled = !!process.env.MCB_DERIVE_TEXTURE_STATS && !!jar && existsSync(jar);

interface Image {
  width: number;
  height: number;
  rgba: Uint8Array;
}

function decodePng(data: Buffer): Image {
  let pos = 8;
  let width = 0;
  let height = 0;
  let depth = 8;
  let colorType = 6;
  let palette: Buffer | null = null;
  let trns: Buffer | null = null;
  const idat: Buffer[] = [];
  while (pos < data.length) {
    const len = data.readUInt32BE(pos);
    const type = data.toString('ascii', pos + 4, pos + 8);
    const body = data.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      depth = body[8]!;
      colorType = body[9]!;
    } else if (type === 'PLTE') palette = body;
    else if (type === 'tRNS') trns = body;
    else if (type === 'IDAT') idat.push(body);
    pos += 12 + len;
  }
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType as 0 | 2 | 3 | 4 | 6];
  const bpp = Math.max(1, (channels * depth) / 8);
  const stride = Math.ceil((width * channels * depth) / 8);
  const raw = inflateSync(Buffer.concat(idat));
  const out = new Uint8Array(width * height * 4);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!;
    const line = new Uint8Array(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp]! : 0;
      const b = prev[i]!;
      const c = i >= bpp ? prev[i - bpp]! : 0;
      let v = line[i]!;
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += Math.floor((a + b) / 2);
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[i] = v & 255;
    }
    const sample = (x: number, ch: number): number => {
      if (depth === 8) return line[x * channels + ch]!;
      const bit = (x * channels + ch) * depth;
      return (line[bit >> 3]! >> (8 - depth - (bit & 7))) & ((1 << depth) - 1);
    };
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      if (colorType === 6) for (let ch = 0; ch < 4; ch++) out[o + ch] = sample(x, ch);
      else if (colorType === 2) {
        for (let ch = 0; ch < 3; ch++) out[o + ch] = sample(x, ch);
        out[o + 3] = 255;
      } else if (colorType === 3) {
        const i = sample(x, 0);
        out[o] = palette![i * 3]!;
        out[o + 1] = palette![i * 3 + 1]!;
        out[o + 2] = palette![i * 3 + 2]!;
        out[o + 3] = trns && i < trns.length ? trns[i]! : 255;
      } else {
        const g = Math.round((sample(x, 0) * 255) / ((1 << depth) - 1));
        out[o] = out[o + 1] = out[o + 2] = g;
        out[o + 3] = colorType === 4 ? sample(x, 1) : 255;
      }
    }
    prev = line;
  }
  return { width, height, rgba: out };
}

const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);

function lab(r: number, g: number, b: number): [number, number, number] {
  const R = lin(r / 255);
  const G = lin(g / 255);
  const B = lin(b / 255);
  const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
  const Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  const Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}

function stats(img: Image, tint: [number, number, number]): { hex: string; L: number; chroma: number; hue: number } {
  // Only the first animation frame (square), only visible pixels.
  const h = Math.min(img.height, img.width);
  let n = 0;
  let sl = 0;
  let sa = 0;
  let sb = 0;
  let sr = 0;
  let sg = 0;
  let sbl = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < img.width; x++) {
      const o = (y * img.width + x) * 4;
      if (img.rgba[o + 3]! < 128) continue;
      const r = img.rgba[o]! * tint[0];
      const g = img.rgba[o + 1]! * tint[1];
      const b = img.rgba[o + 2]! * tint[2];
      const [L, A, B] = lab(r, g, b);
      sl += L;
      sa += A;
      sb += B;
      sr += r;
      sg += g;
      sbl += b;
      n++;
    }
  const a = sa / n;
  const b = sb / n;
  const hex = `#${[sr, sg, sbl].map((v) => Math.round(v / n).toString(16).padStart(2, '0')).join('')}`;
  return { hex, L: Math.round((sl / n) * 10) / 10, chroma: Math.round(Math.hypot(a, b) * 10) / 10, hue: Math.round(((Math.atan2(b, a) * 180) / Math.PI + 360) % 360) };
}

describe.skipIf(!enabled)('Texturstatistik aus der Client-Datei ableiten', () => {
  it('schreibt src/core/style/textureStats.ts und stimmt mit der Recherche-Tabelle überein', () => {
    const pack = readClientJar(readFileSync(jar!));
    const rows: string[] = [];
    const measured = new Map<string, number>();
    for (const def of listBlockDefinitions()) {
      if (def.id === 'minecraft:air' || !isAvailableIn(def.id, '1.21.11')) continue;
      const state = blockState(def.id);
      const quads = bakeBlockState(def.id, { ...propsOf(state) }, pack).quads;
      const area = (q: (typeof quads)[number]) => {
        const [p0, p1, p2] = q.positions;
        const u = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
        const v = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
        return Math.hypot(u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!);
      };
      // Main face: the top for ground blocks (their sides show dirt), else the north side.
      const face = def.shape === 'grass_block' || def.shape === 'path' ? 'up' : 'north';
      const side = [...quads].sort((a, b) => Number(b.direction === face) - Number(a.direction === face) || area(b) - area(a))[0];
      if (!side || !pack.textures[side.texture]) continue;
      const img = decodePng(Buffer.from(pack.textures[side.texture]!.png, 'base64'));
      const s = stats(img, tintColor(def.id, side.tintIndex));
      const name = def.id.replace('minecraft:', '');
      measured.set(name, s.L);
      rows.push(`  ${name}: ['${s.hex}', ${s.L}, ${s.chroma}, ${s.hue}],`);
    }
    const header = [
      '/**',
      ' * Colour statistics per block, derived from the Minecraft 1.21.11 client jar by',
      ' * tests/integration/deriveTextureStats.test.ts (numbers only, no textures):',
      ' * [mean sRGB colour, mean CIELAB L*, chroma and hue (degrees) of the mean a* and b*] of the',
      " * texture on the block's main side face (tinted like in the game for leaves). Generated – do not edit.",
      ' */',
      'export const TEXTURE_STATS: Readonly<Record<string, readonly [string, number, number, number]>> = {',
    ];
    writeFileSync('src/core/style/textureStats.ts', [...header, ...rows, '};', ''].join('\n'));

    // Cross-check with the research table (same measurement method).
    const tsv = readFileSync('research_notes/Minecraft Bautechniken für Generator/helligkeit_texturen.tsv', 'utf8').trim().split(/\r?\n/).slice(1);
    let compared = 0;
    for (const line of tsv) {
      const [block, L] = line.split('\t');
      const mine = measured.get(block!);
      if (mine === undefined || block!.endsWith('_leaves')) continue;
      expect(Math.abs(mine - Number(L)), block).toBeLessThan(2.5);
      compared++;
    }
    expect(compared).toBeGreaterThan(80);
  });
});
