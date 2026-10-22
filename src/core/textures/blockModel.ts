import {
  resourceName,
  type AssetPack,
  type BlockstateJson,
  type ConditionJson,
  type Direction,
  type ElementJson,
  type ModelJson,
  type VariantJson,
  type Vec3,
} from '@/core/textures/assetTypes';

/**
 * Turns a block state into textured quads the way the game's model baker does: blockstate
 * variant/multipart selection, model parent chain, texture references, element geometry,
 * element rotation, variant x/y rotation and uvlock. Pure and deterministic; positions are in
 * block units (0..1), texture coordinates in texture pixels (0..16).
 */

export interface Quad {
  /** Corners counter-clockwise seen from outside: top-left, bottom-left, bottom-right, top-right. */
  positions: [Vec3, Vec3, Vec3, Vec3];
  uvs: [[number, number], [number, number], [number, number], [number, number]];
  /** Resolved texture name, e.g. "block/oak_log". */
  texture: string;
  /** The face is hidden when the neighbour in this direction is a solid full block. */
  cullface: Direction | null;
  /** Facing used for the game's directional face shading. */
  direction: Direction;
  /** Tint slot (leaves, grass); -1 = untinted. */
  tintIndex: number;
  shade: boolean;
}

export interface BakedBlock {
  quads: Quad[];
  /** One unrotated 16×16×16 element with all six faces: hides neighbours if its textures are opaque. */
  fullCube: boolean;
  /** Missing models or textures (the block is then drawn without them). */
  missing: string[];
}

const DIR_VECTORS: Record<Direction, Vec3> = {
  down: [0, -1, 0],
  up: [0, 1, 0],
  north: [0, 0, -1],
  south: [0, 0, 1],
  west: [-1, 0, 0],
  east: [1, 0, 0],
};

export function directionVector(d: Direction): Vec3 {
  return DIR_VECTORS[d];
}

function nearestDirection(v: Vec3): Direction {
  const [x, y, z] = v;
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const az = Math.abs(z);
  if (ay >= ax && ay >= az) return y >= 0 ? 'up' : 'down';
  if (ax >= az) return x >= 0 ? 'east' : 'west';
  return z >= 0 ? 'south' : 'north';
}

// ---------------------------------------------------------------- blockstate selection

function matchesValue(actual: string | undefined, expected: string | number | boolean): boolean {
  let spec = String(expected);
  const negate = spec.startsWith('!');
  if (negate) spec = spec.slice(1);
  const hit = actual !== undefined && spec.split('|').includes(actual);
  return negate ? !hit : hit;
}

export function conditionMatches(condition: ConditionJson | undefined, props: Record<string, string>): boolean {
  if (!condition) return true;
  if ('OR' in condition && Array.isArray(condition.OR)) return condition.OR.some((c) => conditionMatches(c, props));
  if ('AND' in condition && Array.isArray(condition.AND)) return condition.AND.every((c) => conditionMatches(c, props));
  return Object.entries(condition as Record<string, string | number | boolean>).every(([k, v]) => matchesValue(props[k], v));
}

function variantKeyMatches(key: string, props: Record<string, string>): boolean {
  if (key === '' || key === 'normal') return true;
  return key.split(',').every((pair) => {
    const [k, v] = pair.split('=');
    return k !== undefined && v !== undefined && props[k] === v;
  });
}

function pickWeighted(options: VariantJson | VariantJson[], seed: number): VariantJson {
  if (!Array.isArray(options)) return options;
  const total = options.reduce((n, o) => n + (o.weight ?? 1), 0);
  let r = Math.abs(seed) % Math.max(1, total);
  for (const o of options) {
    r -= o.weight ?? 1;
    if (r < 0) return o;
  }
  return options[0]!;
}

/** The model variants the game would draw for these properties ("seed" picks among random variants). */
export function selectVariants(blockstate: BlockstateJson, props: Record<string, string>, seed = 0): VariantJson[] {
  if (blockstate.variants) {
    const entry = Object.entries(blockstate.variants).find(([key]) => variantKeyMatches(key, props));
    return entry ? [pickWeighted(entry[1], seed)] : [];
  }
  if (blockstate.multipart) {
    return blockstate.multipart.filter((c) => conditionMatches(c.when, props)).map((c) => pickWeighted(c.apply, seed));
  }
  return [];
}

// ---------------------------------------------------------------- models and textures

export interface FlatModel {
  textures: Record<string, string>;
  elements: ElementJson[];
}

