# WorldEdit schematic reader harness

Opens a `.schem` with the **real EngineHub WorldEdit reader** (`worldedit-core`'s
`SpongeSchematicV3Reader`, running on the `worldedit-cli` standalone platform) and prints one JSON
object describing what WorldEdit actually loaded. Integration tests use it to prove that our
exported files open in WorldEdit, rather than only roundtripping through our own NBT code.

| profile | Minecraft Java | DataVersion | registry data in the jar |
|---|---|---|---|
| default | **1.21.11** | **4671** | `schem-reader/cli-data/4671_1.json` |
| secondary | 1.21.1 | 3955 | `schem-reader/cli-data/3955_1.json` |

One jar reads both profiles: WorldEdit-CLI is started for the DataVersion written in the file.
Both DataVersions agree in `misode/mcmeta` (`version.json` of the `1.21.11-summary` and
`1.21.1-summary` tags) and in PrismarineJS `minecraft-data` (`pc/common/protocolVersions.json`):
1.21.11 = 4671 (protocol 774), 1.21.1 = 3955 (protocol 767).

WorldEdit: **7.4.2**, commit `eb8e82c3d8843bed3f71e82ea974122415645178`. All pins are in
[`upstream.lock`](upstream.lock).

## Why WorldEdit 7.4.2

Read from the `CHANGELOG.txt`, `gradle/libs.versions.toml`, `worldedit-bukkit/adapters/` and
`build-logic` of each tag:

| tags | Minecraft 1.21.11 | Java |
|---|---|---|
| ≤ 7.3.17 | no (newest: 1.21.9/1.21.10) | 21 |
| 7.3.18 | added ("Added support for 1.21.11"): Bukkit `adapter-1.21.11`; Fabric, NeoForge, Sponge built against 1.21.11 | 21 |
| 7.3.19, 7.4.0, 7.4.1, **7.4.2** | same: every platform targets 1.21.11 | 21 |
| 7.4.3 – 7.4.6 | Bukkit `adapter-1.21.11` only. Fabric, NeoForge and Sponge moved to 26.1 / 26.2 / 26.3 | **25** (`primaryJavaRelease = "25"`; the sources use Java 22+ syntax such as `catch (IOException _)`) |

7.4.2 is the newest release in which every platform supports 1.21.11 and that runs on Java 21. 7.4.3
and later still ship the Bukkit adapter for 1.21.11, but `worldedit-core` is compiled for Java 25, so
a 1.21.11 Paper/Spigot server would need a Java 25 runtime (not tried). They also cannot be compiled
with JDK 21. Their reader path differs from 7.4.2 only by those syntax changes
plus a rewritten splitter for NBT and `|`/`;` extra data in `DefaultBlockParser`. Plain
`id[key=value]` palette keys go through the same code. `SpongeSchematicV3Reader` and `ReaderUtil`
are identical in 7.3.8 and 7.4.2.

## Build

Requirements: **JDK 21**, Maven 3.9, git (2.25 or newer), Python 3, and bash. Network: `github.com`
over git and Maven Central. Nothing from `maven.enginehub.org`, `repo.enginehub.org` or
`services.enginehub.org` is needed.

```sh
tests/worldedit/build.sh              # -> tests/worldedit/target/schem-reader.jar
tests/worldedit/build.sh --selftest   # also runs all fixtures (fixtures-src/selftest.py)
npm run worldedit:build               # same as the first line (runs "bash tests/worldedit/build.sh")
```

| env var | default | meaning |
|---|---|---|
| `WE_BUILD_CACHE` | `~/.cache/minecraft-christmas-builder/worldedit-build` | git checkouts, Maven local repo, build output (kept outside the repo, about 140 MB) |
| `WE_MODE` | `source` | `source`: compile EngineHub sources from GitHub. `enginehub`: use `maven.enginehub.org` binaries |
| `MVN` | `mvn` | Maven executable |
| `PYTHON` | `python3`, else `python` | Python 3 executable |

Timings measured in the Linux sandbox:

- **Cold build** with an empty cache, plus `--selftest`: about 90 s (86 s measured), with a cache of
  136 MB.
- **Re-run** with a warm cache: about 35 s for the build, plus about 20 s for the selftest
  (26 runs, 4 in parallel).

Every build is a clean Maven build, so stale classes from an older pin can never be packaged.

### Windows

`build.sh` is a bash script. Run it from **Git Bash** (Git for Windows) or from **WSL2**, with JDK
21, Maven and Python 3 on the `PATH`:

```sh
# Git Bash, in the repo root
export JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-21..."   # wherever your JDK 21 is
tests/worldedit/build.sh --selftest
```

