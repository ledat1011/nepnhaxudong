package vn.nepnhaxudong.publish;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.util.List;
import org.slf4j.LoggerFactory;

/** Collects what one class logs, so a test can look at the messages. */
final class LogCapture implements AutoCloseable {

  private final Logger logger;
  private final ListAppender<ILoggingEvent> appender = new ListAppender<>();

  LogCapture(Class<?> source) {
    this.logger = (Logger) LoggerFactory.getLogger(source);
    appender.start();
    logger.addAppender(appender);
    // The warnings of a failure test are expected; they stay out of the build output.
    logger.setAdditive(false);
  }

  /** The formatted messages of the given level, oldest first. */
  List<String> messages(Level level) {
    return List.copyOf(appender.list).stream()
        .filter(event -> event.getLevel() == level)
        .map(ILoggingEvent::getFormattedMessage)
        .toList();
  }

  /** Every formatted message of every level, with the exception text when there is one. */
  String everything() {
    return List.copyOf(appender.list).stream()
        .map(
            event ->
                event.getFormattedMessage()
                    + (event.getThrowableProxy() == null
                        ? ""
                        : " " + event.getThrowableProxy().getMessage()))
        .reduce("", (left, right) -> left + "\n" + right);
  }

  @Override
  public void close() {
    logger.detachAppender(appender);
    logger.setAdditive(true);
    appender.stop();
  }
}
