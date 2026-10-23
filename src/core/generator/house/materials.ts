import type { HorizontalDirection } from '@/core/blocks/directions';
import { blockState, profileBlockId } from '@/core/blocks/registry';
import { formOf, requireForm, type Form } from '@/core/style/materials';
import type { Role } from '@/core/style/palettes';
import type { RoleMaterials } from '@/core/templates/place';
import { weatheredBlock, type WeatherFactors } from '@/core/style/texturing';

/**
 * Block factory for one building: role → material → form → canonical block state, with the
 * target Minecraft version applied to every block id (iron_chain → chain, pale oak → its
 * look-alike stand-in in 1.21.1).
 */
export class Blocks {
  constructor(
    readonly materials: RoleMaterials,
    readonly minecraftVersion: string,
    readonly seed: number,
  ) {}

  private id(role: Role, form: Form): string {
    return this.versioned(requireForm(this.materials[role], form));
  }

  /** Short block id valid in the target version. */
  private versioned(id: string): string {
    return profileBlockId(id, this.minecraftVersion).replace('minecraft:', '');
  }

  has(role: Role, form: Form): boolean {
    return formOf(this.materials[role], form) !== null;
  }

  block(role: Role): string {
    return blockState(this.id(role, 'block'));
  }

  /** Wall block with weathering variants (bottom, corners, under overhangs). */
  weathered(role: Role, x: number, y: number, z: number, f: WeatherFactors): string {
    return blockState(this.versioned(weatheredBlock(this.materials[role], this.seed, x, y, z, f)));
  }

  /** Log/pillar with axis; materials without logs (concrete trims) give their block. */
  log(role: Role, axis: 'x' | 'y' | 'z'): string {
    const pillar = formOf(this.materials[role], 'pillar');
    if (pillar) return blockState(this.versioned(pillar), { axis });
    return this.block(role);
  }

  /** Bark on all sides at frame nodes (falls back to the log). */
  wood(role: Role): string {
    const wood = formOf(this.materials[role], 'wood');
    return wood ? blockState(this.versioned(wood), { axis: 'y' }) : this.log(role, 'y');
  }

  stairs(role: Role, facing: HorizontalDirection, half: 'top' | 'bottom' = 'bottom'): string {
    return blockState(this.id(role, 'stairs'), { facing, half });
  }

  slab(role: Role, type: 'top' | 'bottom' | 'double' = 'bottom'): string {
    return blockState(this.id(role, 'slab'), { type });
  }

  fence(role: Role): string {
    const fence = formOf(this.materials[role], 'fence');
    if (fence) return blockState(this.versioned(fence));
    const wall = formOf(this.materials[role], 'wall');
    return wall ? blockState(this.versioned(wall)) : this.block(role);
  }

  wallForm(role: Role): string | null {
    const wall = formOf(this.materials[role], 'wall');
    return wall ? blockState(this.versioned(wall)) : null;
  }

  trapdoor(role: Role, facing: HorizontalDirection, half: 'top' | 'bottom', open: boolean): string {
    return blockState(this.id(role, 'trapdoor'), { facing, half, open: String(open) });
  }

  door(role: Role, facing: HorizontalDirection, hinge: 'left' | 'right'): string {
    return blockState(this.id(role, 'door'), { facing, half: 'lower', hinge });
  }

  pane(): string {
    return blockState(this.id('window', 'pane'));
  }

  glassBlock(): string {
    return blockState(this.id('window', 'block'));
  }

  /** A fixed block (decoration); short id. */
  fixed(id: string, props: Record<string, string> = {}): string {
    return blockState(profileBlockId(id, this.minecraftVersion), props);
  }
}
