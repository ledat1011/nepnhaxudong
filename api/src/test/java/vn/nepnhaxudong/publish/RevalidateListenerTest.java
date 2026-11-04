package vn.nepnhaxudong.publish;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ch.qos.logback.classic.Level;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** The hand-over from the writing request to the single worker thread. */
class RevalidateListenerTest {

  private RevalidateClient client;
  private RevalidateListener listener;
  private LogCapture log;

  @BeforeEach
  void setUp() {
    client = mock(RevalidateClient.class);
    when(client.isEnabled()).thenReturn(true);
    listener = new RevalidateListener(client, 2);
    log = new LogCapture(RevalidateListener.class);
  }

  @AfterEach
  void tearDown() {
    log.close();
    listener.stop();
  }

  @Test
  void theCallRunsOnADaemonThreadThatIsNotTheCallingThread() throws InterruptedException {
    var worker = new AtomicReference<Thread>();
    var done = new CountDownLatch(1);
    doAnswer(
            invocation -> {
              worker.set(Thread.currentThread());
              done.countDown();
              return null;
            })
        .when(client)
        .revalidate(anySet());

    listener.onContentChanged(ContentChangedEvent.home());

    assertThat(done.await(5, TimeUnit.SECONDS)).isTrue();
    assertThat(worker.get()).isNotSameAs(Thread.currentThread());
    assertThat(worker.get().isDaemon()).isTrue();
  }

  @Test
  void whenTheQueueIsFullTheEventIsDroppedWithAWarningAndTheCallerIsNotBlocked()
      throws InterruptedException {
    var started = new CountDownLatch(1);
    var release = new CountDownLatch(1);
    doAnswer(
            invocation -> {
              started.countDown();
              release.await(10, TimeUnit.SECONDS);
              return null;
            })
        .when(client)
        .revalidate(anySet());

    listener.onContentChanged(event("one"));
    assertThat(started.await(5, TimeUnit.SECONDS)).isTrue();
    // The worker holds "one"; two events wait in the queue; the fourth does not fit.
    listener.onContentChanged(event("two"));
    listener.onContentChanged(event("three"));
    listener.onContentChanged(event("dropped"));
    release.countDown();

    verify(client, timeout(5000).times(3)).revalidate(anySet());
    verify(client, never()).revalidate(event("dropped").tags());
    assertThat(log.messages(Level.WARN)).hasSize(1);
    assertThat(log.messages(Level.WARN).get(0)).contains("queue is full").contains("story:dropped");
  }

  @Test
  void aDisabledClientGetsNoWork() {
    when(client.isEnabled()).thenReturn(false);

    listener.onContentChanged(ContentChangedEvent.home());
    // Stopping waits for every task that was handed over, so a late call cannot hide.
    listener.stop();

    verify(client, never()).revalidate(anySet());
  }

  private static ContentChangedEvent event(String slug) {
    return ContentChangedEvent.stories(Set.of(slug));
  }
}
