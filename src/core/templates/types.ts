import type { Form } from '@/core/style/materials';
import type { Role } from '@/core/style/palettes';
import type { StyleId } from '@/core/style/styles';

/**
 * Window and door templates as data (research notes fenster_tueren_details.md, W01–W18 and
 * T01–T10). Templates reference palette roles and forms, never fixed building blocks, so one
 * template works for every style. They are designed canonically for a facade whose outside
 * faces SOUTH (+Z):
 *
 *   x  = to the right when looking at the facade from outside (= east), 0 = left column of the
 *        opening,
 *   y  = up, 0 = bottom row of the opening (for doors: the row of the lower door half),
 *   d  = depth: 0 = wall plane, +1/+2 = in front of the wall (outside), −1 = inside.
 *
 * Properties are given for that south facade (e.g. a sill is `stairs` with
 * `{ facing: 'north', half: 'top' }` – full side against the wall). Placement rotates and
 * mirrors positions and states (src/core/templates/place.ts); neighbour-dependent properties
 * (stairs shape, pane/fence connections, door upper half) are left to the state resolver.
 */

export type TemplateRole = Role | 'glass' | 'air';

export interface TemplateCell {
  x: number;
  y: number;
  d: number;
  /** Palette role whose material provides the block (ignored when `block` is set). */
  role: TemplateRole;
  /** Form of the role's material (block, stairs, slab, pane, trapdoor, door, pillar, …). */
  form?: Form;
  /** Canonical (south facade) block properties, e.g. { facing: 'north', half: 'top' }. */
  props?: Readonly<Record<string, string>>;
  /** Fixed decorative block (flowers, pots, lanterns, chains); short id without namespace. */
  block?: string;
}

export interface FacadeTemplate {
  id: string;
  kind: 'window' | 'door';
  label: string;
  /** Size of the opening (glass area or door leaf) in blocks. */
  width: number;
  height: number;
  cells: readonly TemplateCell[];
  /** Styles that use this template (see style data). */
  styles: readonly StyleId[];
  /** Minimum free columns between this and the next opening on the same wall. */
  spacing: number;
  /** Short note on what is derived/untested, shown in the docs. */
  note?: string;
}
