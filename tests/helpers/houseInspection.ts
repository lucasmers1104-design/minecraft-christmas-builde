import { AIR, blockIdOf, renderInfoFor } from "@/core/blocks/registry";
import type { HouseLayout } from "@/core/generator/buildHouse";
import {
  blockAt,
  linearIndex,
  type VoxelModel,
} from "@/core/schema/voxelModel";

export const isAir = (m: VoxelModel, x: number, y: number, z: number) =>
  blockAt(m, x, y, z) === AIR;
export const idAt = (m: VoxelModel, x: number, y: number, z: number) =>
  blockIdOf(blockAt(m, x, y, z));
export const isGlass = (m: VoxelModel, x: number, y: number, z: number) =>
  renderInfoFor(blockAt(m, x, y, z)).kind === "translucent";

/** Number of non-air blocks not connected (6-neighbourhood) to the ground layer y = 0. */
export function countFloatingBlocks(m: VoxelModel): number {
  const { width, height, length } = m.dimensions;
  const seen = new Uint8Array(width * height * length);
  const queue: number[] = [];
  for (let z = 0; z < length; z++)
    for (let x = 0; x < width; x++) {
      if (!isAir(m, x, 0, z)) {
        const i = linearIndex(m.dimensions, x, 0, z);
        seen[i] = 1;
        queue.push(i);
      }
    }
  const dirs = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ] as const;
  while (queue.length > 0) {
    const i = queue.pop()!;
    const x = i % width;
    const z = Math.floor(i / width) % length;
    const y = Math.floor(i / (width * length));
    for (const [dx, dy, dz] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      const nz = z + dz;
      if (
        nx < 0 ||
        ny < 0 ||
        nz < 0 ||
        nx >= width ||
        ny >= height ||
        nz >= length
      )
        continue;
      const j = linearIndex(m.dimensions, nx, ny, nz);
      if (seen[j] || isAir(m, nx, ny, nz)) continue;
      seen[j] = 1;
      queue.push(j);
    }
  }
  let floating = 0;
  for (let i = 0; i < m.indices.length; i++)
    if (!seen[i] && m.palette[m.indices[i]!] !== AIR) floating++;
  return floating;
}

/**
 * Checks every structural requirement of the MVP house against the actual block data and
 * returns human-readable failures (empty array = house is complete).
 */
