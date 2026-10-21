package schemreader;

import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.core.LogEvent;
import org.apache.logging.log4j.core.LoggerContext;
import org.apache.logging.log4j.core.appender.AbstractAppender;
import org.apache.logging.log4j.core.config.Configuration;
import org.apache.logging.log4j.core.config.Property;

import java.util.ArrayList;
import java.util.List;

/**
 * Collects every WARN/ERROR/FATAL event logged by any logger (WorldEdit reports unknown blocks,
 * invalid properties, newer data versions, unknown entities/biomes this way and then carries on).
 */
final class LogCapture extends AbstractAppender {

    private final List<String> events = new ArrayList<>();
    private volatile String phase = "bootstrap";

    private LogCapture() {
        super("SchemReaderCapture", null, null, true, Property.EMPTY_ARRAY);
    }

    static LogCapture install() {
        LoggerContext ctx = (LoggerContext) LogManager.getContext(false);
        Configuration config = ctx.getConfiguration();
        LogCapture capture = new LogCapture();
        capture.start();
        config.addAppender(capture);
        config.getRootLogger().addAppender(capture, Level.WARN, null);
        ctx.updateLoggers();
        return capture;
    }

    void mark(String newPhase) {
        this.phase = newPhase;
    }

    @Override
    public void append(LogEvent event) {
        if (!event.getLevel().isMoreSpecificThan(Level.WARN)) {
            return;
        }
        StringBuilder sb = new StringBuilder();
        sb.append(event.getLevel()).append(" [").append(phase).append("] ")
            .append(event.getLoggerName()).append(": ")
            .append(event.getMessage().getFormattedMessage());
        Throwable thrown = event.getThrown();
        if (thrown != null) {
            sb.append(" (").append(thrown).append(')');
        }
        synchronized (events) {
            events.add(sb.toString());
        }
    }

    List<String> snapshot() {
        synchronized (events) {
            return new ArrayList<>(events);
        }
    }
}
