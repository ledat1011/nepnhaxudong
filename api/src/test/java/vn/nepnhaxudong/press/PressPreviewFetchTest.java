package vn.nepnhaxudong.press;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.ResponseEntity;
import tools.jackson.databind.JsonNode;
import vn.nepnhaxudong.TestClockConfig;
import vn.nepnhaxudong.TestcontainersConfig;
import vn.nepnhaxudong.auth.ApiClient;
import vn.nepnhaxudong.auth.AuthTestSupport;

/**
 * Preview with the internal-address check switched off, so that a JDK HttpServer on 127.0.0.1 can
 * play the role of a newspaper site. It has its own Spring context because the switch is a property.
 */
@SpringBootTest(
    webEnvironment = RANDOM_PORT,
    properties = {
      "bootstrap.admin.email=Admin@Example.com",
      "bootstrap.admin.password=first-password-1",
      "server.servlet.session.cookie.secure=false",
      "press.preview.block-internal-addresses=false"
    })
@AutoConfigureTestRestTemplate
@Import({TestcontainersConfig.class, TestClockConfig.class})
class PressPreviewFetchTest extends AuthTestSupport {

  private static final int TWO_MB = 2 * 1024 * 1024;

  private HttpServer server;
  private final AtomicInteger hits = new AtomicInteger();

  @BeforeEach
  void startServer() throws IOException {
    hits.set(0);
    server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
    server.start();
  }

  @AfterEach
  void stopServer() {
    server.stop(0);
  }

  @Test
  void readsTheTitleDateAndSiteNameFromTheMetaTags() {
    serve(
        "/a",
        "text/html; charset=utf-8",
        "<html><head><title>Tiêu đề trang</title>"
            + "<meta property=\"og:title\" content=\"Nếp cái hoa vàng Hải Dương\">"
            + "<meta property=\"article:published_time\" content=\"2024-05-01T08:30:00+07:00\">"
            + "<meta property=\"og:site_name\" content=\"Báo Hải Dương\">"
            + "</head><body>x</body></html>");
    var client = loggedInClient();

    var response = client.post("/admin/press/preview", Map.of("url", url("/a")));

    assertThat(response.getStatusCode().value()).isEqualTo(200);
    JsonNode json = ApiClient.json(response);
    assertThat(json.path("title").asString()).isEqualTo("Nếp cái hoa vàng Hải Dương");
    assertThat(json.path("publishedOn").asString()).isEqualTo("2024-05-01");
    assertThat(json.path("sourceName").asString()).isEqualTo("Báo Hải Dương");
  }

  @Test
  void fallsBackToThePageTitleAndLeavesMissingFieldsNull() {
    serve("/b", "text/html", "<html><head><title>  Chỉ có title  </title></head></html>");
    var client = loggedInClient();

    JsonNode json =
        ApiClient.json(client.post("/admin/press/preview", Map.of("url", url("/b"))));

    assertThat(json.path("title").asString()).isEqualTo("Chỉ có title");
    assertThat(json.path("publishedOn").isNull()).isTrue();
    assertThat(json.path("sourceName").isNull()).isTrue();
  }

  @Test
  void anUnreadableDateGivesNullWhileTheOtherFieldsStay() {
    serve(
        "/c",
        "text/html",
        "<meta property=\"og:title\" content=\"T\">"
            + "<meta property=\"article:published_time\" content=\"yesterday\">");
    var client = loggedInClient();

    JsonNode json =
        ApiClient.json(client.post("/admin/press/preview", Map.of("url", url("/c"))));

    assertThat(json.path("title").asString()).isEqualTo("T");
    assertThat(json.path("publishedOn").isNull()).isTrue();
  }

  @Test
  void aPageThatIsNotHtmlGivesNullFields() {
    serve("/json", "application/json", "{\"title\":\"x\"}");
    serve("/png", "image/png", "<meta property=\"og:title\" content=\"T\">");
    var client = loggedInClient();

    assertAllNull(client.post("/admin/press/preview", Map.of("url", url("/json"))));
    assertAllNull(client.post("/admin/press/preview", Map.of("url", url("/png"))));
  }

  @Test
  void anErrorStatusGivesNullFields() {
    server.createContext(
        "/missing",
        exchange -> {
          byte[] html = "<meta property=\"og:title\" content=\"T\">".getBytes(StandardCharsets.UTF_8);
          exchange.getResponseHeaders().add("Content-Type", "text/html");
          exchange.sendResponseHeaders(404, html.length);
          exchange.getResponseBody().write(html);
          exchange.close();
        });
    var client = loggedInClient();

    assertAllNull(client.post("/admin/press/preview", Map.of("url", url("/missing"))));
  }

