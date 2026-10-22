import { describe, expect, it } from 'vitest';
import type { Direction } from '@/core/blocks/directions';
import { AIR, blockState, propsOf } from '@/core/blocks/registry';
import { orderedByNearest, planPlacement, type Cell, type PlacementRequest, type PlacementWorld, type Vec3 } from '@/core/editor/placement';

const STONE = blockState('stone');
const NORTH: Vec3 = { x: 0, y: -0.4, z: -1 };
const EAST: Vec3 = { x: 1, y: -0.2, z: 0.1 };

function world(blocks: Record<string, string> = {}, size = 6): PlacementWorld & { blocks: Record<string, string> } {
  return {
    blocks,
    dimensions: { width: size, height: size, length: size },
    stateAt: (c: Cell) => blocks[`${c.x},${c.y},${c.z}`] ?? AIR,
  };
}

const key = (c: Cell) => `${c.x},${c.y},${c.z}`;
const STEP: Record<Direction, [number, number, number]> = {
  east: [1, 0, 0],
  west: [-1, 0, 0],
  up: [0, 1, 0],
  down: [0, -1, 0],
  south: [0, 0, 1],
  north: [0, 0, -1],
};

/** A click on face `face` of block `hit` at height `h` (0..1) within the face (sides) or at its centre. */
function click(brush: string, hit: Cell, face: Direction, look: Vec3, h = 0.5, along = 0.5): PlacementRequest {
  const [dx, dy, dz] = STEP[face];
  const place = { x: hit.x + dx, y: hit.y + dy, z: hit.z + dz };
  const point = {
    x: hit.x + (dx === 0 ? along : dx > 0 ? 1 : 0),
    y: hit.y + (dy === 0 ? h : dy > 0 ? 1 : 0),
    z: hit.z + (dz === 0 ? (dx === 0 && dy === 0 ? along : 0.5) : dz > 0 ? 1 : 0),
  };
  return { brush, hit, place, face, point, look };
}

function place(w: PlacementWorld, request: PlacementRequest) {
  const result = planPlacement(w, request);
  if (!result.ok) throw new Error(result.reason);
  return { ...result, props: propsOf(result.state) };
}

