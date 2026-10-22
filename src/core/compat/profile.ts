/**
 * Compatibility profile = the exact target the generator, registry and exporter are pinned to.
 *
 * DataVersions are verified in tests against the `minecraft-data` package
 * (pc/common/protocolVersions.json). The WorldEdit version documents what the reader harness
 * in tests/worldedit was run against; it is not a blanket compatibility claim
 * (see docs/COMPATIBILITY.md).
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

export const JAVA_1_21_11: CompatibilityProfile = {
  id: 'java-1.21.11-sponge-v3',
  edition: 'java',
  minecraftVersion: '1.21.11',
  dataVersion: 4671,
  schematicFormat: 'sponge-v3',
  schematicVersion: 3,
  worldEditTarget: '7.3.x / 7.4.x mit 1.21.11-Unterstützung',
};

export const JAVA_1_21_1: CompatibilityProfile = {
  id: 'java-1.21.1-sponge-v3',
  edition: 'java',
  minecraftVersion: '1.21.1',
  dataVersion: 3955,
  schematicFormat: 'sponge-v3',
  schematicVersion: 3,
  worldEditTarget: '7.3.x',
};

/** The user's server runs 1.21.11, so that is the default. */
export const DEFAULT_PROFILE = JAVA_1_21_11;

export const PROFILES: readonly CompatibilityProfile[] = [JAVA_1_21_11, JAVA_1_21_1];

const BY_VERSION = new Map(PROFILES.map((p) => [p.minecraftVersion, p]));

export function getProfileForVersion(minecraftVersion: string): CompatibilityProfile | undefined {
  return BY_VERSION.get(minecraftVersion);
}

export function requireProfile(minecraftVersion: string): CompatibilityProfile {
  const profile = BY_VERSION.get(minecraftVersion);
  if (!profile) throw new Error(`Kein Kompatibilitätsprofil für Minecraft ${minecraftVersion}`);
  return profile;
}

export const SUPPORTED_MINECRAFT_VERSIONS = PROFILES.map((p) => p.minecraftVersion);