Under Git Bash the script converts the paths it hands to `mvn`, `java` and `python` with `cygpath -m`.
It uses `python` when no working `python3` exists. The finished jar does not need bash:
`java -jar tests\worldedit\target\schem-reader.jar file.schem` works from `cmd` or PowerShell. So
does `python tests\worldedit\fixtures-src\selftest.py`. **Not tested on Windows** (no Windows
machine was available); the Linux build is verified.

### What `build.sh` does (source mode)

1. Fetches the pinned commits:
   - `EngineHub/WorldEdit` 7.4.2, `EngineHub/Piston` v0.5.11, `EngineHub/lin-bus` v0.2.0 and
     `EngineHub/jlibnoise`;
   - only the six data files the generator reads from three `misode/mcmeta` summary tags (a sparse,
     blob-less fetch of a few MB instead of about 400 MB);
   - only `3105.json` from WorldEdit 7.3.19.

   It checks each tag against `git ls-remote`, requires a clean, unmodified work tree, and verifies
   the git blob id of the reference `3105.json`.
2. Checks that the pinned `FileRegistries.java` still loads `cli-data/<DataVersion>_1.json`
   (`CLI_DATA_VERSION = 1`, the format the generator writes), validates the generator against
   EngineHub's `3105.json`, then generates `4671_1.json` and `3955_1.json`. See "Registry data" below.
3. Compiles the upstream sources with the Maven reactor in [`upstream/`](upstream). The poms
   replace the Gradle build scripts, and every module points its `sourceDirectory` at a checkout.
   It runs the same annotation processors (Piston command generator, AutoValue, AutoService), ANTLR
   grammar and kyori-text relocation (`net.kyori.text` -> `com.sk89q.worldedit.util.formatting.text`,
   `net.kyori.minecraft` -> `com.sk89q.worldedit.util.kyori`) as upstream. The results are installed
   into the cache's Maven repo with the real coordinates (`com.sk89q.worldedit:worldedit-core:7.4.2`, etc.).
4. Builds the shaded `target/schem-reader.jar` from [`pom.xml`](pom.xml) and [`src/`](src).

Changes compared with the earlier 7.3.8 reactor, all following the 7.4.2 Gradle build:

- lin-bus is no longer shaded into `worldedit-libs:core`. It is a plain `api` dependency of
  `worldedit-core`.
- Piston 0.5.10 -> 0.5.11. Its modules compile against Piston's own versions: guava 32.1.3-jre,
  AutoValue 1.11.0, log4j 2.19.0.
- WorldEdit's catalog versions: guava 33.5.0-jre, gson 2.13.2, log4j 2.24.1, fastutil 8.5.18,
  ANTLR 4.13.2.
- Java release stays 21.

### Deviations from an official WorldEdit binary (none on the reader path)

- **Build tool:** Maven instead of Gradle. Gradle cannot be downloaded in the CI sandbox, and
  EngineHub's repositories are blocked there.
  - The Gradle-only static analysis (errorprone, checkstyle, license headers) is not run. It does
    not change the bytecode.
  - Piston's processor module is compiled with javac annotation processing instead of kapt.
- **jchronic:** `com.sk89q:jchronic:0.2.4a` is only on EngineHub's repository, and its source is
  not public, so [`upstream/jchronic-stub`](upstream/jchronic-stub) replaces it. WorldEdit 7.4.2 only
  uses it in `LocalSession#detectDate`, for snapshot-restore date parsing. The stub throws if called.
- **`lang/i18n.zip`:** this is the Crowdin translations artifact (`worldedit-lang` 7.3.19/2062),
  only on `repo.enginehub.org`. Without it, `TranslationManager` fails while rendering any
  `InputParseException`. That failure would turn WorldEdit's "warn + air" path for bad palette
  entries into a crash. A zip with no translations is supplied instead. English, the default locale,
  always comes from `worldedit-core`'s own `lang/strings.json`.
- **Registry data:** WorldEdit 7.4 downloads it at runtime; the harness pre-seeds that download
  cache with generated files. See below.
- **CLI bootstrap:** `CLIWorldEdit#onInitialized()` creates `./worldedit` in the current directory.
  [`CliBootstrap`](src/main/java/schemreader/CliBootstrap.java) makes the same three field
  assignments via reflection, using a temporary directory. It then copies the registry file into
  that directory's `cli-data/`. Everything else follows `CLIWorldEdit.main` as-is:
  `ClipboardFormats.findByPath`, `getDataVersion`, `onStarted()`, and `format.getReader(..).read()`.
- **Logging:** log4j goes to stderr only, so stdout carries just the JSON.

