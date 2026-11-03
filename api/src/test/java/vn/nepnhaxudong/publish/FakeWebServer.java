package vn.nepnhaxudong.publish;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * A fake Next.js: it records every request and answers with the statuses it was told to. The
 * statuses of {@link #respondWith} are used one by one; when they are used up the default status
 * answers (200 unless {@link #alwaysRespondWith} changed it).
 */
final class FakeWebServer implements AutoCloseable {

  /** A status that makes the server hold the request without an answer, until it is closed. */
  static final int HANG = -1;

  private static final JsonMapper JSON = JsonMapper.builder().build();

  private final HttpServer server;
  private final BlockingQueue<ReceivedRequest> received = new LinkedBlockingQueue<>();
  private final Deque<Integer> script = new ConcurrentLinkedDeque<>();
  private final CountDownLatch closed = new CountDownLatch(1);
  private volatile int defaultStatus = 200;

  private FakeWebServer(HttpServer server) {
    this.server = server;
  }

  static FakeWebServer start() {
    try {
      HttpServer server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
      var fake = new FakeWebServer(server);
      server.createContext("/", fake::handle);
      server.setExecutor(Executors.newCachedThreadPool(runnable -> {
        var thread = new Thread(runnable, "fake-web");
        thread.setDaemon(true);
        return thread;
      }));
      server.start();
      return fake;
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  String baseUrl() {
    return "http://localhost:" + server.getAddress().getPort();
  }

  /** The next answers, one per request. */
  void respondWith(int... statuses) {
    script.clear();
    for (int status : statuses) {
      script.add(status);
    }
  }

  void alwaysRespondWith(int status) {
    script.clear();
    defaultStatus = status;
  }

  /** Back to the start state: nothing recorded, every request answered 200. */
  void reset() {
    script.clear();
    defaultStatus = 200;
    received.clear();
  }

  /** The next recorded request; the test fails when none arrives within the bounded wait. */
  ReceivedRequest next() {
    try {
      ReceivedRequest request = received.poll(10, TimeUnit.SECONDS);
      if (request == null) {
        throw new AssertionError("No request arrived within 10 seconds");
      }
      return request;
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new AssertionError("Interrupted while waiting for a request", e);
    }
  }

  /** The requests that are recorded right now, taken out of the record. */
  List<ReceivedRequest> takeAll() {
    var all = new ArrayList<ReceivedRequest>();
    received.drainTo(all);
    return all;
  }

  /** True when no request is recorded within the given time. Use it only for a short, bounded check. */
  boolean staysQuietFor(Duration time) {
    try {
      ReceivedRequest request = received.poll(time.toMillis(), TimeUnit.MILLISECONDS);
      if (request != null) {
        received.add(request);
      }
      return request == null;
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new AssertionError("Interrupted", e);
    }
  }

  private void handle(HttpExchange exchange) throws IOException {
    byte[] body = exchange.getRequestBody().readAllBytes();
    String text = new String(body, StandardCharsets.UTF_8);
    // The status is chosen before the request is recorded: a test that reacts to the record cannot
    // change the answer of the request it just saw.
    Integer scripted = script.pollFirst();
    int status = scripted != null ? scripted : defaultStatus;
    received.add(
        new ReceivedRequest(
            exchange.getRequestMethod(),
            exchange.getRequestURI().getPath(),
            exchange.getRequestHeaders().getFirst("x-revalidate-secret"),
            text,
            tagsOf(text)));
    if (status == HANG) {
      try {
        closed.await();
      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
      }
      exchange.close();
      return;
    }
    byte[] answer = "{}".getBytes(StandardCharsets.UTF_8);
    exchange.getResponseHeaders().add("Content-Type", "application/json");
    exchange.sendResponseHeaders(status, answer.length);
    exchange.getResponseBody().write(answer);
    exchange.close();
  }

  private static List<String> tagsOf(String body) {
    try {
      JsonNode tags = JSON.readTree(body).path("tags");
      var list = new ArrayList<String>();
      tags.forEach(tag -> list.add(tag.asString()));
      return list;
    } catch (RuntimeException e) {
      return List.of();
    }
  }

  @Override
  public void close() {
    closed.countDown();
    server.stop(0);
  }
}
