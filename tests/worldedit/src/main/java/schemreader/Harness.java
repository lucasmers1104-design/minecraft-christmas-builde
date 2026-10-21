package schemreader;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.sk89q.worldedit.WorldEdit;
import com.sk89q.worldedit.cli.CLIWorldEdit;
import com.sk89q.worldedit.extension.input.InputParseException;
import com.sk89q.worldedit.extension.input.ParserContext;
import com.sk89q.worldedit.extent.clipboard.Clipboard;
import com.sk89q.worldedit.extent.clipboard.io.BuiltInClipboardFormat;
import com.sk89q.worldedit.extent.clipboard.io.ClipboardFormat;
import com.sk89q.worldedit.extent.clipboard.io.ClipboardFormats;
import com.sk89q.worldedit.extent.clipboard.io.ClipboardReader;
import com.sk89q.worldedit.internal.util.VarIntIterator;
import com.sk89q.worldedit.math.BlockVector3;
import com.sk89q.worldedit.world.block.BlockState;
import org.enginehub.linbus.stream.LinBinaryIO;
import org.enginehub.linbus.tree.LinCompoundTag;
import org.enginehub.linbus.tree.LinIntTag;
import org.enginehub.linbus.tree.LinListTag;
import org.enginehub.linbus.tree.LinRootEntry;
import org.enginehub.linbus.tree.LinTag;
import org.enginehub.linbus.tree.LinTagType;

import java.io.DataInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.OptionalInt;
import java.util.Properties;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Stream;
import java.util.zip.GZIPInputStream;

/**
 * Reads one .schem with the unmodified WorldEdit reader on the WorldEdit-CLI platform and runs
 * strict cross-checks so that WorldEdit's "warn and substitute air" behaviour can never pass.
 */
final class Harness {

    record Outcome(String json, int exitCode) {
    }

    private static final int EXIT_OK = 0;
    private static final int EXIT_INTERNAL = 1;
    private static final int EXIT_INVALID = 2;
    private static final int EXIT_USAGE = 64;
    private static final int MAX_LISTED_MISMATCHES = 20;
    private static final Set<String> AIR_IDS = Set.of("minecraft:air", "minecraft:cave_air", "minecraft:void_air");

    private static final Gson GSON = new GsonBuilder().disableHtmlEscaping().serializeNulls().create();

    private final Map<String, Object> out = new LinkedHashMap<>();
    private final List<String> errors = new ArrayList<>();
    private final Properties build = loadBuildInfo();

    private Harness() {
        out.put("ok", false);
        out.put("reader", readerDescription());
        out.put("format", null);
        out.put("registryDataVersion", null);
        out.put("schematicDataVersion", null);
        out.put("dimensions", null);
        out.put("minimumPoint", null);
        out.put("origin", null);
        out.put("palette", null);
        out.put("indices", null);
        out.put("nonAirCount", null);
        out.put("warnings", List.of());
        out.put("errors", errors);
    }

    static Outcome run(String[] args) {
        Harness h = new Harness();
        int code;
        try {
            code = h.execute(args);
        } catch (Throwable t) {
            h.errors.add("internal error: " + describe(t));
            t.printStackTrace(System.err);
            code = EXIT_INTERNAL;
        }
        if (code == EXIT_OK && !h.errors.isEmpty()) {
            code = EXIT_INVALID;
        }
        h.out.put("ok", code == EXIT_OK);
        return new Outcome(GSON.toJson(h.out), code);
    }

    // ------------------------------------------------------------------------------------------

