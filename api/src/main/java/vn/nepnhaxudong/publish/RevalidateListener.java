package vn.nepnhaxudong.publish;

import jakarta.annotation.PreDestroy;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Hands a {@link ContentChangedEvent} to the website after the transaction that made the change
 * has committed (an event of a rolled-back transaction is dropped by Spring). The call to the
 * website runs on its own worker thread, so the admin request does not wait for it.
 *
 * <p>The worker is one daemon thread with a queue of 100 events. It is made here and not by
 * {@code @Async}: that would need {@code @EnableAsync} for the whole application, and every other
 * future {@code @Async} method would share this pool. When the queue is full the event is dropped
 * with a warning; the request thread never waits.
 */
@Component
public class RevalidateListener {

  static final int QUEUE_SIZE = 100;

  private static final Logger LOG = LoggerFactory.getLogger(RevalidateListener.class);
  private static final long STOP_WAIT_SECONDS = 5;

  private final RevalidateClient client;
  private final ThreadPoolExecutor worker;

  @Autowired
  public RevalidateListener(RevalidateClient client) {
    this(client, QUEUE_SIZE);
  }

  RevalidateListener(RevalidateClient client, int queueSize) {
    this.client = client;
    this.worker =
        new ThreadPoolExecutor(
            1,
            1,
            0,
            TimeUnit.SECONDS,
            new ArrayBlockingQueue<>(queueSize),
            runnable -> {
              var thread = new Thread(runnable, "revalidate");
              thread.setDaemon(true);
              return thread;
            });
  }

  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  public void onContentChanged(ContentChangedEvent event) {
    if (!client.isEnabled()) {
      return;
    }
    try {
      worker.execute(() -> client.revalidate(event.tags()));
    } catch (RejectedExecutionException e) {
      LOG.warn("revalidate queue is full, the event is dropped: tags={}", event.tags());
    }
  }

  /** Lets the queued calls finish for a short time, then stops the worker. */
  @PreDestroy
  void stop() {
    worker.shutdown();
    try {
      if (!worker.awaitTermination(STOP_WAIT_SECONDS, TimeUnit.SECONDS)) {
        worker.shutdownNow();
      }
    } catch (InterruptedException e) {
      worker.shutdownNow();
      Thread.currentThread().interrupt();
    }
  }
}
