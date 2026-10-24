import { blockState, getBlockDefinition, profileBlockId } from '@/core/blocks/registry';
import { formOf } from '@/core/style/materials';
import type { RoleMaterials } from '@/core/templates/place';

/**
 * Building materials of the landscape, taken from the house palette roles (research 15,
 * recommendation 3: fence wood from `frame`/`beam` instead of a fixed spruce, path centre from
 * `path`, garden walls from `wall`). Every getter has a fallback for roles without the form
 * (concrete frames have no fence, calcite has no slab).
 */
export class LandscapeMaterials {
  constructor(
    readonly materials: RoleMaterials,
    readonly minecraftVersion: string,
    /** Wood for fences and gates when neither frame nor beam has one. */
    readonly fallbackWood: string,
  ) {}

  private form(role: keyof RoleMaterials, form: Parameters<typeof formOf>[1], suffix: string): string | null {
    const id = formOf(this.materials[role], form);
    return id && id.endsWith(suffix) ? id : null;
  }

  /** Short id of the path block (palette role `path`). */
  pathBlock(): string {
    return formOf(this.materials.path, 'block') ?? 'cobblestone';
  }

  fenceId(): string {
    return this.form('frame', 'fence', '_fence') ?? this.form('beam', 'fence', '_fence') ?? `${this.fallbackWood}_fence`;
  }

  gateId(): string {
    return this.form('frame', 'gate', '_fence_gate') ?? this.form('beam', 'gate', '_fence_gate') ?? `${this.fallbackWood}_fence_gate`;
  }

  /** Short id of a post log (beam role, then frame), axis y. */
  postId(): string {
    const log = formOf(this.materials.beam, 'pillar') ?? formOf(this.materials.frame, 'pillar');
    if (log && /_(log|wood|stem|block)$/.test(log) && getBlockDefinition(`minecraft:${log}`)?.properties.axis) return log;
    return `${this.fallbackWood === 'bamboo' ? 'dark_oak' : this.fallbackWood}_log`;
  }

  /** Full block of the wall role (garden walls). */
  wallBlockId(): string {
    return formOf(this.materials.wall, 'block') ?? 'smooth_sandstone';
  }

  /** Slab matching the wall role (own or substitute), or null. */
  wallSlabId(): string | null {
    return this.form('wall', 'slab', '_slab');
  }

  /** Canonical state of a short id in this building's Minecraft version. */
  state(id: string, props: Record<string, string> = {}): string {
    return blockState(profileBlockId(id, this.minecraftVersion), props);
  }

  post(): string {
    return this.state(this.postId(), { axis: 'y' });
  }
}
