import { blockIdOf, blockState, parseBlockState } from '@/core/blocks/registry';
import type { AssetPack } from '@/core/textures/assetTypes';
import { bakeBlockState, iconTexture, type BakedBlock } from '@/core/textures/blockModel';
import { tintColor, type AlphaClass, type AtlasLookup } from '@/core/textures/texturedMesh';

/**
 * Browser side of the real-texture preview: packs the block textures into one atlas canvas
 * (16 px tiles in 32 px cells whose 8 px border repeats the tile edge, so mipmaps do not bleed),
 * classifies each texture as opaque/cutout/translucent and bakes block models on demand.
 */

const TILE = 16;
const CELL = 32;
const PAD = (CELL - TILE) / 2;

export interface ClientTexturePack {
  version: string;
  canvas: HTMLCanvasElement;
  lookup: AtlasLookup;
  bake(state: string): BakedBlock;
  /** Small data URL of the block's texture (tinted like in the game), or null. */
  icon(stateOrId: string): string | null;
}

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

async function decode(base64: string): Promise<ImageBitmap> {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return createImageBitmap(new Blob([bytes], { type: 'image/png' }));
}

function classify(data: Uint8ClampedArray): AlphaClass {
  let transparent = false;
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i]!;
    if (a > 0 && a < 255) return 'translucent';
    if (a === 0) transparent = true;
  }
  return transparent ? 'cutout' : 'opaque';
}

export async function buildTexturePack(pack: AssetPack): Promise<ClientTexturePack> {
  const names = Object.keys(pack.textures).sort();
  const cols = Math.max(1, Math.ceil(Math.sqrt(names.length)));
  const size = nextPow2(cols * CELL);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D nicht verfügbar');
  ctx.imageSmoothingEnabled = false;

  const rects = new Map<string, [number, number, number, number]>();
  const alpha = new Map<string, AlphaClass>();
  const origins = new Map<string, [number, number]>();
  const images = await Promise.all(names.map((n) => decode(pack.textures[n]!.png).catch(() => null)));

  names.forEach((name, i) => {
    const image = images[i];
    if (!image) return;
    const cx = (i % cols) * CELL;
    const cy = Math.floor(i / cols) * CELL;
    const x = cx + PAD;
    const y = cy + PAD;
    // Animated textures are vertical strips: use the first (square) frame.
    const frame = Math.min(image.width, image.height);
    ctx.drawImage(image, 0, 0, frame, frame, x, y, TILE, TILE);
    // Repeat the edge pixels into the border.
    ctx.drawImage(canvas, x, y, 1, TILE, cx, y, PAD, TILE);
    ctx.drawImage(canvas, x + TILE - 1, y, 1, TILE, x + TILE, y, PAD, TILE);
    ctx.drawImage(canvas, cx, y, CELL, 1, cx, cy, CELL, PAD);
    ctx.drawImage(canvas, cx, y + TILE - 1, CELL, 1, cx, y + TILE, CELL, PAD);
    alpha.set(name, classify(ctx.getImageData(x, y, TILE, TILE).data));
    rects.set(name, [x / size, y / size, (x + TILE) / size, (y + TILE) / size]);
    origins.set(name, [x, y]);
    image.close();
  });

  const bakeCache = new Map<string, BakedBlock>();
  const bake = (state: string): BakedBlock => {
    let baked = bakeCache.get(state);
    if (!baked) {
      const parsed = parseBlockState(state);
      baked = parsed ? bakeBlockState(parsed.id, parsed.properties, pack) : { quads: [], fullCube: false, missing: [state] };
      bakeCache.set(state, baked);
    }
    return baked;
  };

  const iconCache = new Map<string, string | null>();
  const icon = (stateOrId: string): string | null => {
    if (iconCache.has(stateOrId)) return iconCache.get(stateOrId)!;
    // A bare block id stands for its default state (all properties set).
    let state = stateOrId;
    if (!state.includes('[')) {
      try {
        state = blockState(blockIdOf(state));
      } catch {
        // not in the registry: keep the id
      }
    }
    const parsed = parseBlockState(state);
    const id = parsed?.id ?? blockIdOf(state);
    const texture = iconTexture(id, parsed?.properties ?? {}, pack);
    const origin = texture ? origins.get(texture) : undefined;
    let url: string | null = null;
    if (texture && origin) {
      const c = document.createElement('canvas');
      c.width = TILE;
      c.height = TILE;
      const g = c.getContext('2d');
      if (g) {
        g.imageSmoothingEnabled = false;
        g.drawImage(canvas, origin[0], origin[1], TILE, TILE, 0, 0, TILE, TILE);
        const tinted = bake(state).quads.some((q) => q.tintIndex >= 0);
        if (tinted) {
          const [r, gr, b] = tintColor(id, 0);
          g.globalCompositeOperation = 'multiply';
          g.fillStyle = `rgb(${Math.round(r * 255)} ${Math.round(gr * 255)} ${Math.round(b * 255)})`;
          g.fillRect(0, 0, TILE, TILE);
          g.globalCompositeOperation = 'destination-in';
          g.drawImage(canvas, origin[0], origin[1], TILE, TILE, 0, 0, TILE, TILE);
        }
        url = c.toDataURL('image/png');
      }
    }
    iconCache.set(stateOrId, url);
    return url;
  };

  return {
    version: pack.version,
    canvas,
    lookup: {
      rect: (name) => rects.get(name) ?? null,
      alpha: (name) => alpha.get(name) ?? 'opaque',
    },
    bake,
    icon,
  };
}