describe('Platzieren wie im Spiel', () => {
  const ground = { x: 2, y: 0, z: 2 };
  const base = () => world({ [key(ground)]: STONE, '2,3,2': STONE, '4,1,2': STONE });

  it('Treppe: Richtung = Blickrichtung, Hälfte nach angeklickter Fläche und Klickhöhe', () => {
    const stairs = blockState('oak_stairs');
    const top = place(base(), click(stairs, ground, 'up', NORTH));
    expect(top.cell).toEqual({ x: 2, y: 1, z: 2 });
    expect(top.props).toMatchObject({ facing: 'north', half: 'bottom', shape: 'straight', waterlogged: 'false' });
    // Underside of the block above.
    expect(place(base(), click(stairs, { x: 2, y: 3, z: 2 }, 'down', NORTH)).props.half).toBe('top');
    // West face of the block at x=4: upper and lower half.
    expect(place(base(), click(stairs, { x: 4, y: 1, z: 2 }, 'west', EAST, 0.8)).props).toMatchObject({ facing: 'east', half: 'top' });
    expect(place(base(), click(stairs, { x: 4, y: 1, z: 2 }, 'west', EAST, 0.2)).props).toMatchObject({ facing: 'east', half: 'bottom' });
  });

  it('Stufe: oben oder unten, auf passender Stufe wird sie zur doppelten Stufe', () => {
    const slab = blockState('oak_slab');
    expect(place(base(), click(slab, { x: 4, y: 1, z: 2 }, 'west', EAST, 0.7)).props.type).toBe('top');
    expect(place(base(), click(slab, ground, 'up', NORTH)).props.type).toBe('bottom');
    expect(place(base(), click(slab, { x: 2, y: 3, z: 2 }, 'down', NORTH)).props.type).toBe('top');

    const bottomSlab = blockState('oak_slab', { type: 'bottom' });
    const w = world({ '2,1,2': bottomSlab });
    // Top face of the bottom slab lies at y = 1.5.
    const merged = place(w, { brush: slab, hit: { x: 2, y: 1, z: 2 }, place: { x: 2, y: 2, z: 2 }, face: 'up', point: { x: 2.5, y: 1.5, z: 2.5 }, look: NORTH });
    expect(merged).toMatchObject({ cell: { x: 2, y: 1, z: 2 }, merged: true });
    expect(merged.props.type).toBe('double');
    // Side of the bottom slab, upper half: also merges (vanilla SlabBlock#canBeReplaced).
    expect(place(w, click(slab, { x: 2, y: 1, z: 2 }, 'east', { x: -1, y: 0, z: 0 }, 0.7)).merged).toBe(true);
    // Another kind of slab is not merged but placed on top.
    const other = place(w, { brush: blockState('spruce_slab'), hit: { x: 2, y: 1, z: 2 }, place: { x: 2, y: 2, z: 2 }, face: 'up', point: { x: 2.5, y: 1.5, z: 2.5 }, look: NORTH });
    expect(other.cell).toEqual({ x: 2, y: 2, z: 2 });
    expect(other.merged).toBe(false);
  });

  it('Falltür: Seitenfläche bestimmt Richtung und Hälfte, sonst gegen die Blickrichtung', () => {
    const trapdoor = blockState('spruce_trapdoor');
    expect(place(base(), click(trapdoor, { x: 4, y: 1, z: 2 }, 'west', EAST, 0.8)).props).toMatchObject({ facing: 'west', half: 'top' });
    expect(place(base(), click(trapdoor, { x: 4, y: 1, z: 2 }, 'west', EAST, 0.3)).props).toMatchObject({ facing: 'west', half: 'bottom' });
    expect(place(base(), click(trapdoor, ground, 'up', NORTH)).props).toMatchObject({ facing: 'south', half: 'bottom' });
    expect(place(base(), click(trapdoor, { x: 2, y: 3, z: 2 }, 'down', NORTH)).props).toMatchObject({ facing: 'south', half: 'top' });
  });

  it('Stämme, Säulen und Ketten folgen der Achse der angeklickten Fläche', () => {
    for (const block of ['oak_log', 'quartz_pillar', 'iron_chain']) {
      const brush = blockState(block);
      expect(place(base(), click(brush, { x: 4, y: 1, z: 2 }, 'west', EAST)).props.axis).toBe('x');
      expect(place(base(), click(brush, ground, 'up', NORTH)).props.axis).toBe('y');
      expect(place(world({ '2,1,4': STONE }), click(brush, { x: 2, y: 1, z: 4 }, 'north', { x: 0, y: 0, z: 1 })).props.axis).toBe('z');
    }
  });

  it('Tür: Blickrichtung, untere Hälfte, Scharnier nach Nachbarn und Klickpunkt; braucht zwei freie Zellen', () => {
    const door = blockState('spruce_door');
    const plain = place(base(), click(door, ground, 'up', NORTH));
    expect(plain.cell).toEqual({ x: 2, y: 1, z: 2 });
    expect(plain.props).toMatchObject({ facing: 'north', half: 'lower' });
    // Facing north: left = west, right = east. Click point decides without neighbours.
    expect(place(base(), click(door, ground, 'up', NORTH, 0.5, 0.2)).props.hinge).toBe('left');
    expect(place(base(), click(door, ground, 'up', NORTH, 0.5, 0.8)).props.hinge).toBe('right');
    // Full blocks on the left side (both halves) put the hinge there; on the right likewise.
    const leftWall = world({ [key(ground)]: STONE, '1,1,2': STONE, '1,2,2': STONE });
    expect(place(leftWall, click(door, ground, 'up', NORTH, 0.5, 0.8)).props.hinge).toBe('left');
    const rightWall = world({ [key(ground)]: STONE, '3,1,2': STONE, '3,2,2': STONE });
    expect(place(rightWall, click(door, ground, 'up', NORTH, 0.5, 0.2)).props.hinge).toBe('right');
    // A lower door half on the left: the new door mirrors it (double door).
    const pair = world({ [key(ground)]: STONE, '1,1,2': blockState('spruce_door', { facing: 'north', half: 'lower' }) });
    expect(place(pair, click(door, ground, 'up', NORTH, 0.5, 0.2)).props.hinge).toBe('right');

    const blocked = planPlacement(world({ [key(ground)]: STONE, '2,2,2': STONE }), click(door, ground, 'up', NORTH));
    expect(blocked).toEqual({ ok: false, reason: expect.stringContaining('zwei Zellen') });
    const top = planPlacement(world({ '2,4,2': STONE }, 6), click(door, { x: 2, y: 4, z: 2 }, 'up', NORTH));
    expect(top.ok).toBe(false);
  });

  it('Zauntor und Lagerfeuer schauen in Blickrichtung, Kürbisse zum Spieler', () => {
    expect(place(base(), click(blockState('oak_fence_gate'), ground, 'up', NORTH)).props).toMatchObject({ facing: 'north', in_wall: 'false' });
    expect(place(base(), click(blockState('campfire'), ground, 'up', EAST)).props.facing).toBe('east');
    expect(place(base(), click(blockState('carved_pumpkin'), ground, 'up', NORTH)).props.facing).toBe('south');
    expect(place(base(), click(blockState('jack_o_lantern'), ground, 'up', EAST)).props.facing).toBe('west');
  });

  it('Fass zeigt zum Spieler, auch nach oben und unten', () => {
    const barrel = blockState('barrel');
    expect(place(base(), click(barrel, ground, 'up', { x: 0.1, y: -0.9, z: -0.3 })).props.facing).toBe('up');
    expect(place(base(), click(barrel, ground, 'up', { x: 0.1, y: -0.2, z: -0.9 })).props.facing).toBe('south');
  });

  it('Laterne hängt unter einer Decke und steht auf dem Boden', () => {
    const lantern = blockState('lantern');
    expect(place(base(), click(lantern, { x: 2, y: 3, z: 2 }, 'down', NORTH)).props.hanging).toBe('true');
    expect(place(base(), click(lantern, ground, 'up', NORTH)).props.hanging).toBe('false');
    // Side click (the lantern goes to x=3): the view decides first, support second.
    const ceilingOnly = world({ '4,1,2': STONE, '3,2,2': STONE });
    expect(place(ceilingOnly, click(lantern, { x: 4, y: 1, z: 2 }, 'west', { x: 1, y: 0.5, z: 0 })).props.hanging).toBe('true');
    expect(place(ceilingOnly, click(lantern, { x: 4, y: 1, z: 2 }, 'west', { x: 1, y: -0.5, z: 0 })).props.hanging).toBe('true');
    const both = world({ '4,1,2': STONE, '3,2,2': STONE, '3,0,2': STONE });
    expect(place(both, click(lantern, { x: 4, y: 1, z: 2 }, 'west', { x: 1, y: -0.5, z: 0 })).props.hanging).toBe('false');
  });

  it('Knopf haftet an der angeklickten Fläche', () => {
    const button = blockState('stone_button');
    expect(place(base(), click(button, { x: 4, y: 1, z: 2 }, 'west', EAST)).props).toMatchObject({ face: 'wall', facing: 'west' });
    expect(place(base(), click(button, ground, 'up', EAST)).props).toMatchObject({ face: 'floor', facing: 'east' });
    expect(place(base(), click(button, { x: 2, y: 3, z: 2 }, 'down', NORTH)).props).toMatchObject({ face: 'ceiling', facing: 'north' });
  });

  it('Endstab und Blitzableiter zeigen von der angeklickten Fläche weg', () => {
    expect(place(base(), click(blockState('lightning_rod'), { x: 4, y: 1, z: 2 }, 'west', EAST)).props.facing).toBe('west');
    expect(place(base(), click(blockState('end_rod'), ground, 'up', NORTH)).props.facing).toBe('up');
    // On top of an upward end rod the new rod points down (vanilla EndRodBlock).
    const rods = world({ '2,1,2': blockState('end_rod', { facing: 'up' }) });
    expect(place(rods, click(blockState('end_rod'), { x: 2, y: 1, z: 2 }, 'up', NORTH)).props.facing).toBe('down');
  });

  it('Kerzen, Schneeschichten und Blüten stapeln sich in derselben Zelle', () => {
    const candle = blockState('red_candle', { candles: '2' });
    const w = world({ '2,1,2': candle });
    const more = place(w, click(blockState('red_candle'), { x: 2, y: 1, z: 2 }, 'north', NORTH));
    expect(more.cell).toEqual({ x: 2, y: 1, z: 2 });
    expect(more.props.candles).toBe('3');

    const snow = world({ '2,1,2': blockState('snow', { layers: '3' }) });
    const onTop = place(snow, { brush: blockState('snow'), hit: { x: 2, y: 1, z: 2 }, place: { x: 2, y: 2, z: 2 }, face: 'up', point: { x: 2.5, y: 1.375, z: 2.5 }, look: NORTH });
    expect(onTop).toMatchObject({ cell: { x: 2, y: 1, z: 2 }, merged: true });
    expect(onTop.props.layers).toBe('4');
    const beside = place(snow, click(blockState('snow'), { x: 2, y: 1, z: 2 }, 'east', { x: -1, y: -0.3, z: 0 }, 0.1));
    expect(beside.cell).toEqual({ x: 3, y: 1, z: 2 });
    expect(beside.props.layers).toBe('1');

    const petals = world({ '2,1,2': blockState('pink_petals', { facing: 'east', flower_amount: '1' }) });
    const grown = place(petals, { brush: blockState('pink_petals'), hit: { x: 2, y: 1, z: 2 }, place: { x: 2, y: 2, z: 2 }, face: 'up', point: { x: 2.5, y: 1.1, z: 2.5 }, look: NORTH });
    expect(grown.props).toMatchObject({ facing: 'east', flower_amount: '2' });
    expect(place(base(), click(blockState('pink_petals'), ground, 'up', NORTH)).props.facing).toBe('south');
  });

  it('Schiene liegt in Blickrichtung, gewählte Kurven bleiben', () => {
    expect(place(base(), click(blockState('rail'), ground, 'up', EAST)).props.shape).toBe('east_west');
    expect(place(base(), click(blockState('rail', { shape: 'north_east' }), ground, 'up', EAST)).props.shape).toBe('north_east');
  });

  it('Blöcke ohne Ausrichtung bleiben, wie gewählt; nichts ist je geflutet', () => {
    expect(place(base(), click(blockState('gold_block'), ground, 'up', NORTH)).state).toBe('minecraft:gold_block');
    const pane = place(base(), click(blockState('glass_pane', { waterlogged: 'true' }), ground, 'up', NORTH));
    expect(pane.props.waterlogged).toBe('false');
    expect(place(base(), click(blockState('spruce_leaves', { persistent: 'false' }), ground, 'up', NORTH)).props.persistent).toBe('true');
    expect(place(base(), click(blockState('red_candle', { lit: 'true' }), ground, 'up', NORTH)).props).toMatchObject({ lit: 'true', candles: '1' });
  });

  it('Grenzen: außerhalb des Volumens und auf belegten Zellen wird nichts gesetzt', () => {
    const edge = world({ '0,1,2': STONE });
    expect(planPlacement(edge, click(STONE, { x: 0, y: 1, z: 2 }, 'west', EAST))).toEqual({ ok: false, reason: expect.stringContaining('kein Platz') });
    const full = world({ '2,0,2': STONE, '2,1,2': STONE });
    expect(planPlacement(full, { ...click(STONE, ground, 'up', NORTH), hit: null })).toEqual({ ok: false, reason: expect.stringContaining('belegt') });
    // Ground plane (no hit block): placed into the ground cell.
    expect(place(world(), { brush: STONE, hit: null, place: { x: 1, y: 0, z: 1 }, face: 'up', point: { x: 1.5, y: 0, z: 1.5 }, look: NORTH }).cell).toEqual({ x: 1, y: 0, z: 1 });
  });

  it('Blickrichtungen sortiert wie Direction.orderedByNearest', () => {
    expect(orderedByNearest({ x: 0.2, y: -0.9, z: -0.4 })).toEqual(['down', 'north', 'east', 'west', 'south', 'up']);
    expect(orderedByNearest({ x: -1, y: 0.1, z: 0.3 })).toEqual(['west', 'south', 'up', 'down', 'north', 'east']);
  });
});