export function houseStructureProblems(
  m: VoxelModel,
  layout: HouseLayout,
  expect: { chimney?: boolean } = {},
): string[] {
  const problems: string[] = [];
  const { x0, x1, z0, z1, xc, wallTop, door } = layout;

  // Foundation under the whole footprint.
  for (let x = x0; x <= x1; x++)
    for (let z = z0; z <= z1; z++)
      if (isAir(m, x, 0, z)) problems.push(`Fundament fehlt bei (${x},0,${z})`);

  // Four closed walls: every wall cell is solid or glass, except the door opening.
  const doorCell = (x: number, y: number, z: number) =>
    x === door.x && z === door.z && y >= door.yFrom && y <= door.yTo;
  for (let y = 1; y <= wallTop; y++)
    for (let x = x0; x <= x1; x++)
      for (let z = z0; z <= z1; z++) {
        const onWall = x === x0 || x === x1 || z === z0 || z === z1;
        if (!onWall || doorCell(x, y, z)) continue;
        if (isAir(m, x, y, z))
          problems.push(`Loch in der Wand bei (${x},${y},${z})`);
      }

  // Door: two blocks high, open, passable from outside to inside, with floor and lintel.
  if (door.yTo - door.yFrom + 1 !== 2)
    problems.push("Eingang ist nicht zwei Blöcke hoch");
  for (let y = door.yFrom; y <= door.yTo; y++)
    for (const z of [door.z - 1, door.z, door.z + 1, door.z + 2])
      if (!isAir(m, door.x, y, z))
        problems.push(
          `Eingang blockiert bei (${door.x},${y},${z}) durch ${blockAt(m, door.x, y, z)}`,
        );
  if (isAir(m, door.x, 0, door.z))
    problems.push("Kein Boden unter dem Eingang");
  if (isAir(m, door.x, 0, door.z - 1))
    problems.push("Kein Weg vor dem Eingang");
  if (isAir(m, door.x, door.yTo + 1, door.z))
    problems.push("Kein Sturz über dem Eingang");
  if (door.z !== z0 || door.x !== xc)
    problems.push("Eingang nicht mittig in der Frontwand");

  // Windows: real glass, open to the outside and the inside.
  const walls = new Set(layout.windows.map((w) => w.wall));
  for (const wall of ["front", "back", "left", "right"] as const)
    if (!walls.has(wall)) problems.push(`Keine Fenster in der Wand ${wall}`);
  for (const w of layout.windows)
    for (const c of w.cells) {
      if (!isGlass(m, c.x, c.y, c.z))
        problems.push(
          `Fensterzelle (${c.x},${c.y},${c.z}) ist kein Glas: ${blockAt(m, c.x, c.y, c.z)}`,
        );
      const [ox, oz, ix, iz] =
        w.wall === "front"
          ? [c.x, c.z - 1, c.x, c.z + 1]
          : w.wall === "back"
            ? [c.x, c.z + 1, c.x, c.z - 1]
            : w.wall === "left"
              ? [c.x - 1, c.z, c.x + 1, c.z]
              : [c.x + 1, c.z, c.x - 1, c.z];
      if (!isAir(m, ox, c.y, oz))
        problems.push(`Fenster (${c.x},${c.y},${c.z}) außen verdeckt`);
      if (!isAir(m, ix, c.y, iz))
        problems.push(`Fenster (${c.x},${c.y},${c.z}) innen verdeckt`);
    }

  // Roof covers every footprint cell and is mirror-symmetric front/back (chimney excluded).
  for (let x = x0; x <= x1; x++)
    for (let z = z0; z <= z1; z++) {
      let covered = false;
      for (let y = wallTop + 1; y < m.dimensions.height; y++)
        if (!isAir(m, x, y, z)) covered = true;
      if (!covered) problems.push(`Dach deckt (${x},${z}) nicht ab`);
    }
  const zMirror = (z: number) => z0 - 1 + (z1 + 1) - z;
  const chimneyCell = (x: number, z: number) =>
    !!layout.chimney && layout.chimney.xs.includes(x) && z === layout.chimney.z;
  for (let y = wallTop + 1; y <= layout.roof.ridgeY; y++)
    for (let x = x0 - 1; x <= x1 + 1; x++)
      for (let z = z0 - 1; z <= z1 + 1; z++) {
        if (chimneyCell(x, z) || chimneyCell(x, zMirror(z))) continue;
        if (x > x0 && x < x1) {
          // Only compare roof/cover blocks, not interior decoration below the roof.
          const a = idAt(m, x, y, z);
          const b = idAt(m, x, y, zMirror(z));
          const roofish = (id: string) =>
            id ===
              blockIdOf(
                blockAt(m, xc, layout.roof.ridgeY, layout.roof.ridgeZ),
              ) || id === "minecraft:snow_block";
          if ((roofish(a) || roofish(b)) && a !== b)
            problems.push(`Dach asymmetrisch bei (${x},${y},${z})`);
        }
      }
  const ridgeAboveWalls = layout.roof.ridgeY > wallTop + 2;
  if (!ridgeAboveWalls) problems.push("First nicht erkennbar über den Wänden");

  // Chimney: present (unless switched off), above the ridge, beside it, not over the entrance.
  const { chimney } = layout;
  if (!chimney) {
    if (expect.chimney !== false) problems.push("Kein Schornstein");
  } else {
    if (chimney.xs.length === 0) problems.push("Kein Schornstein");
    for (const x of chimney.xs) {
      for (let y = chimney.yFrom; y <= chimney.yTo; y++)
        if (isAir(m, x, y, chimney.z))
          problems.push(
            `Schornstein unterbrochen bei (${x},${y},${chimney.z})`,
          );
      if (x === door.x && chimney.z <= door.z + 1)
        problems.push("Schornstein über dem Eingang");
    }
    if (chimney.yTo <= layout.roof.ridgeY)
      problems.push("Schornstein ragt nicht über den First");
    if (Math.abs(chimney.z - layout.roof.ridgeZ) > 2)
      problems.push("Schornstein steht nicht neben dem First");
  }

  // Interior is not solid: at least 70 % of the walkable layer (y = 1..2) is free.
  let free = 0;
  let total = 0;
  for (let x = x0 + 1; x < x1; x++)
    for (let z = z0 + 1; z < z1; z++) {
      total++;
      if (isAir(m, x, 1, z) && isAir(m, x, 2, z)) free++;
    }
  if (free / total < 0.7)
    problems.push(`Innenraum zu voll (${free}/${total} frei)`);

  // At least three blocks of clear interior height along the walls.
  for (const [x, z] of [
    [x0 + 1, z0 + 1],
    [x1 - 1, z0 + 1],
  ] as const) {
    let h = 0;
    while (isAir(m, x, 1 + h, z)) h++;
    if (h < 3) problems.push(`Innenhöhe an (${x},${z}) nur ${h}`);
  }

  const floating = countFloatingBlocks(m);
  if (floating > 0)
    problems.push(`${floating} schwebende, unverbundene Blöcke`);
  return problems;
}
