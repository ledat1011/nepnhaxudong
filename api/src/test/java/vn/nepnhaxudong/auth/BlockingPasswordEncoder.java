package vn.nepnhaxudong.auth;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.context.annotation.Primary;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Test password encoder that can hold every {@code matches} call until the test lets it go, to see
 * what the application does (for example which resources it holds) while a slow hash runs. The
 * hash itself is the real Argon2 hash. By default it does not block.
 */
@Primary
public class BlockingPasswordEncoder implements PasswordEncoder {

  private final PasswordEncoder real = Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
  private final AtomicInteger waiting = new AtomicInteger();
  private volatile CountDownLatch gate;

  /** From now on every {@code matches} call waits until {@link #open()} (or 20 seconds). */
  public void close() {
    waiting.set(0);
    gate = new CountDownLatch(1);
  }

  public void open() {
    CountDownLatch current = gate;
    if (current != null) {
      current.countDown();
    }
  }

  /** The number of {@code matches} calls that have started and wait at the gate. */
  public int waiting() {
    return waiting.get();
  }

  @Override
  public String encode(CharSequence rawPassword) {
    return real.encode(rawPassword);
  }

  @Override
  public boolean matches(CharSequence rawPassword, String encodedPassword) {
    CountDownLatch current = gate;
    if (current != null && current.getCount() > 0) {
      waiting.incrementAndGet();
      try {
        current.await(20, TimeUnit.SECONDS);
      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
      }
    }
    return real.matches(rawPassword, encodedPassword);
  }
}