/** Follows the parent chain: textures merge child-over-parent, elements come from the nearest model defining them. */
export function flattenModel(name: string, models: Record<string, ModelJson>, missing: string[] = []): FlatModel {
  const chain: ModelJson[] = [];
  let current: string | undefined = resourceName(name);
  const seen = new Set<string>();
  while (current && !seen.has(current) && chain.length < 32) {
    seen.add(current);
    const model: ModelJson | undefined = models[current];
    if (!model) {
      // "builtin/..." parents (e.g. builtin/generated) carry no block geometry.
      if (!current.startsWith('builtin/')) missing.push(`model ${current}`);
      break;
    }
    chain.push(model);
    current = model.parent ? resourceName(model.parent) : undefined;
  }
  const textures: Record<string, string> = {};
  for (let i = chain.length - 1; i >= 0; i--) Object.assign(textures, chain[i]!.textures ?? {});
  const elements = chain.find((m) => m.elements)?.elements ?? [];
  return { textures, elements };
}

/** Resolves "#side" style references to a texture name ("block/oak_log"), or null. */
export function resolveTextureRef(ref: string, textures: Record<string, string>): string | null {
  let value: string | undefined = ref;
  for (let i = 0; i < 16 && value !== undefined; i++) {
    if (!value.startsWith('#')) return resourceName(value);
    value = textures[value.slice(1)];
  }
  return null;
}

// ---------------------------------------------------------------- geometry

/** Corners of a face, clockwise seen from outside: top-left, top-right, bottom-right, bottom-left (pixels). */
function faceCornersCw(dir: Direction, f: Vec3, t: Vec3): [Vec3, Vec3, Vec3, Vec3] {
  const [f0, f1, f2] = f;
  const [t0, t1, t2] = t;
  switch (dir) {
    case 'north':
      return [[t0, t1, f2], [f0, t1, f2], [f0, f1, f2], [t0, f1, f2]];
    case 'south':
      return [[f0, t1, t2], [t0, t1, t2], [t0, f1, t2], [f0, f1, t2]];
    case 'west':
      return [[f0, t1, f2], [f0, t1, t2], [f0, f1, t2], [f0, f1, f2]];
    case 'east':
      return [[t0, t1, t2], [t0, t1, f2], [t0, f1, f2], [t0, f1, t2]];
    case 'up':
      return [[f0, t1, f2], [t0, t1, f2], [t0, t1, t2], [f0, t1, t2]];
    case 'down':
      return [[f0, f1, t2], [t0, f1, t2], [t0, f1, f2], [f0, f1, f2]];
  }
}

/** World-locked texture projection (the vanilla default UV rule), used for default UVs and uvlock. */
function projectUv(dir: Direction, p: Vec3): [number, number] {
  const [x, y, z] = p;
  switch (dir) {
    case 'north':
      return [16 - x, 16 - y];
    case 'south':
      return [x, 16 - y];
    case 'west':
      return [z, 16 - y];
    case 'east':
      return [16 - z, 16 - y];
    case 'up':
      return [x, z];
    case 'down':
      return [x, 16 - z];
  }
}

