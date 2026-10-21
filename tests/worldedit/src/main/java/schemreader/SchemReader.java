package schemreader;

import java.io.PrintStream;

/**
 * Entry point. Deliberately free of WorldEdit/log4j references so that the log4j configuration
 * property is set before any logger is created.
 *
 * <pre>java -jar schem-reader.jar [--require-canonical] [--registry-data-version=N] file.schem</pre>
 *
 * Prints exactly one JSON object to stdout (all logging goes to stderr).
 * Exit codes: 0 = read OK and all strict checks passed, 2 = WorldEdit could not read the file
 * or a strict check failed, 64 = usage error, 1 = unexpected internal error.
 */
public final class SchemReader {

    private SchemReader() {
    }

    public static void main(String[] args) {
        System.setProperty("log4j2.configurationFile", "schem-reader-log4j2.xml");
        System.setProperty("log4j.shutdownHookEnabled", "false");
        PrintStream jsonOut = System.out;
        // Anything WorldEdit (or a library) prints to stdout must not corrupt the JSON.
        System.setOut(System.err);
        Harness.Outcome outcome = Harness.run(args);
        jsonOut.println(outcome.json());
        jsonOut.flush();
        System.err.flush();
        // CLIPlatform starts a non-daemon java.util.Timer, so exit explicitly.
        Runtime.getRuntime().halt(outcome.exitCode());
    }
}