    private int execute(String[] args) throws Exception {
        boolean requireCanonical = false;
        Integer registryOverride = null;
        Path file = null;
        for (String arg : args) {
            if (arg.equals("--require-canonical")) {
                requireCanonical = true;
            } else if (arg.startsWith("--registry-data-version=")) {
                registryOverride = Integer.parseInt(arg.substring("--registry-data-version=".length()));
            } else if (arg.startsWith("--")) {
                errors.add("unknown option " + arg);
                return EXIT_USAGE;
            } else if (file == null) {
                file = Path.of(arg);
            } else {
                errors.add("only one file may be given");
                return EXIT_USAGE;
            }
        }
        if (file == null) {
            errors.add("usage: java -jar schem-reader.jar [--require-canonical] [--registry-data-version=N] <file.schem>");
            return EXIT_USAGE;
        }
        if (!Files.isRegularFile(file)) {
            errors.add("not a file: " + file);
            return EXIT_USAGE;
        }

        LogCapture capture = LogCapture.install();
        Path workDir = Files.createTempDirectory("schem-reader-worldedit-");
        CLIWorldEdit app = new CLIWorldEdit();
        try {
            int code = readWithWorldEdit(app, workDir, file, registryOverride, requireCanonical, capture);
            List<String> warnings = capture.snapshot();
            out.put("warnings", warnings);
            if (!warnings.isEmpty()) {
                errors.add("WorldEdit logged " + warnings.size() + " WARN/ERROR message(s) (see warnings); strict mode treats this as failure");
            }
            return code;
        } finally {
            try {
                CliBootstrap.stop(app);
            } catch (Throwable t) {
                System.err.println("[schem-reader] ignoring error during WorldEdit shutdown: " + describe(t));
            }
            out.put("warnings", capture.snapshot());
            deleteRecursively(workDir);
        }
    }

    private int readWithWorldEdit(CLIWorldEdit app, Path workDir, Path file, Integer registryOverride,
                                  boolean requireCanonical, LogCapture capture) throws Exception {
        // 1. Platform bootstrap, mirroring CLIWorldEdit#main (see CliBootstrap for details).
        CliBootstrap.initialize(app, workDir);

        // 2. Format detection exactly like CLIWorldEdit#main.
        ClipboardFormat format = ClipboardFormats.findByFile(file.toFile());
        if (format == null) {
            errors.add("WorldEdit ClipboardFormats.findByFile() did not recognise the file as any clipboard format");
            return EXIT_INVALID;
        }
        out.put("format", format.getName());
        out.put("formatAliases", new ArrayList<>(format.getAliases()));
        if (format != BuiltInClipboardFormat.SPONGE_V3_SCHEMATIC) {
            errors.add("expected format SPONGE_V3_SCHEMATIC but WorldEdit detected " + format.getName());
        }

        // 3. Data version, exactly like CLIWorldEdit#main.
        OptionalInt fileDataVersion;
        try (ClipboardReader dataVersionReader = format.getReader(Files.newInputStream(file))) {
            fileDataVersion = dataVersionReader.getDataVersion();
        } catch (Exception e) {
            // e.g. NoSuchElementException when the required DataVersion tag is missing
            errors.add("WorldEdit could not read the DataVersion: " + describe(e));
            return EXIT_INVALID;
        }
        out.put("schematicDataVersion", fileDataVersion.isPresent() ? fileDataVersion.getAsInt() : null);
        int registryDataVersion;
        if (registryOverride != null) {
            registryDataVersion = registryOverride;
        } else if (fileDataVersion.isPresent()) {
            registryDataVersion = fileDataVersion.getAsInt();
        } else {
            errors.add("Failed to obtain data version from schematic (CLIWorldEdit would abort here)");
            return EXIT_INVALID;
        }

        // 4. Start the platform: loads com/sk89q/worldedit/cli/data/<registryDataVersion>.json.
        String dataFile = "com/sk89q/worldedit/cli/data/" + registryDataVersion + ".json";
        if (Harness.class.getClassLoader().getResource(dataFile) == null) {
            errors.add("WorldEdit-CLI has no registry data for DataVersion " + registryDataVersion
                + " (it loads exactly " + dataFile + " for the schematic's DataVersion); available: "
                + availableRegistryVersions());
            return EXIT_INVALID;
        }
        CliBootstrap.setDataVersion(app, registryDataVersion);
        try {
            app.onStarted();
        } catch (RuntimeException e) {
            errors.add("WorldEdit-CLI could not load registry data for DataVersion " + registryDataVersion
                + " (" + describe(e) + "); available: " + availableRegistryVersions());
            return EXIT_INVALID;
        }
        int loaded = app.getPlatform().getDataVersion();
        out.put("registryDataVersion", loaded);
        out.put("registrySource", registrySource(loaded));
        out.put("worldEditVersion", WorldEdit.getVersion());

        // 5. The actual read, with the unmodified upstream reader.
        Clipboard clipboard;
        capture.mark("read");
        try (ClipboardReader reader = format.getReader(Files.newInputStream(file))) {
            clipboard = reader.read();
        } catch (Exception e) {
            errors.add("WorldEdit failed to read the schematic: " + describe(e));
            e.printStackTrace(System.err);
            return EXIT_INVALID;
        }
        capture.mark("read done");

        describeClipboard(clipboard);
        strictChecks(file, clipboard, requireCanonical);
        return errors.isEmpty() ? EXIT_OK : EXIT_INVALID;
    }

