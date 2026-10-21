package schemreader;

import com.sk89q.worldedit.cli.CLICommandSender;
import com.sk89q.worldedit.cli.CLIWorldEdit;
import com.sk89q.worldedit.extension.platform.Platform;
import org.apache.logging.log4j.Logger;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.nio.file.Path;

/**
 * Starts the unmodified WorldEdit-CLI platform the same way {@code CLIWorldEdit.main} does.
 *
 * <p>The only deviation: {@code CLIWorldEdit#onInitialized()} hard-codes the working directory
 * to {@code ./worldedit} relative to the process CWD (and would litter the repo when called from
 * a test runner). We therefore perform the exact same three assignments it makes (working dir,
 * command sender, platform) via reflection, using a fresh temporary directory. Everything after
 * that ({@code onStarted()}: platform registration, command registration, registry data loading,
 * mappings, config, PlatformReadyEvent) is upstream code called as-is.</p>
 */
final class CliBootstrap {

    private CliBootstrap() {
    }

    static void initialize(CLIWorldEdit app, Path workingDir) throws ReflectiveOperationException {
        Field logField = CLIWorldEdit.class.getDeclaredField("LOGGER");
        logField.setAccessible(true);
        Logger cliLogger = (Logger) logField.get(null);

        set(app, "workingDir", workingDir);
        set(app, "commandSender", new CLICommandSender(app, cliLogger));
        Class<?> platformClass = Class.forName("com.sk89q.worldedit.cli.CLIPlatform");
        Constructor<?> ctor = platformClass.getDeclaredConstructor(CLIWorldEdit.class);
        ctor.setAccessible(true);
        set(app, "platform", ctor.newInstance(app));
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
