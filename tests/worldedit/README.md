# WorldEdit schematic reader harness

Opens a `.schem` with the **real EngineHub WorldEdit reader** (`worldedit-core`'s
`SpongeSchematicV3Reader`, running on the `worldedit-cli` standalone platform) and prints one JSON
object describing what WorldEdit actually loaded. Integration tests use it to prove that our
exported files open in WorldEdit, rather than only roundtripping through our own NBT code.

Target: Minecraft Java 1.21.1 (DataVersion 3955), WorldEdit 7.3.x (pinned: **7.3.8**,
commit `7d32b456e7c3237a70e19cca129e51b790c33b73`). All pins are in [`upstream.lock`](upstream.lock).

## Build

Requirements: JDK 21, Maven 3.9, git, python3. Network: `github.com` over git and Maven Central.

```sh
tests/worldedit/build.sh              # -> tests/worldedit/target/schem-reader.jar
tests/worldedit/build.sh --selftest   # also runs all fixtures (fixtures-src/selftest.py)
```

| env var | default | meaning |
|---|---|---|
| `WE_BUILD_CACHE` | `~/.cache/minecraft-christmas-builder/worldedit-build` | git checkouts, Maven local repo, build output (kept outside the repo) |
| `WE_MODE` | `source` | `source`: compile EngineHub sources from GitHub. `enginehub`: use `maven.enginehub.org` binaries |
| `MVN` | `mvn` | Maven executable |

A cold build takes about 1–2 minutes, mostly downloads. Re-runs reuse the cache (about 30 s).

### What `build.sh` does (source mode)

1. Fetches pinned commits of `EngineHub/WorldEdit`, `EngineHub/Piston`, `EngineHub/lin-bus`,
   `EngineHub/jlibnoise` and two `misode/mcmeta` tags. It checks each tag against `git ls-remote`
   and requires a clean, unmodified work tree.
2. Generates the WorldEdit-CLI registry file `3955.json` (see "Registry data" below).
3. Compiles the upstream sources with the Maven reactor in [`upstream/`](upstream). The poms
   replace the Gradle build scripts, and every module points its `sourceDirectory` at a checkout.
   It runs the same annotation processors (Piston command generator, AutoValue, AutoService), ANTLR
   grammar and kyori-text relocation (`net.kyori.text` -> `com.sk89q.worldedit.util.formatting.text`)
   as upstream. The results are installed into the cache's Maven repo with the real coordinates
   (`com.sk89q.worldedit:worldedit-core:7.3.8`, etc.).
4. Builds the shaded `target/schem-reader.jar` from [`pom.xml`](pom.xml) and [`src/`](src).

### Deviations from an official WorldEdit binary (none on the reader path)

- **Build tool:** Maven instead of Gradle. Gradle cannot be downloaded in the CI sandbox, and
  `maven.enginehub.org` is blocked there.
- **jchronic:** `com.sk89q:jchronic:0.2.4a` is only on `maven.enginehub.org`, and its source is not
  public, so [`upstream/jchronic-stub`](upstream/jchronic-stub) replaces it. WorldEdit only uses it
  in `LocalSession#detectDate`, for snapshot-restore date parsing. The stub throws if called.
- **`lang/i18n.zip`:** this is the Crowdin translations artifact, also only on `maven.enginehub.org`.
  Without it, `TranslationManager` throws an NPE while rendering any `InputParseException`. That
  NPE would turn WorldEdit's "warn + air" path for bad palette entries into a crash. A zip with no
  translations is supplied instead. English, the default locale, always comes from
  `worldedit-core`'s own `lang/strings.json`.
- **Registry data for 1.21.1:** see below.
- **CLI bootstrap:** `CLIWorldEdit#onInitialized()` creates `./worldedit` in the current directory.
  [`CliBootstrap`](src/main/java/schemreader/CliBootstrap.java) makes the same three field
  assignments via reflection, using a temporary directory. Everything else follows
  `CLIWorldEdit.main` as-is: `ClipboardFormats.findByFile`, `getDataVersion`, `onStarted()`, and
  `format.getReader(..).read()`.
- **Logging:** log4j goes to stderr only, so stdout carries just the JSON.

In `WE_MODE=enginehub`, only the registry file and the bootstrap/logging changes apply.

### Registry data (important)

WorldEdit-CLI loads **exactly** `com/sk89q/worldedit/cli/data/<schematic DataVersion>.json`.
Every 7.3.x tag (7.3.0–7.3.19) ships data files only up to **3105 (MC 1.19)**. The stock CLI
therefore cannot open any 1.21.1 schematic (verified: NPE, exit 1).
[`registry/gen_cli_registry.py`](registry/gen_cli_registry.py) builds `3955.json` in the same
format from the Minecraft 1.21.1 data-generator output mirrored by `misode/mcmeta`
(`1.21.1-summary`). The build first regenerates the 1.19 file from `1.19-summary` and requires it
to be **identical** to the `3105.json` that EngineHub ships. Only then does it emit `3955.json`.
The JSON field `registrySource` records this.

## Run

```sh
java -jar tests/worldedit/target/schem-reader.jar [--require-canonical] [--registry-data-version=N] file.schem
```

Exit code `0` means OK and all strict checks passed. `2` means WorldEdit could not read the file or
a strict check failed. `64` is a usage error and `1` an internal error. Stdout always holds exactly
one JSON object, on failure too, with `ok:false` and `errors`. Logs go to stderr. A run takes about
2.5 s, including for 48×32×48. The harness writes nothing to the current directory, and parallel
runs are safe.