    /** Builds palette/indices from what the clipboard actually contains. */
    private void describeClipboard(Clipboard clipboard) {
        BlockVector3 dim = clipboard.getDimensions();
        BlockVector3 min = clipboard.getMinimumPoint();
        BlockVector3 origin = clipboard.getOrigin();
        int w = dim.x();
        int h = dim.y();
        int l = dim.z();
        Map<String, Object> dims = new LinkedHashMap<>();
        dims.put("width", w);
        dims.put("height", h);
        dims.put("length", l);
        out.put("dimensions", dims);
        out.put("minimumPoint", new int[] {min.x(), min.y(), min.z()});
        out.put("origin", new int[] {origin.x(), origin.y(), origin.z()});

        Map<String, Integer> palette = new LinkedHashMap<>();
        int[] indices = new int[w * h * l];
        int nonAir = 0;
        for (int y = 0; y < h; y++) {
            for (int z = 0; z < l; z++) {
                for (int x = 0; x < w; x++) {
                    BlockState state = clipboard.getBlock(min.add(x, y, z));
                    String s = state.getAsString();
                    Integer id = palette.computeIfAbsent(s, k -> palette.size());
                    indices[x + w * (z + l * y)] = id;
                    if (!AIR_IDS.contains(state.getBlockType().id())) {
                        nonAir++;
                    }
                }
            }
        }
        out.put("palette", new ArrayList<>(palette.keySet()));
        out.put("indices", indices);
        out.put("nonAirCount", nonAir);
    }