In `WE_MODE=enginehub`, only the registry data and the bootstrap/logging changes apply.

### Registry data (important)

WorldEdit-CLI knows only the blocks, items, entities, biomes and tags of the DataVersion it was
started for, which is the schematic's DataVersion.

- **Up to 7.3.x:** it loaded `com/sk89q/worldedit/cli/data/<DataVersion>.json` from its own jar.
  Those files went only up to **3105 (MC 1.19)**.
- **Since 7.4.0** (commit `b37f00a4`, "Cleanup WorldEdit-CLI data version systems"): nothing is
  bundled. `FileRegistries#loadDataFiles` downloads
  `https://services.enginehub.org/cassette-deck/we-cli-data/<DataVersion>/1` into
  `<working dir>/cli-data/<DataVersion>_1.json`, and reuses that file when it exists.
  - **Verified:** in the sandbox the stock `CLIWorldEdit` main fails with "The provided file is not
    compatible with this version of WorldEdit-CLI", caused by the proxy's 403 for
    services.enginehub.org.
  - **Also verified:** with our `4671_1.json` placed in its `worldedit/cli-data/`, the same stock
    main loads a 1.21.11 schematic.

The harness copies the bundled file into the temporary working directory's `cli-data/` before
`onStarted()`, so WorldEdit loads it through its own code. When the jar has no file for a DataVersion,
the harness does not start WorldEdit at all and reports exit 2, so **it never downloads anything**.
This was verified by running it in a network namespace with no network.

[`registry/gen_cli_registry.py`](registry/gen_cli_registry.py) builds those files from the vanilla
data-generator output mirrored by `misode/mcmeta` (`1.21.11-summary`, `1.21.1-summary`).

- **Format:** the JSON format is unchanged in 7.4. The 7.4 `DataFile` record and EngineHub's
  cassette-deck `CliData` record use the same keys as the old bundled files.
- **Validation:** the build first regenerates the 1.19 file from `1.19-summary` and requires it to be
  **identical** to the `3105.json` that EngineHub shipped in worldedit-cli. The reference is taken
  from 7.3.19, the last release with bundled files and an ancestor of 7.4.2. It is the same blob,
  `4d1436e8`, in every release from 7.3.8 to 7.3.19.

**Not verified:** equality with EngineHub's *own* 4671/3955 cassette-deck files. The program that
produces them is not public (`EngineHub/cassette-deck` only stores uploads), and
services.enginehub.org is blocked here. On a machine that can reach it:

```sh
curl -o /tmp/4671.json https://services.enginehub.org/cassette-deck/we-cli-data/4671/1
python3 tests/worldedit/registry/gen_cli_registry.py <cache>/src/mcmeta-1.21.11-summary \
  --expect-data-version 4671 --compare /tmp/4671.json
```

The JSON fields `registrySource` and `registryFile` record which file was used.

### 1.21.1 -> 1.21.11 block differences (from the generated registries)

- **Unchanged:** every block the house generator uses has identical properties, values and
  default state in 3955 and 4671 (88 blocks):
  - spruce, oak and dark_oak planks, logs and stripped logs (`axis=x|y|z`, default `y`);
  - cobblestone, stone_bricks, smooth_stone, polished_andesite, deepslate_tiles, bricks,
    terracotta, glass, snow_block, packed_ice, glowstone, sea_lantern, gold_block;
  - wool, concrete, terracotta and stained_glass in all 16 colours;
  - spruce_leaves and oak_leaves: `distance` 1–7 (int), `persistent` and `waterlogged` (bool),
    default `distance=7,persistent=false,waterlogged=false`. The raw mcmeta data was checked as well.
- **Only differences for these blocks:** tag memberships, which do not affect schematics. Terracotta
  moved from `dead_bush_may_place_on` to `dry_vegetation_may_place_on`, and leaves joined
  `replaceable_by_mushrooms`.
- **Registry-wide:** 1.21.11 adds 107 blocks, among them pale oak, resin, copper chests, golems and
  bars, shelves, leaf_litter and dried_ghast. One block id disappeared: **`minecraft:chain` is now
  `minecraft:iron_chain`** (renamed in 1.21.9). A 4671 file must not contain `minecraft:chain`.
  `invalid_chain_renamed_dv4671.schem` covers this.

## Run

```sh
java -jar tests/worldedit/target/schem-reader.jar [--require-canonical] [--registry-data-version=N] file.schem
```

Exit code `0` means OK and all strict checks passed. `2` means WorldEdit could not read the file or
a strict check failed. `64` is a usage error and `1` an internal error. Stdout always holds exactly
one JSON object, on failure too, with `ok:false` and `errors`. Logs go to stderr.