function rotateAround(p: Vec3, origin: Vec3, axis: 'x' | 'y' | 'z', degrees: number, rescale = false): Vec3 {
  const rad = (degrees * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  let x = p[0] - origin[0];
  let y = p[1] - origin[1];
  let z = p[2] - origin[2];
  // Right-handed rotation (counter-clockwise looking from the positive axis).
  if (axis === 'x') [y, z] = [y * c - z * s, y * s + z * c];
  else if (axis === 'y') [x, z] = [x * c + z * s, -x * s + z * c];
  else [x, y] = [x * c - y * s, x * s + y * c];
  if (rescale && Math.abs(c) > 1e-6) {
    const k = 1 / Math.abs(c);
    if (axis !== 'x') x *= k;
    if (axis !== 'y') y *= k;
    if (axis !== 'z') z *= k;
  }
  const out: Vec3 = [x + origin[0], y + origin[1], z + origin[2]];
  return out.map((v) => Math.round(v * 1e4) / 1e4) as Vec3;
}

/** Variant rotation as in the game: x first, then y, both clockwise (negative right-handed angles). */
function rotateVariant(p: Vec3, xDeg: number, yDeg: number): Vec3 {
  const center: Vec3 = [8, 8, 8];
  let out = p;
  if (xDeg) out = rotateAround(out, center, 'x', -xDeg);
  if (yDeg) out = rotateAround(out, center, 'y', -yDeg);
  return out;
}

function rotateDirection(d: Direction, xDeg: number, yDeg: number): Direction {
  const v = DIR_VECTORS[d];
  return nearestDirection(rotateVariant([v[0] * 8 + 8, v[1] * 8 + 8, v[2] * 8 + 8], xDeg, yDeg).map((c) => c - 8) as Vec3);
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function isFullCubeElement(e: ElementJson): boolean {
  return (
    !e.rotation &&
    e.from.every((v) => v === 0) &&
    e.to.every((v) => v === 16) &&
    (['down', 'up', 'north', 'south', 'west', 'east'] as Direction[]).every((d) => e.faces[d])
  );
}

export function bakeVariant(variant: VariantJson, models: Record<string, ModelJson>, missing: string[] = []): { quads: Quad[]; fullCube: boolean } {
  const model = flattenModel(variant.model, models, missing);
  const xRot = ((variant.x ?? 0) % 360 + 360) % 360;
  const yRot = ((variant.y ?? 0) % 360 + 360) % 360;
  const quads: Quad[] = [];
  for (const element of model.elements) {
    for (const [dirName, face] of Object.entries(element.faces)) {
      if (!face) continue;
      const dir = dirName as Direction;
      const texture = resolveTextureRef(face.texture, model.textures);
      if (!texture) {
        missing.push(`texture ${face.texture} in ${resourceName(variant.model)}`);
        continue;
      }
      // Element-space corners (pixels), clockwise TL, TR, BR, BL.
      let corners = faceCornersCw(dir, element.from, element.to);
      const uv = face.uv ?? defaultUv(dir, element.from, element.to);
      const cwUvs: [number, number][] = [
        [uv[0], uv[1]],
        [uv[2], uv[1]],
        [uv[2], uv[3]],
        [uv[0], uv[3]],
      ];
      const steps = (((face.rotation ?? 0) / 90) % 4 + 4) % 4;
      let uvs = cwUvs.map((_, i) => cwUvs[(i - steps + 4) % 4]!);
      if (element.rotation) {
        const r = element.rotation;
        corners = corners.map((c) => rotateAround(c, r.origin, r.axis, r.angle, r.rescale)) as typeof corners;
      }
      corners = corners.map((c) => rotateVariant(c, xRot, yRot)) as typeof corners;
      const normal = cross(sub(corners[3], corners[0]), sub(corners[1], corners[0]));
      const direction = nearestDirection(normal);
      if (variant.uvlock && (xRot || yRot)) uvs = corners.map((c) => projectUv(direction, c));
      // Output counter-clockwise: TL, BL, BR, TR.
      const order = [0, 3, 2, 1] as const;
      quads.push({
        positions: order.map((i) => corners[i]!.map((v) => v / 16)) as Quad['positions'],
        uvs: order.map((i) => [uvs[i]![0], uvs[i]![1]]) as Quad['uvs'],
        texture,
        cullface: face.cullface ? rotateDirection(face.cullface, xRot, yRot) : null,
        direction,
        tintIndex: face.tintindex ?? -1,
        shade: element.shade ?? true,
      });
    }
  }
  return { quads, fullCube: model.elements.some(isFullCubeElement) };
}

function defaultUv(dir: Direction, f: Vec3, t: Vec3): [number, number, number, number] {
  const a = projectUv(dir, faceCornersCw(dir, f, t)[0]);
  const b = projectUv(dir, faceCornersCw(dir, f, t)[2]);
  return [a[0], a[1], b[0], b[1]];
}

/** Bakes one block state ("minecraft:oak_log[axis=x]"); seed picks among weighted random variants. */
export function bakeBlockState(
  id: string,
  props: Record<string, string>,
  pack: Pick<AssetPack, 'blockstates' | 'models'>,
  seed = 0,
): BakedBlock {
  const name = resourceName(id);
  const missing: string[] = [];
  if (name === 'air' || name === 'cave_air' || name === 'void_air') return { quads: [], fullCube: false, missing };
  const blockstate = pack.blockstates[name];
  if (!blockstate) return { quads: [], fullCube: false, missing: [`blockstate ${name}`] };
  const quads: Quad[] = [];
  let fullCube = false;
  for (const variant of selectVariants(blockstate, props, seed)) {
    const baked = bakeVariant(variant, pack.models, missing);
    quads.push(...baked.quads);
    fullCube ||= baked.fullCube;
  }
  return { quads, fullCube, missing };
}

/** Texture used for icons: the model's "particle" texture, else the first face texture. */
export function iconTexture(id: string, props: Record<string, string>, pack: Pick<AssetPack, 'blockstates' | 'models'>): string | null {
  const blockstate = pack.blockstates[resourceName(id)];
  if (!blockstate) return null;
  const variant = selectVariants(blockstate, props)[0];
  if (!variant) return null;
  const model = flattenModel(variant.model, pack.models);
  return (
    (model.textures.particle ? resolveTextureRef(model.textures.particle, model.textures) : null) ??
    bakeVariant(variant, pack.models).quads[0]?.texture ??
    null
  );
}
