package vn.nepnhaxudong.media;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.concurrent.CountDownLatch;

/** A stream that waits inside its first read, so a test can keep a processing permit busy. */
final class BlockingStream extends InputStream {

  private final ByteArrayInputStream data;
  private final CountDownLatch started;
  private final CountDownLatch release;
  private boolean waited;

  BlockingStream(byte[] bytes, CountDownLatch started, CountDownLatch release) {
    this.data = new ByteArrayInputStream(bytes);
    this.started = started;
    this.release = release;
  }

  @Override
  public int read() throws IOException {
    byte[] one = new byte[1];
    return read(one, 0, 1) < 0 ? -1 : one[0] & 0xFF;
  }

  @Override
  public int read(byte[] buffer, int offset, int length) throws IOException {
    if (!waited) {
      waited = true;
      started.countDown();
      try {
        release.await();
      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
        throw new IOException(e);
      }
    }
    return data.read(buffer, offset, length);
  }
}