- **Duration:** a single run takes about 1.4 s. With 4 runs in parallel, as in the selftest, it is
  3–5 s each.
- **Side effects:** the harness writes nothing to the current directory, and parallel runs are safe.
- **Registry override:** `--registry-data-version=N` starts WorldEdit with another available
  registry. For example, a 4671 file read with `=3955` fails, because WorldEdit warns "Schematic
  was made in a newer Minecraft version (4671 > 3955)".

```jsonc
{
  "ok": true,
  "reader": "EngineHub WorldEdit 7.4.2 (7.4.2@eb8e82c3…) worldedit-core + worldedit-cli platform",
  "format": "SPONGE_V3_SCHEMATIC",            // BuiltInClipboardFormat#getName(); aliases in formatAliases
  "registryDataVersion": 4671,                 // registry data the CLI platform actually loaded
  "schematicDataVersion": 4671,
  "dimensions": {"width": 3, "height": 2, "length": 4},
  "minimumPoint": [0, 0, 0], "origin": [0, 0, 0],
  "palette": ["minecraft:spruce_planks", "minecraft:red_wool", "minecraft:oak_log[axis=y]", "minecraft:air", "minecraft:glass"],
  "indices": [0, 0, 0, 0, 1, 0, …],           // index = x + W*(z + L*y), relative to minimumPoint
  "nonAirCount": 20,                            // excludes air, cave_air, void_air
  "warnings": [], "errors": [],
  // extras: formatAliases, registrySource, registryFile, worldEditVersion, rootTagName,
  //         blockEntityCount, rawPalette [{key,id,parsed,canonical}], nonCanonicalPaletteKeys
}
```

`palette` is built by iterating the clipboard WorldEdit returned and collecting
`BlockState#getAsString()` in first-occurrence order (x fastest, then z, then y). It is not an echo
of the file's palette.

### Strict checks (any failure gives exit 2)

1. Every WARN/ERROR log event from WorldEdit is captured into `warnings`, and any such event fails
   the run. Examples: `Invalid BlockState in palette … Block will be replaced with air`, newer
   DataVersion, unknown entity, unknown biome.
2. Each raw palette key is parsed again with WorldEdit's own block parser, using the same
   `ParserContext` as `ReaderUtil.decodePalette`. A parse error fails the run.
3. Nothing written may be lost. **When no actor is present, WorldEdit silently ignores a property
   name the block does not have. It logs at DEBUG level and returns the block's *default* state,
   dropping every other property too.** For example,
   `oak_stairs[facing=east,half=top,…,sparkly=true]` loads as `facing=north,half=bottom`. This is
   still true in 7.4.2. The harness fails if any written id, property or value is missing from
   WorldEdit's result.
