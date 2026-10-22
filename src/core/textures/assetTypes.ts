/**
 * Shapes of the vanilla resource files the preview reads from the user's own Minecraft client
 * jar (assets/minecraft/blockstates, models/block, textures/block). Nothing of Mojang's assets
 * is shipped with this project; these types only describe the format.
 */

export type Direction = 'down' | 'up' | 'north' | 'south' | 'west' | 'east';
export const DIRECTIONS: readonly Direction[] = ['down', 'up', 'north', 'south', 'west', 'east'];

export type Vec3 = [number, number, number];

export interface VariantJson {
  model: string;
  x?: number;
  y?: number;
  uvlock?: boolean;
  weight?: number;
}

export type ConditionJson =
  | { OR: ConditionJson[] }
  | { AND: ConditionJson[] }
  | Record<string, string | number | boolean>;

export interface MultipartCaseJson {
  when?: ConditionJson;
  apply: VariantJson | VariantJson[];
}

export interface BlockstateJson {
  variants?: Record<string, VariantJson | VariantJson[]>;
  multipart?: MultipartCaseJson[];
}

export interface FaceJson {
  uv?: [number, number, number, number];
  texture: string;
  cullface?: Direction;
  rotation?: number;
  tintindex?: number;
}

export interface ElementRotationJson {
  origin: Vec3;
  axis: 'x' | 'y' | 'z';
  angle: number;
  rescale?: boolean;
}

export interface ElementJson {
  from: Vec3;
  to: Vec3;
  rotation?: ElementRotationJson;
  shade?: boolean;
  faces: Partial<Record<Direction, FaceJson>>;
}

export interface ModelJson {
  parent?: string;
  textures?: Record<string, string>;
  elements?: ElementJson[];
  ambientocclusion?: boolean;
}

export interface TextureEntry {
  /** PNG file, base64. */
  png: string;
  /** Has a .mcmeta animation: the PNG is a vertical strip, the preview uses the first frame. */
  animated: boolean;
}

/** Everything the preview needs, keyed without the "minecraft:" namespace ("block/oak_log"). */
export interface AssetPack {
  /** Minecraft version from the jar's version.json, e.g. "1.21.11". */
  version: string;
  blockstates: Record<string, BlockstateJson>;
  models: Record<string, ModelJson>;
  textures: Record<string, TextureEntry>;
}

/** Strips the namespace: "minecraft:block/stone" -> "block/stone". */
export function resourceName(name: string): string {
  const i = name.indexOf(':');
  return i === -1 ? name : name.slice(i + 1);
}
