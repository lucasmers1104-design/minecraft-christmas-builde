package schemreader;

import com.sk89q.worldedit.cli.CLICommandSender;
import com.sk89q.worldedit.cli.CLIWorldEdit;
import com.sk89q.worldedit.cli.data.FileRegistries;
import com.sk89q.worldedit.extension.platform.Platform;
import org.apache.logging.log4j.Logger;

import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Starts the unmodified WorldEdit-CLI platform the same way {@code CLIWorldEdit.main} does.
 *
 * <p>Deviation 1: {@code CLIWorldEdit#onInitialized()} hard-codes the working directory to
 * {@code ./worldedit} relative to the process CWD (and would litter the repo when called from a
 * test runner). We therefore perform the exact same three assignments it makes (working dir,
 * command sender, platform) via reflection, using a fresh temporary directory.</p>
 *
 * <p>Deviation 2: since WorldEdit 7.4.0, {@code FileRegistries#loadDataFiles()} downloads the
 * registry data for the schematic's DataVersion from {@code services.enginehub.org} into
 * {@code <working dir>/cli-data/<DataVersion>_<CLI_DATA_VERSION>.json}, unless that file already
 * exists. {@link #seedRegistryData} puts the generated data file there first, so WorldEdit loads
 * it through its own code path and never touches the network.</p>
 *
 * <p>Everything after that ({@code onStarted()}: platform registration, command registration,
 * registry data loading, config, ConfigurationLoadEvent, PlatformReadyEvent) is upstream code
 * called as-is.</p>
 */
final class CliBootstrap {

    /** Where build.sh puts the generated files inside schem-reader.jar. */
    static final String DATA_RESOURCE_DIR = "schem-reader/cli-data/";

    private CliBootstrap() {
    }

    static void initialize(CLIWorldEdit app, Path workingDir) throws ReflectiveOperationException {
        Field logField = CLIWorldEdit.class.getDeclaredField("LOGGER");
        logField.setAccessible(true);
        Logger cliLogger = (Logger) logField.get(null);

        set(app, "workingDir", workingDir);
        set(app, "commandSender", new CLICommandSender(cliLogger));
        Class<?> platformClass = Class.forName("com.sk89q.worldedit.cli.CLIPlatform");
        Constructor<?> ctor = platformClass.getDeclaredConstructor(CLIWorldEdit.class);
        ctor.setAccessible(true);
        set(app, "platform", ctor.newInstance(app));
    }

    /** {@code FileRegistries.CLI_DATA_VERSION}: the data file format version WorldEdit-CLI requests. */
    static int cliDataFormat() throws ReflectiveOperationException {
        Field f = FileRegistries.class.getDeclaredField("CLI_DATA_VERSION");
        f.setAccessible(true);
        return f.getInt(null);
    }

    /** File name FileRegistries looks for (and would otherwise download) for a DataVersion. */
    static String dataFileName(int dataVersion) throws ReflectiveOperationException {
        return dataVersion + "_" + cliDataFormat() + ".json";
    }

    /**
     * Copies the bundled registry file for {@code dataVersion} to the location where
     * {@code FileRegistries#loadDataFiles()} looks for its cached download.
     *
     * @return false if this jar has no data for {@code dataVersion} (WorldEdit must then not be started)
     */
    static boolean seedRegistryData(Path workingDir, int dataVersion) throws ReflectiveOperationException, IOException {
        String name = dataFileName(dataVersion);
        try (InputStream in = CliBootstrap.class.getClassLoader().getResourceAsStream(DATA_RESOURCE_DIR + name)) {
            if (in == null) {
                return false;
            }
            Path dir = workingDir.resolve("cli-data");
            Files.createDirectories(dir);
            Files.copy(in, dir.resolve(name));
            return true;
        }
    }

    /** {@code CLIPlatform#setDataVersion} (public method on a package-private class). */
    static void setDataVersion(CLIWorldEdit app, int dataVersion) throws ReflectiveOperationException {
        Platform platform = app.getPlatform();
        Method m = platform.getClass().getDeclaredMethod("setDataVersion", int.class);
        m.setAccessible(true);
        m.invoke(platform, dataVersion);
    }

    static void stop(CLIWorldEdit app) {
        if (app.getPlatform() != null && app.getFileRegistries() != null) {
            app.onStopped();
        }
    }

    private static void set(CLIWorldEdit app, String name, Object value) throws ReflectiveOperationException {
        Field f = CLIWorldEdit.class.getDeclaredField(name);
        f.setAccessible(true);
        f.set(app, value);
    }
}
