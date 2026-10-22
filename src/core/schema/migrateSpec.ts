import { hasMaterial } from '@/core/style/materials';

/**
 * Migration of version-1 specs and patches (style christmas/fairytale/realistic, material
 * theme spruce/oak/stone, colour theme red_green/ice_blue/natural, wallHeight, roofShape,
 * tower/annex left/right, hedge, lights, frameWood, block ids in materials) to version 2.
 * Voxel data and hashes are untouched: the hash covers only dimensions, palette and indices.
 *
 * Works on unknown input (stored data); unknown shapes pass through unchanged so the zod
 * validation that follows reports them.
 */

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

function themeFrom(style: unknown, colorTheme: unknown): 'none' | 'winter' | 'christmas' | undefined {
  if (style === 'christmas' || colorTheme === 'red_green') return 'christmas';
  if (colorTheme === 'ice_blue') return 'winter';
  if (style !== undefined || colorTheme !== undefined) return 'none';
  return undefined;
}

function styleFrom(style: unknown, materialTheme: unknown): string | undefined {
  if (style === 'fairytale') return 'fantasy';
  if (materialTheme === 'stone') return 'medieval';
  if (materialTheme === 'spruce' || materialTheme === 'oak') return 'rustic';
  if (style === 'christmas' || style === 'realistic') return 'rustic';
  return undefined;
}

const WOOD_LOG: Readonly<Record<string, string>> = { spruce: 'spruce_log', oak: 'oak_log', dark_oak: 'dark_oak_log', birch: 'birch_log' };

/** Migrates v1 options (also partial ones from patches) to v2 options. */
function migrateOptions(o: Obj): Obj {
  const out: Obj = {};
  for (const [key, value] of Object.entries(o)) {
    switch (key) {
      case 'wallHeight':
        if (typeof value === 'number' && value >= 7) out.floors = 2;
        break;
      case 'roofShape':
        if (value === 'steep') {
          out.roofType = 'gable';
          out.roofProfile = 'steep';
        } else if (value === 'hip') out.roofType = 'hip';
        else if (value === 'gable') out.roofType = 'gable';
        break;
      case 'tower':
        if (value === 'left' || value === 'right') {
          out.tower = 'square';
          out.towerPosition = value === 'left' ? 'front_left' : 'front_right';
        } else if (value === 'none') out.tower = 'none';
        break;
      case 'hedge':
        out.garden = value;
        break;
      case 'lights':
        if (value === false) out.lanternDensity = 'none';
        break;
      case 'frameWood':
        if (typeof value === 'string' && WOOD_LOG[value]) out.materials = { ...(out.materials as Obj | undefined), frame: WOOD_LOG[value] };
        break;
      case 'materials':
        if (isObj(value)) {
          const m: Obj = { ...(out.materials as Obj | undefined) };
          for (const [part, id] of Object.entries(value)) {
            const target = part === 'foundation' ? 'plinth' : part;
            if (!['wall', 'roof', 'frame', 'plinth', 'accent'].includes(target) || typeof id !== 'string') continue;
            if (hasMaterial(id)) m[target] = id;
          }
          if (Object.keys(m).length > 0) out.materials = m;
        }
        break;
      case 'width':
      case 'depth':
        // v2 allows 5..61 odd; v1 values (7..33 / 5..25, odd) are valid as they are.
        out[key] = value;
        break;
      default:
        out[key] = value;
    }
  }
  return out;
}

/** True for anything that looks like a v1 patch or spec (old top-level fields). */
function isV1(o: Obj): boolean {
  return (
    o.schemaVersion === 1 ||
    'materialTheme' in o ||
    'colorTheme' in o ||
    o.style === 'christmas' ||
    o.style === 'fairytale' ||
    o.style === 'realistic' ||
    (isObj(o.options) && ['wallHeight', 'roofShape', 'hedge', 'lights', 'frameWood'].some((k) => k in (o.options as Obj))) ||
    (isObj(o.options) && (o.options as Obj).tower !== undefined && ['left', 'right'].includes((o.options as Obj).tower as string))
  );
}

/** Migrates a v1 spec or patch; v2 input is returned unchanged. */
export function migrateSpecLike(raw: unknown): unknown {
  if (!isObj(raw) || !isV1(raw)) return raw;
  const { materialTheme, colorTheme, style, options, schemaVersion, ...rest } = raw;
  const out: Obj = { ...rest };
  const newStyle = styleFrom(style, materialTheme);
  const theme = themeFrom(style, colorTheme);
  if (newStyle) out.style = newStyle;
  if (theme) out.theme = theme;
  if (schemaVersion !== undefined) out.schemaVersion = 2;
  if (isObj(options)) out.options = migrateOptions(options);
  if (out.size === undefined && schemaVersion === 1) out.size = 'medium';
  return out;
}