  @Test
  void followsAtMostThreeRedirects() {
    serve("/end", "text/html", "<meta property=\"og:title\" content=\"Cuối\">");
    redirect("/r3", "/end");
    redirect("/r2", "/r3");
    redirect("/r1", "/r2");
    redirect("/r0", "/r1");
    var client = loggedInClient();

    JsonNode threeRedirects =
        ApiClient.json(client.post("/admin/press/preview", Map.of("url", url("/r1"))));
    var fourRedirects = client.post("/admin/press/preview", Map.of("url", url("/r0")));

    assertThat(threeRedirects.path("title").asString()).isEqualTo("Cuối");
    assertAllNull(fourRedirects);
  }

  @Test
  void aRedirectLoopGivesNullFields() {
    redirect("/loop", "/loop");
    var client = loggedInClient();

    assertAllNull(client.post("/admin/press/preview", Map.of("url", url("/loop"))));
  }

  @Test
  void readsAtMostTwoMegabytes() throws IOException {
    String padding = "<!-- " + "x".repeat(TWO_MB) + " -->";
    serve("/early", "text/html", "<meta property=\"og:title\" content=\"Sớm\">" + padding);
    serve("/late", "text/html", padding + "<meta property=\"og:title\" content=\"Muộn\">");
    var client = loggedInClient();

    JsonNode early =
        ApiClient.json(client.post("/admin/press/preview", Map.of("url", url("/early"))));
    var late = client.post("/admin/press/preview", Map.of("url", url("/late")));

    assertThat(early.path("title").asString()).isEqualTo("Sớm");
    assertAllNull(late);
  }

  @Test
  void aServerThatDoesNotAnswerWithinFiveSecondsGivesNullFields() {
    server.createContext(
        "/slow",
        exchange -> {
          try {
            Thread.sleep(8000);
          } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
          }
          exchange.close();
        });
    var client = loggedInClient();
    long start = System.nanoTime();

    var response = client.post("/admin/press/preview", Map.of("url", url("/slow")));

    long seconds = (System.nanoTime() - start) / 1_000_000_000L;
    assertAllNull(response);
    assertThat(seconds).isBetween(4L, 7L);
  }

  @Test
  void aConnectionThatIsRefusedGivesNullFields() throws IOException {
    int closedPort = server.getAddress().getPort();
    server.stop(0);
    var client = loggedInClient();

    assertAllNull(
        client.post(
            "/admin/press/preview", Map.of("url", "http://127.0.0.1:" + closedPort + "/x")));
  }

  @Test
  void readsAChunkedAnswer() {
    server.createContext(
        "/chunked",
        exchange -> {
          exchange.getResponseHeaders().add("Content-Type", "text/html; charset=utf-8");
          exchange.sendResponseHeaders(200, 0);
          try (OutputStream out = exchange.getResponseBody()) {
            out.write("<meta property=\"og:title\" content=\"Nếp ".getBytes(StandardCharsets.UTF_8));
            out.flush();
            out.write("cái\">".getBytes(StandardCharsets.UTF_8));
          }
        });
    var client = loggedInClient();

    JsonNode json =
        ApiClient.json(client.post("/admin/press/preview", Map.of("url", url("/chunked"))));

    assertThat(json.path("title").asString()).isEqualTo("Nếp cái");
  }

  // ---- helpers -------------------------------------------------------------------------------

  private String url(String path) {
    return "http://127.0.0.1:" + server.getAddress().getPort() + path;
  }

  private void serve(String path, String contentType, String body) {
    server.createContext(
        path,
        exchange -> {
          hits.incrementAndGet();
          send(exchange, 200, contentType, body.getBytes(StandardCharsets.UTF_8));
        });
  }

  private void redirect(String path, String target) {
    server.createContext(
        path,
        exchange -> {
          exchange.getResponseHeaders().add("Location", target);
          exchange.sendResponseHeaders(302, -1);
          exchange.close();
        });
  }

  private static void send(HttpExchange exchange, int status, String contentType, byte[] body)
      throws IOException {
    exchange.getResponseHeaders().add("Content-Type", contentType);
    exchange.sendResponseHeaders(status, body.length);
    try (OutputStream out = exchange.getResponseBody()) {
      out.write(body);
    }
  }

  private static void assertAllNull(ResponseEntity<String> response) {
    assertThat(response.getStatusCode().value()).isEqualTo(200);
    JsonNode json = ApiClient.json(response);
    for (String field : List.of("title", "publishedOn", "sourceName")) {
      assertThat(json.path(field).isNull()).as(field + " is null").isTrue();
    }
  }
}
