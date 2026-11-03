package vn.nepnhaxudong.press;

import static org.assertj.core.api.Assertions.assertThat;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * The redirect rule, tested without Spring: a fake resolver gives host names fixed addresses, so the
 * test can show that every redirect target is checked again.
 */
class PressPreviewServiceTest {

  private static final InetAddress LOOPBACK = InetAddress.getLoopbackAddress();

  private HttpServer server;
  private final AtomicInteger hits = new AtomicInteger();
  private final List<String> resolvedHosts = new ArrayList<>();

  @BeforeEach
  void startServer() throws IOException {
    server = HttpServer.create(new InetSocketAddress(LOOPBACK, 0), 0);
    server.createContext(
        "/page",
        exchange -> {
          hits.incrementAndGet();
          byte[] html =
              "<meta property=\"og:title\" content=\"Trang\">".getBytes(StandardCharsets.UTF_8);
          exchange.getResponseHeaders().add("Content-Type", "text/html");
          exchange.sendResponseHeaders(200, html.length);
          exchange.getResponseBody().write(html);
          exchange.close();
        });
    server.createContext(
        "/to-internal",
        exchange -> {
          hits.incrementAndGet();
          exchange.getResponseHeaders().add("Location", "http://internal.test:" + port() + "/page");
          exchange.sendResponseHeaders(302, -1);
          exchange.close();
        });
    server.createContext(
        "/to-public",
        exchange -> {
          hits.incrementAndGet();
          exchange.getResponseHeaders().add("Location", "http://other.test:" + port() + "/page");
          exchange.sendResponseHeaders(302, -1);
          exchange.close();
        });
    server.start();
  }

  @AfterEach
  void stopServer() {
    server.stop(0);
  }

  @Test
  void aRedirectToAnInternalHostIsRefusedBeforeAnyConnection() {
    var service = service(Map.of("public.test", LOOPBACK, "internal.test", address("10.0.0.5")));

    var result = service.preview("http://public.test:" + port() + "/to-internal");

    assertThat(result).isEqualTo(PressPreviewDto.EMPTY);
    assertThat(resolvedHosts).containsExactly("public.test", "internal.test");
    assertThat(hits.get()).as("only the first request reached the server").isEqualTo(1);
  }

  @Test
  void aRedirectToAnotherPublicHostIsFollowed() {
    var service = service(Map.of("public.test", LOOPBACK, "other.test", LOOPBACK));

    var result = service.preview("http://public.test:" + port() + "/to-public");

    assertThat(result.title()).isEqualTo("Trang");
    assertThat(resolvedHosts).containsExactly("public.test", "other.test");
  }

  @Test
  void aHostWithOneInternalAddressAmongPublicOnesIsRefused() {
    var mixed =
        new PressPreviewService(
            allowOnly(LOOPBACK),
            host -> new InetAddress[] {LOOPBACK, address("10.0.0.5")},
            new PinnedHttpFetcher());

    var result = mixed.preview("http://mixed.test:" + port() + "/page");

    assertThat(result).isEqualTo(PressPreviewDto.EMPTY);
    assertThat(hits.get()).isZero();
  }

  @Test
  void aHostThatCannotBeResolvedGivesAnEmptyPreview() {
    var service = service(Map.of());

    assertThat(service.preview("http://nowhere.test/page")).isEqualTo(PressPreviewDto.EMPTY);
  }

  // ---- helpers -------------------------------------------------------------------------------

  private int port() {
    return server.getAddress().getPort();
  }

  /** Allows the loopback address (the test server) and refuses everything else that is internal. */
  private PressPreviewService service(Map<String, InetAddress> hosts) {
    return new PressPreviewService(
        allowOnly(LOOPBACK), recordingResolver(hosts), new PinnedHttpFetcher());
  }

  private static AddressPolicy allowOnly(InetAddress allowed) {
    return new AddressPolicy(true) {
      @Override
      public boolean allows(InetAddress address) {
        return address.equals(allowed) || !AddressPolicy.isInternal(address);
      }
    };
  }

  private HostResolver recordingResolver(Map<String, InetAddress> hosts) {
    return host -> {
      resolvedHosts.add(host);
      InetAddress address = hosts.get(host);
      if (address == null) {
        throw new java.net.UnknownHostException(host);
      }
      return new InetAddress[] {address};
    };
  }

  private static InetAddress address(String literal) {
    try {
      return InetAddress.getByName(literal);
    } catch (java.net.UnknownHostException e) {
      throw new IllegalStateException(e);
    }
  }
}
