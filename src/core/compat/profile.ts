/**
 * Compatibility profile = the exact target the generator, registry and exporter are pinned to.
 *
 * The DataVersion 3955 for Minecraft Java 1.21.1 is verified in tests against the
 * `minecraft-data` package (pc/common/protocolVersions.json). The WorldEdit version
 * documents what the reader harness in tests/worldedit was run against; it is not a
 * blanket compatibility claim (see docs/COMPATIBILITY.md).
 */
export interface CompatibilityProfile {
  id: string;
  edition: 'java';
  minecraftVersion: string;
  dataVersion: number;
  schematicFormat: 'sponge-v3';
  schematicVersion: 3;
  worldEditTarget: string;
}

export const JAVA_1_21_1: CompatibilityProfile = {
  id: 'java-1.21.1-sponge-v3',
  edition: 'java',
  minecraftVersion: '1.21.1',
  dataVersion: 3955,
  schematicFormat: 'sponge-v3',
  schematicVersion: 3,
  worldEditTarget: '7.3.x',
};

export const DEFAULT_PROFILE = JAVA_1_21_1;

const PROFILES: Record<string, CompatibilityProfile> = {
  [JAVA_1_21_1.minecraftVersion]: JAVA_1_21_1,
};

export function getProfileForVersion(minecraftVersion: string): CompatibilityProfile | undefined {
  return PROFILES[minecraftVersion];
}

export const SUPPORTED_MINECRAFT_VERSIONS = Object.keys(PROFILES);
