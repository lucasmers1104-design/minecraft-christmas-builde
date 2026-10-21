import { blockState } from '@/core/blocks/registry';
import type { BuildStyle, ColorTheme, MaterialTheme } from '@/core/schema/buildSpec';

/** Structural materials, chosen by the material theme. All states are validated by blockState(). */
export interface MaterialPalette {
  foundation: string;
  floor: string;
  wall: string;
  post: string;
  beamX: string;
  beamZ: string;
  frame: string;
  roof: string;
  chimney: string;
  chimneyCap: string;
  path: string;
}

/** Decorative colours, chosen by the colour theme. */
export interface ColorPalette {
  primaryAccent: string;
  secondaryAccent: string;
  garland: string;
  garlandBow: string | null;
  windowGlass: string;
  light: string;
  roofCover: string;
  treeLeaves: string;
  treeTrunk: string;
  treeTop: string;
  ornaments: readonly string[];
  presents: readonly string[];
  /** Roof material used by the fairytale style instead of the material theme's roof. */
  fairytaleRoof: string;
}

export function materialPalette(theme: MaterialTheme): MaterialPalette {
  switch (theme) {
    case 'spruce':
      return {
        foundation: blockState('cobblestone'),
        floor: blockState('spruce_planks'),
        wall: blockState('spruce_planks'),
        post: blockState('spruce_log', { axis: 'y' }),
        beamX: blockState('stripped_spruce_log', { axis: 'x' }),
        beamZ: blockState('stripped_spruce_log', { axis: 'z' }),
        frame: blockState('stripped_spruce_log', { axis: 'y' }),
        roof: blockState('dark_oak_planks'),
        chimney: blockState('bricks'),
        chimneyCap: blockState('stone_bricks'),
        path: blockState('cobblestone'),
      };
    case 'oak':
      return {
        foundation: blockState('stone_bricks'),
        floor: blockState('oak_planks'),
        wall: blockState('oak_planks'),
        post: blockState('oak_log', { axis: 'y' }),
        beamX: blockState('stripped_oak_log', { axis: 'x' }),
        beamZ: blockState('stripped_oak_log', { axis: 'z' }),
        frame: blockState('stripped_oak_log', { axis: 'y' }),
        roof: blockState('spruce_planks'),
        chimney: blockState('bricks'),
        chimneyCap: blockState('stone_bricks'),
        path: blockState('stone_bricks'),
      };
    case 'stone':
      return {
        foundation: blockState('polished_andesite'),
        floor: blockState('spruce_planks'),
        wall: blockState('stone_bricks'),
        post: blockState('dark_oak_log', { axis: 'y' }),
        beamX: blockState('stripped_spruce_log', { axis: 'x' }),
        beamZ: blockState('stripped_spruce_log', { axis: 'z' }),
        frame: blockState('stripped_spruce_log', { axis: 'y' }),
        roof: blockState('deepslate_tiles'),
        chimney: blockState('cobblestone'),
        chimneyCap: blockState('smooth_stone'),
        path: blockState('polished_andesite'),
      };
  }
}

export function colorPalette(theme: ColorTheme): ColorPalette {
  const snow = blockState('snow_block');
  const garland = blockState('spruce_leaves');
  const trunk = blockState('spruce_log', { axis: 'y' });
  switch (theme) {
    case 'red_green':
      return {
        primaryAccent: blockState('red_wool'),
        secondaryAccent: blockState('green_wool'),
        garland,
        garlandBow: blockState('red_wool'),
        windowGlass: blockState('glass'),
        light: blockState('glowstone'),
        roofCover: snow,
        treeLeaves: garland,
        treeTrunk: trunk,
        treeTop: blockState('gold_block'),
        ornaments: [blockState('red_wool'), blockState('yellow_wool'), blockState('white_wool')],
        presents: [blockState('red_wool'), blockState('green_wool'), blockState('white_wool'), blockState('yellow_wool')],
        fairytaleRoof: blockState('red_terracotta'),
      };
    case 'ice_blue':
      return {
        primaryAccent: blockState('light_blue_wool'),
        secondaryAccent: blockState('white_wool'),
        garland,
        garlandBow: blockState('white_wool'),
        windowGlass: blockState('light_blue_stained_glass'),
        light: blockState('sea_lantern'),
        roofCover: snow,
        treeLeaves: garland,
        treeTrunk: trunk,
        treeTop: blockState('sea_lantern'),
        ornaments: [blockState('light_blue_wool'), blockState('white_wool'), blockState('blue_wool')],
        presents: [blockState('light_blue_wool'), blockState('white_wool'), blockState('blue_wool'), blockState('cyan_wool')],
        fairytaleRoof: blockState('packed_ice'),
      };
    case 'natural':
      return {
        primaryAccent: blockState('stripped_spruce_log', { axis: 'y' }),
        secondaryAccent: blockState('spruce_leaves'),
        garland,
        garlandBow: null,
        windowGlass: blockState('glass'),
        light: blockState('glowstone'),
        roofCover: snow,
        treeLeaves: garland,
        treeTrunk: trunk,
        treeTop: blockState('glowstone'),
        ornaments: [blockState('white_wool'), blockState('yellow_wool')],
        presents: [blockState('brown_wool'), blockState('white_wool'), blockState('red_wool')],
        fairytaleRoof: blockState('dark_oak_planks'),
      };
  }
}

export function roofMaterial(style: BuildStyle, materials: MaterialPalette, colors: ColorPalette): string {
  return style === 'fairytale' ? colors.fairytaleRoof : materials.roof;
}