```jsonc
{
  "ok": true,
  "reader": "EngineHub WorldEdit 7.3.8 (7.3.8@7d32b456…) worldedit-core + worldedit-cli platform",
  "format": "SPONGE_V3_SCHEMATIC",            // BuiltInClipboardFormat#getName(); aliases in formatAliases
  "registryDataVersion": 3955,                 // data file the CLI platform actually loaded
  "schematicDataVersion": 3955,
  "dimensions": {"width": 3, "height": 2, "length": 4},
  "minimumPoint": [0, 0, 0], "origin": [0, 0, 0],
  "palette": ["minecraft:spruce_planks", "minecraft:red_wool", "minecraft:oak_log[axis=y]", "minecraft:air", "minecraft:glass"],
  "indices": [0, 0, 0, 0, 1, 0, …],           // index = x + W*(z + L*y), relative to minimumPoint
  "nonAirCount": 20,                            // excludes air, cave_air, void_air
  "warnings": [], "errors": [],
  // extras: formatAliases, registrySource, worldEditVersion, rootTagName, blockEntityCount,
  //         rawPalette [{key,id,parsed,canonical}], nonCanonicalPaletteKeys
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
   `oak_stairs[facing=east,half=top,…,sparkly=true]` loads as `facing=north,half=bottom`. The
   harness fails if any written id, property or value is missing from WorldEdit's result.
4. Raw structure, read with lin-bus (WorldEdit's NBT library):
   - the number of VarInts must equal W·H·L. WorldEdit silently leaves missing cells as air and
     ignores extra ones;
   - every index must exist in the palette;
   - palette ids must be unique.
5. Every cell of the clipboard must equal the state its palette entry parses to.
6. `--require-canonical` also requires every palette key to equal WorldEdit's `getAsString()`
   exactly. Without the flag, mismatches are only listed in `nonCanonicalPaletteKeys`.

## What WorldEdit 7.3.8 requires from a v3 file

Verified with the fixtures and probes, or read from `SpongeSchematicV3Reader`, `ReaderUtil` and
`BuiltInClipboardFormat`:

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
  - `Blocks.BlockEntities`: optional since 7.3.7. An empty list typed TAG_End is accepted;
  - `Metadata`;
  - `Biomes`;
  - `Entities`.
- **Palette ids:** they need not be contiguous; gaps are accepted.
- **Offset and Origin:**
  - WorldEdit sets clipboard `origin = Metadata.WorldEdit.Origin`, or 0,0,0 if absent;
  - `minimumPoint = Offset + origin`;
  - without WorldEdit metadata, `minimumPoint == Offset` and `origin == 0,0,0`. Paste puts the
    origin at the player, so block (0,0,0) lands at `player + Offset`, as the spec describes. The
    paste step itself is not exercised here.
  - Example: with `Origin [10,64,10]` and `Offset [-1,0,-2]`, the harness reports
    `minimumPoint [9,64,8]` and `origin [10,64,10]`.
- **Strings:** NBT strings must be Java *modified UTF-8*. Standard 4-byte UTF-8, for example an
  emoji in `Metadata.Name`, gives `UTFDataFormatException`, and WorldEdit does not recognise the
  file at all. Write supplementary characters as 3-byte-encoded surrogate pairs, and NUL as `C0 80`.
- **Block state strings:**
  - `getAsString()` writes properties **sorted alphabetically by name**, with lowercase values;
  - WorldEdit also accepts keys without the `minecraft:` namespace, keys with properties in another
    order, and keys with properties omitted (it fills in defaults). The harness reports these as
    non-canonical.
- **DataVersion:**
  - the CLI needs a registry file for exactly the file's DataVersion. 3953 (1.21) fails here;
    3955 works;
  - a file DataVersion newer than the platform's registry logs a WARN, which the harness treats as
    a failure;
  - the CLI platform has no DataFixer.

## Fixtures

[`fixtures-src/gen_fixtures.py`](fixtures-src/gen_fixtures.py) is a standalone gzip + big-endian NBT
writer, independent of the app. It writes the `.schem` fixtures and `expected.json`, which holds the
exit code plus the expected WorldEdit palette and indices for the valid files.
[`fixtures-src/selftest.py`](fixtures-src/selftest.py) runs the jar on all of them in parallel, each
in an empty working directory.

```sh
python3 tests/worldedit/fixtures-src/gen_fixtures.py     # regenerate (deterministic)
python3 tests/worldedit/fixtures-src/selftest.py         # 16/16 expected
```

## Using it from Vitest

```ts
const r = spawnSync('java', ['-jar', 'tests/worldedit/target/schem-reader.jar', file], { encoding: 'utf8' });
const out = JSON.parse(r.stdout);            // present on success and on failure
expect(r.status, out.errors?.join('\n')).toBe(0);
expect(out.registryDataVersion).toBe(3955);
```

## On a machine that can reach maven.enginehub.org

`WE_MODE=enginehub tests/worldedit/build.sh` skips compiling the EngineHub sources. Instead, the
harness pom's `enginehub` profile resolves `com.sk89q.worldedit:worldedit-cli:7.3.8`, including the
real jchronic and `i18n.zip`. It still generates `3955.json`, which no released worldedit-cli
contains. **Not verified from the sandbox**, including whether `worldedit-cli` is published there.
If it is not, use the default source mode, which needs only GitHub and Maven Central.