4. Raw structure, read with lin-bus (WorldEdit's NBT library):
   - the number of VarInts must equal W·H·L. WorldEdit silently leaves missing cells as air and
     ignores extra ones;
   - every index must exist in the palette;
   - palette ids must be unique.
5. Every cell of the clipboard must equal the state its palette entry parses to.
6. `--require-canonical` also requires every palette key to equal WorldEdit's `getAsString()`
   exactly. Without the flag, mismatches are only listed in `nonCanonicalPaletteKeys`.

## What WorldEdit 7.4.2 requires from a v3 file

`SpongeSchematicV3Reader` and `ReaderUtil` are unchanged from 7.3.8. Everything below was
verified with the fixtures and probes, or read from those classes and `BuiltInClipboardFormat`:

- **Compression:** the file must be gzip-compressed. A raw NBT file is not recognised.
- **Root and detection:**
  - the root must be a TAG_Compound, and its **name is ignored**: `""` and `"Schematic"` both work;
  - the root must contain a compound **`Schematic`** with `Version` TAG_Int **3**;
  - the v2-style layout (fields directly in a root named `Schematic`) is not detected as v3.
- **Required tags and types:**
  - `DataVersion`: TAG_Int;
  - `Width`, `Height`, `Length`: TAG_Short, read unsigned. A TAG_Int there fails: "is a INT instead of SHORT";
  - `Blocks`: compound. The spec calls it optional, but WorldEdit requires it;
  - `Blocks.Palette`: compound of TAG_Int;
  - `Blocks.Data`: TAG_Byte_Array of VarInts.
- **Optional tags:**
  - `Offset`: default 0,0,0;
  - `Blocks.BlockEntities`: an empty list typed TAG_End is accepted;
  - `Metadata`;
  - `Biomes`;
  - `Entities`.
- **Palette ids:** they need not be contiguous; gaps are accepted.
- **Offset and Origin:**
  - WorldEdit sets clipboard `origin = Metadata.WorldEdit.Origin`, or 0,0,0 if absent;
  - `minimumPoint = Offset + origin`;
  - without WorldEdit metadata, `minimumPoint == Offset` and `origin == 0,0,0`. Paste puts the
    origin at the player, so block (0,0,0) lands at `player + Offset`.
- **Strings:** NBT strings must be Java *modified UTF-8*. Standard 4-byte UTF-8, for example an
  emoji in `Metadata.Name`, gives `UTFDataFormatException`, and WorldEdit does not recognise the
  file at all. Write supplementary characters as 3-byte-encoded surrogate pairs, and NUL as `C0 80`.
- **Block state strings:**
  - `getAsString()` writes properties **sorted alphabetically by name**, with lowercase values;
  - WorldEdit also accepts keys without the `minecraft:` namespace, keys with properties in another
    order, and keys with properties omitted (it fills in defaults). The harness reports these as
    non-canonical.
- **DataVersion:**
  - the CLI needs registry data for exactly the file's DataVersion. 3953 (1.21) fails here; 3955
    and 4671 work;
  - a file DataVersion newer than the loaded registry logs a WARN, which the harness treats as a
    failure. An older one only logs INFO;
  - the CLI platform has no DataFixer.

## Fixtures

[`fixtures-src/gen_fixtures.py`](fixtures-src/gen_fixtures.py) is a standalone gzip + big-endian NBT
writer, independent of the app. It writes the `.schem` fixtures and `expected.json`, which holds:

- the exit code;
- the expected WorldEdit palette and indices for the valid files;
- the registry DataVersion that must have been loaded;
- for some negatives, an `errorContains` text.

[`fixtures-src/selftest.py`](fixtures-src/selftest.py) runs the jar on all of them in parallel, each
in an empty working directory. It also checks that `reader` names the WorldEdit version from
`upstream.lock`.

| DataVersion | valid | invalid |
|---|---|---|
| 4671 (1.21.11) | `valid_basic_3x2x4_dv4671`, `valid_palette_145_multibyte_varint_dv4671`, `valid_app_blocks_155_dv4671` (every state of the generator's blocks, 155 palette entries), `valid_new_blocks_dv4671` (pale oak, resin, iron_chain) | `invalid_chain_renamed_dv4671`, `invalid_unknown_block_dv4671`, `invalid_unknown_property_resets_state_dv4671`, `valid_basic_3x2x4_dv4671 --registry-data-version=3955` |
| 3955 (1.21.1) | `valid_basic_3x2x4`, `valid_palette_145_multibyte_varint`, `valid_app_blocks_155`, `valid_offset_neg`, `valid_root_named_schematic`, `valid_block_entities_end_typed_empty_list`, `valid_noncanonical_keys`, `valid_metadata_emoji_mutf8` | `invalid_new_blocks_dv3955` (1.21.11-only blocks), `invalid_unknown_block`, `invalid_property_value`, `invalid_unknown_property`, `invalid_unknown_property_resets_state`, `invalid_data_too_short`, `invalid_missing_schematic_wrapper`, `invalid_metadata_emoji_plain_utf8`, `valid_noncanonical_keys --require-canonical` |
| 3953 (1.21) | | `invalid_data_version_1_21` (no registry data) |

```sh
python3 tests/worldedit/fixtures-src/gen_fixtures.py     # regenerate (deterministic)
python3 tests/worldedit/fixtures-src/selftest.py         # 26/26 expected
```

## Using it from Vitest

```ts
const r = spawnSync('java', ['-jar', 'tests/worldedit/target/schem-reader.jar', file], { encoding: 'utf8' });
const out = JSON.parse(r.stdout);            // present on success and on failure
expect(r.status, out.errors?.join('\n')).toBe(0);
expect(out.registryDataVersion).toBe(4671);  // or 3955 for the 1.21.1 profile
expect(out.reader).toMatch(/EngineHub WorldEdit 7\.4\.2 /);
```

## On a machine that can reach maven.enginehub.org

`WE_MODE=enginehub tests/worldedit/build.sh` skips compiling the EngineHub sources. Instead, the
harness pom's `enginehub` profile resolves `com.sk89q.worldedit:worldedit-cli:7.4.2`, including the
real jchronic and `i18n.zip`. It still generates and bundles the registry data and never lets the
CLI download it. **Not verified from the sandbox**, including whether `worldedit-cli` 7.4.2 is
published there. If it is not, use the default source mode, which needs only GitHub and Maven Central.