    /**
     * Independent checks on the raw file (parsed with lin-bus, WorldEdit's own NBT library) that
     * WorldEdit itself does not enforce, plus a full cell-by-cell comparison with the clipboard.
     */
    private void strictChecks(Path file, Clipboard clipboard, boolean requireCanonical) throws IOException {
        LinRootEntry root;
        try (InputStream in = new GZIPInputStream(Files.newInputStream(file))) {
            root = LinBinaryIO.readUsing(new DataInputStream(in), LinRootEntry::readFrom);
        }
        out.put("rootTagName", root.name());
        LinCompoundTag schematic = root.value().getTag("Schematic", LinTagType.compoundTag());
        int w = schematic.getTag("Width", LinTagType.shortTag()).valueAsShort() & 0xFFFF;
        int h = schematic.getTag("Height", LinTagType.shortTag()).valueAsShort() & 0xFFFF;
        int l = schematic.getTag("Length", LinTagType.shortTag()).valueAsShort() & 0xFFFF;
        BlockVector3 dim = clipboard.getDimensions();
        if (dim.x() != w || dim.y() != h || dim.z() != l) {
            errors.add("clipboard dimensions " + dim + " differ from Width/Height/Length " + w + "/" + h + "/" + l);
            return;
        }
        LinCompoundTag blocks = schematic.getTag("Blocks", LinTagType.compoundTag());
        LinListTag<LinCompoundTag> blockEntities = blocks.findListTag("BlockEntities", LinTagType.compoundTag());
        out.put("blockEntityCount", blockEntities == null ? 0 : blockEntities.value().size());

        // Palette: raw key -> id, and WorldEdit's own parse of every raw key.
        ParserContext ctx = new ParserContext(); // identical to ReaderUtil#decodePalette
        ctx.setRestricted(false);
        ctx.setTryLegacy(false);
        ctx.setPreferringWildcard(false);
        Map<Integer, String> keyById = new HashMap<>();
        Map<Integer, BlockState> stateById = new HashMap<>();
        List<Map<String, Object>> rawPalette = new ArrayList<>();
        List<String> nonCanonical = new ArrayList<>();
        Map<String, LinTag<?>> paletteTags = new TreeMap<>(blocks.getTag("Palette", LinTagType.compoundTag()).value());
        for (Map.Entry<String, LinTag<?>> entry : paletteTags.entrySet()) {
            String key = entry.getKey();
            if (!(entry.getValue() instanceof LinIntTag idTag)) {
                errors.add("palette entry '" + key + "' is not a TAG_Int");
                continue;
            }
            int id = idTag.valueAsInt();
            String previous = keyById.put(id, key);
            if (previous != null) {
                errors.add("palette id " + id + " is used by both '" + previous + "' and '" + key + "'");
            }
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("key", key);
            row.put("id", id);
            try {
                BlockState parsed = WorldEdit.getInstance().getBlockFactory().parseFromInput(key, ctx).toImmutableState();
                stateById.put(id, parsed);
                row.put("parsed", parsed.getAsString());
                boolean canonical = parsed.getAsString().equals(key);
                row.put("canonical", canonical);
                if (!canonical) {
                    nonCanonical.add(key + " -> " + parsed.getAsString());
                    String lost = lostInformation(key, parsed.getAsString());
                    if (lost != null) {
                        errors.add("WorldEdit did not keep palette entry '" + key + "' as written (parsed as '"
                            + parsed.getAsString() + "'): " + lost);
                    }
                }
            } catch (InputParseException e) {
                row.put("parsed", null);
                errors.add("WorldEdit's block parser rejects palette entry '" + key + "': " + describe(e));
            }
            rawPalette.add(row);
        }
        rawPalette.sort(Comparator.comparingInt(r -> (Integer) r.get("id")));
        out.put("rawPalette", rawPalette);
        out.put("nonCanonicalPaletteKeys", nonCanonical);
        if (requireCanonical && !nonCanonical.isEmpty()) {
            errors.add("palette keys are not in WorldEdit's canonical form (--require-canonical): " + nonCanonical);
        }

        // Block data: VarInt count and ids (WorldEdit silently leaves missing cells as air).
        byte[] data = blocks.getTag("Data", LinTagType.byteArrayTag()).value();
        int expected = w * h * l;
        int count = 0;
        int mismatches = 0;
        BlockVector3 min = clipboard.getMinimumPoint();
        try {
            for (VarIntIterator it = new VarIntIterator(data); it.hasNext(); count++) {
                int id = it.nextInt();
                if (count >= expected) {
                    continue;
                }
                if (!keyById.containsKey(id)) {
                    errors.add("Data[" + count + "] references palette id " + id + " which is not in the palette");
                    return;
                }
                BlockState want = stateById.get(id);
                if (want == null) {
                    continue; // already reported as unparseable
                }
                int y = count / (w * l);
                int rem = count - y * w * l;
                int z = rem / w;
                int x = rem - z * w;
                BlockState got = clipboard.getBlock(min.add(x, y, z));
                if (!got.equals(want)) {
                    if (++mismatches <= MAX_LISTED_MISMATCHES) {
                        errors.add("cell (" + x + "," + y + "," + z + "): palette says '" + keyById.get(id)
                            + "' but the WorldEdit clipboard contains '" + got.getAsString() + "'");
                    }
                }
            }
        } catch (IllegalStateException e) {
            errors.add("malformed VarInt block data: " + e.getMessage());
            return;
        }
        if (mismatches > MAX_LISTED_MISMATCHES) {
            errors.add("... " + (mismatches - MAX_LISTED_MISMATCHES) + " more cell mismatches");
        }
        if (count != expected) {
            errors.add("Data holds " + count + " VarInts but Width*Height*Length = " + expected);
        }
    }

