/**
 * Pure geometry library for round shapes (circles, domes, cones, towers, arches). Integer cells only,
 * deterministic, no block ids. Criterion everywhere: "block centre inside the curve" (not Bresenham),
 * see research_notes/Minecraft Bautechniken für Generator/kreise_boegen_tuerme.md.
 */
export { centreOf, maskFrom, outline, renderMask, spanX, type Mask2D, type OutlineMode } from './mask';
export { centreDistSq, circle, disc, ellipse, ring, rowWidths, straightRun, type CircleMode } from './circles';
export {
  cone,
  dome,
  layerDiameters,
  onionProfile,
  revolve,
  sphere,
  type ConeOptions,
  type ConeProfile,
  type LayeredShape,
  type VolumeMode,
} from './solids';
export {
  battlementLayout,
  battlementPattern,
  battlementRuns,
  battlementSymmetric,
  dihedralImages,
  facingRing,
  notchCells,
  ringFacing,
  sectorBattlements,
  spireDiameters,
  taperDiameters,
  witchHatLayers,
  type Facing,
  type HelmLayer,
} from './towers';
export {
  pointedArch,
  roundArch,
  segmentalArch,
  type Arch,
  type ArchCell,
  type ArchOptions,
  type RoundArchOptions,
} from './arches';