    /**
     * WorldEdit's DefaultBlockParser, when no actor is present (i.e. reading files), does not fail
     * on a property name the block does not have: it logs at DEBUG and returns the block's
     * <em>default</em> state, silently dropping every property of that entry. Detect any written
     * id/property/value that is not present verbatim in WorldEdit's result. Properties that are
     * merely omitted (filled with defaults), reordered, or a missing "minecraft:" namespace are
     * reported as non-canonical only.
     *
     * @return a description of what was lost, or null if nothing written was lost
     */
    static String lostInformation(String raw, String parsed) {
        Map<String, String> rawProps = new LinkedHashMap<>();
        String rawId = splitState(raw, rawProps);
        Map<String, String> parsedProps = new LinkedHashMap<>();
        String parsedId = splitState(parsed, parsedProps);
        if (rawId == null) {
            return "palette key is not of the form namespace:id[key=value,...]";
        }
        if (!rawId.contains(":")) {
            rawId = "minecraft:" + rawId;
        }
        if (!rawId.equals(parsedId)) {
            return "block id '" + rawId + "' became '" + parsedId + "'";
        }
        List<String> problems = new ArrayList<>();
        for (Map.Entry<String, String> e : rawProps.entrySet()) {
            String got = parsedProps.get(e.getKey());
            if (got == null) {
                problems.add("property '" + e.getKey() + "' does not exist on " + parsedId
                    + " (WorldEdit then falls back to the default state)");
            } else if (!got.equals(e.getValue())) {
                problems.add(e.getKey() + "=" + e.getValue() + " became " + e.getKey() + "=" + got);
            }
        }
        return problems.isEmpty() ? null : String.join("; ", problems);
    }

    /** Splits "id[k=v,...]" into id and properties; returns null on malformed syntax. */
    private static String splitState(String state, Map<String, String> props) {
        int open = state.indexOf('[');
        if (open < 0) {
            return state.isEmpty() || state.contains("]") || state.contains("{") ? null : state;
        }
        if (!state.endsWith("]") || state.indexOf(']') != state.length() - 1) {
            return null;
        }
        String body = state.substring(open + 1, state.length() - 1);
        if (!body.isEmpty()) {
            for (String part : body.split(",", -1)) {
                String[] kv = part.split("=", -1);
                if (kv.length != 2 || kv[0].isEmpty() || props.put(kv[0], kv[1]) != null) {
                    return null;
                }
            }
        }
        return state.substring(0, open);
    }

    // ------------------------------------------------------------------------------------------

    private String readerDescription() {
        return "EngineHub WorldEdit " + build.getProperty("we.version", "?")
            + " (" + build.getProperty("we.tag", "?") + "@" + build.getProperty("we.commit", "?") + ")"
            + " worldedit-core + worldedit-cli platform";
    }

    private String registrySource(int dataVersion) {
        String generated = build.getProperty("registry.generated." + dataVersion);
        if (generated != null) {
            return generated;
        }
        return "com/sk89q/worldedit/cli/data/" + dataVersion + ".json bundled with worldedit-cli "
            + build.getProperty("we.tag", "?");
    }

    private static String availableRegistryVersions() {
        List<Integer> found = new ArrayList<>();
        for (int v = 1000; v < 10000; v++) {
            if (Harness.class.getClassLoader().getResource("com/sk89q/worldedit/cli/data/" + v + ".json") != null) {
                found.add(v);
            }
        }
        return found.toString();
    }

    private static Properties loadBuildInfo() {
        Properties p = new Properties();
        try (InputStream in = Harness.class.getClassLoader().getResourceAsStream("schem-reader-build.properties")) {
            if (in != null) {
                p.load(in);
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return p;
    }

    private static String describe(Throwable t) {
        StringBuilder sb = new StringBuilder();
        for (Throwable c = t; c != null; c = c.getCause()) {
            if (sb.length() > 0) {
                sb.append(" <- ");
            }
            sb.append(c.getClass().getSimpleName());
            if (c.getMessage() != null) {
                sb.append(": ").append(c.getMessage());
            }
            if (c.getCause() == c) {
                break;
            }
        }
        return sb.toString();
    }

    private static void deleteRecursively(Path dir) {
        try (Stream<Path> paths = Files.walk(dir)) {
            paths.sorted(Comparator.reverseOrder()).forEach(p -> {
                try {
                    Files.deleteIfExists(p);
                } catch (IOException ignored) {
                    // best effort
                }
            });
        } catch (IOException ignored) {
            // best effort
        }
    }
}
