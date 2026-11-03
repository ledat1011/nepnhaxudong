package vn.nepnhaxudong.press;

import static org.assertj.core.api.Assertions.assertThat;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.JsonNode;
import vn.nepnhaxudong.auth.ApiClient;
import vn.nepnhaxudong.auth.AuthTestSupport;
import vn.nepnhaxudong.media.Media;
import vn.nepnhaxudong.media.MediaRepository;

/** The press admin with the default setting: addresses of this machine are refused by preview. */
class PressAdminTest extends AuthTestSupport {

  private static final String NOT_FOUND = "Không tìm thấy bài báo.";
  private static final String TITLE_REQUIRED =
      "Tiêu đề bài báo (tiếng Việt) không được để trống.";
  private static final String SOURCE_REQUIRED = "Tên báo không được để trống.";
  private static final String URL_INVALID =
      "Đường dẫn bài báo phải bắt đầu bằng http:// hoặc https:// và dài tối đa 2000 ký tự.";

  @Autowired JdbcTemplate jdbc;
  @Autowired MediaRepository mediaRepository;

  private HttpServer server;
  private final AtomicInteger hits = new AtomicInteger();

  @BeforeEach
  void emptyTablesAndStartServer() throws IOException {
    jdbc.update("delete from audit_log");
    jdbc.update("delete from press_mention");
    jdbc.update("delete from media");
    hits.set(0);
    server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
    server.createContext(
        "/",
        exchange -> {
          hits.incrementAndGet();
          byte[] html =
              "<html><head><meta property=\"og:title\" content=\"Nếp cái hoa vàng\"></head></html>"
                  .getBytes(StandardCharsets.UTF_8);
          exchange.getResponseHeaders().add("Content-Type", "text/html; charset=utf-8");
          exchange.sendResponseHeaders(200, html.length);
          exchange.getResponseBody().write(html);
          exchange.close();
        });
    server.start();
  }

  @AfterEach
  void stopServer() {
    server.stop(0);
  }

  // ---- CRUD ----------------------------------------------------------------------------------

  @Test
  void aVisitorWhoIsNotLoggedInIsRefused() {
    var client = newClient();
    client.fetchCsrf();

    assertThat(client.get("/admin/press").getStatusCode().value()).isEqualTo(401);
    assertThat(client.post("/admin/press/preview", Map.of("url", "https://a.example")).getStatusCode().value())
        .isEqualTo(401);
  }

  @Test
  void createdMentionReadsBackWithTheContractShape() {
    var client = loggedInClient();
    long mediaId = newMedia("p1.webp");
    var body = body("https://baochi.example/nep-cai-hoa-vang?x=1", "Báo Hải Dương", "Gạo nếp 🌾", "Sticky rice");
    body.put("publishedOn", "2024-05-01");
    body.put("mediaId", mediaId);
    body.put("sortOrder", 3);

    var created = client.post("/admin/press", body);

    assertThat(created.getStatusCode().value()).isEqualTo(201);
    JsonNode json = ApiClient.json(created);
    long id = json.path("id").asLong();
    assertThat(id).isPositive();
    assertThat(json.path("url").asString()).isEqualTo("https://baochi.example/nep-cai-hoa-vang?x=1");
    assertThat(json.path("sourceName").asString()).isEqualTo("Báo Hải Dương");
    assertThat(json.path("publishedOn").asString()).isEqualTo("2024-05-01");
    assertThat(json.path("title").path("vi").asString()).isEqualTo("Gạo nếp 🌾");
    assertThat(json.path("title").path("en").asString()).isEqualTo("Sticky rice");
    assertThat(json.path("mediaId").asLong()).isEqualTo(mediaId);
    assertThat(json.path("sortOrder").asInt()).isEqualTo(3);
    assertThat(json.path("missingEn").asBoolean()).isFalse();
    assertThat(ApiClient.json(client.get("/admin/press/" + id))).isEqualTo(json);
    assertThat(
            jdbc.queryForObject("select source_name from press_mention where id = ?", String.class, id))
        .isEqualTo("Báo Hải Dương");
  }

  @Test
  void optionalFieldsMayBeMissingAndBlankEnglishIsNull() {
    var client = loggedInClient();

    var created =
        client.post("/admin/press", body("http://baochi.example/a", "Báo A", "Tiêu đề", "  "));

    assertThat(created.getStatusCode().value()).isEqualTo(201);
    JsonNode json = ApiClient.json(created);
    assertThat(json.path("publishedOn").isNull()).isTrue();
    assertThat(json.path("mediaId").isNull()).isTrue();
    assertThat(json.path("title").path("en").isNull()).isTrue();
    assertThat(json.path("missingEn").asBoolean()).isTrue();
    assertThat(count("press_mention_translation where lang = 'en'")).isZero();
  }

  @Test
  void theListIsOrderedBySortOrderAndNewMentionsAreAppended() {
    var client = loggedInClient();

    long first = create(client, "https://a.example/1", "Một");
    long second = create(client, "https://a.example/2", "Hai");

    var ids = new ArrayList<Long>();
    for (JsonNode node : ApiClient.json(client.get("/admin/press"))) {
      ids.add(node.path("id").asLong());
    }
    assertThat(ids).containsExactly(first, second);
  }

  @Test
  void updateReplacesTheMentionAndDeleteRemovesIt() {
    var client = loggedInClient();
    long id = create(client, "https://a.example/old", "Cũ");

    var update = body("https://a.example/new", "Báo B", "Mới", null);
    var updated = client.put("/admin/press/" + id, update);

    assertThat(updated.getStatusCode().value()).isEqualTo(200);
    JsonNode json = ApiClient.json(updated);
    assertThat(json.path("url").asString()).isEqualTo("https://a.example/new");
    assertThat(json.path("title").path("vi").asString()).isEqualTo("Mới");
    assertThat(json.path("title").path("en").isNull()).isTrue();
    assertThat(count("press_mention_translation where press_mention_id = " + id)).isEqualTo(1);

    assertThat(client.delete("/admin/press/" + id).getStatusCode().value()).isEqualTo(204);
    assertThat(count("press_mention")).isZero();
    assertThat(count("press_mention_translation")).isZero();
    assertDetail(client.get("/admin/press/" + id), 404, NOT_FOUND);
    assertDetail(client.delete("/admin/press/" + id), 404, NOT_FOUND);
    assertDetail(client.put("/admin/press/" + id, update), 404, NOT_FOUND);
  }

  @Test
  void changingOnlyTheTitleMovesUpdatedAtOfTheMention() {
    var client = loggedInClient();
    long id = create(client, "https://a.example/1", "Cũ");
    java.time.Instant created = updatedAt(id);
    clock.advance(java.time.Duration.ofHours(1));
    var update = body("https://a.example/1", "Báo", "Chỉ đổi tiêu đề", "Cũ (en)");
    update.put("sortOrder", 0);

    assertThat(client.put("/admin/press/" + id, update).getStatusCode().value()).isEqualTo(200);

    assertThat(updatedAt(id)).isEqualTo(created.plus(java.time.Duration.ofHours(1)));
  }

  private java.time.Instant updatedAt(long id) {
    return jdbc.queryForObject(
            "select updated_at from press_mention where id = ?", java.sql.Timestamp.class, id)
        .toInstant();
  }

  @Test
  void requiredTextsAreChecked() {
    var client = loggedInClient();

    var noTitle = body("https://a.example", "Báo", "x", null);
    noTitle.put("title", text("  ", "x"));
    var noSource = body("https://a.example", "  ", "Tiêu đề", null);
    var englishWithoutVietnamese = body("https://a.example", "Báo", "Tiêu đề", "Title");
    englishWithoutVietnamese.remove("title");

    assertDetail(client.post("/admin/press", noTitle), 400, TITLE_REQUIRED);
    assertDetail(client.post("/admin/press", noSource), 400, SOURCE_REQUIRED);
    assertDetail(client.post("/admin/press", englishWithoutVietnamese), 400, TITLE_REQUIRED);
    assertThat(count("press_mention")).isZero();
  }

  @Test
  void theUrlMustBeHttpOrHttpsAndAtMost2000Characters() {
    var client = loggedInClient();
    String longUrl = "https://a.example/" + "x".repeat(2000 - "https://a.example/".length());
    assertThat(longUrl).hasSize(2000);

    assertThat(client.post("/admin/press", body(longUrl, "Báo", "T", null)).getStatusCode().value())
        .isEqualTo(201);
    assertDetail(client.post("/admin/press", body(longUrl + "y", "Báo", "T", null)), 400, URL_INVALID);
    for (String bad :
        List.of("ftp://a.example/x", "javascript:alert(1)", "//a.example", "https://", "a.example", "  ")) {
      assertDetail(client.post("/admin/press", body(bad, "Báo", "T", null)), 400, URL_INVALID);
    }
    var missing = body("https://a.example", "Báo", "T", null);
    missing.remove("url");
    assertDetail(client.post("/admin/press", missing), 400, URL_INVALID);
  }

  @Test
  void anUnknownImageIsRefused() {
    var client = loggedInClient();
    var body = body("https://a.example", "Báo", "T", null);
    body.put("mediaId", 424242L);

    assertDetail(client.post("/admin/press", body), 400, "Ảnh không tồn tại: 424242.");
  }

  @Test
  void everyWriteIsRecordedInTheAuditLog() {
    var client = loggedInClient();
    long id = create(client, "https://a.example/1", "A");
    client.put("/admin/press/" + id, body("https://a.example/2", "Báo", "B", null));
    client.delete("/admin/press/" + id);

    var actions =
        jdbc.queryForList(
            "select action from audit_log where entity_type = 'press_mention' and entity_id = ? order by id",
            String.class,
            id);

    assertThat(actions).containsExactly("CREATE", "UPDATE", "DELETE");
  }

  // ---- preview with the internal-address check on --------------------------------------------

  @Test
  void previewOfAnAddressOfThisMachineIsRefusedWithNullFields() {
    var client = loggedInClient();
    String url = "http://127.0.0.1:" + server.getAddress().getPort() + "/article";

    var response = client.post("/admin/press/preview", Map.of("url", url));

    assertAllNull(response);
    assertThat(hits.get()).as("the server must never be contacted").isZero();
  }

  @Test
  void previewRefusesEveryKindOfInternalOrUnusableAddress() {
    var client = loggedInClient();
    int port = server.getAddress().getPort();

    for (String url :
        List.of(
            "http://localhost:" + port + "/",
            "http://[::1]:" + port + "/",
            "http://0.0.0.0:" + port + "/",
            "http://2130706433:" + port + "/",
            "http://0x7f.1:" + port + "/",
            "http://169.254.169.254/latest/meta-data/",
            "http://10.1.2.3/",
            "http://172.16.0.1/",
            "http://192.168.1.1/",
            "http://100.64.0.1/",
            "http://[fd00::1]/",
            "http://[::ffff:127.0.0.1]:" + port + "/",
            "http://224.0.0.1/",
            "ftp://a.example/x",
            "file:///etc/passwd",
            "javascript:alert(1)",
            "not a url",
            "https://" + "a".repeat(2000))) {
      assertAllNull(client.post("/admin/press/preview", Map.of("url", url)));
    }
    assertThat(hits.get()).isZero();
  }

  @Test
  void previewWithoutAUrlAnswersNullFields() {
    var client = loggedInClient();

    assertAllNull(client.post("/admin/press/preview", new LinkedHashMap<String, Object>()));
  }

  @Test
  void previewWithNoBodyOrABodyThatIsNotJsonAnswersNullFields() {
    var client = loggedInClient();

    assertAllNull(client.post("/admin/press/preview", null));
    assertAllNull(client.post("/admin/press/preview", "this is not json"));
    assertAllNull(client.post("/admin/press/preview", "{\"url\": "));
    assertAllNull(client.post("/admin/press/preview", "[1, 2]"));
    assertAllNull(client.post("/admin/press/preview", "{\"url\": 12}"));
  }

  // ---- helpers -------------------------------------------------------------------------------

  private static void assertAllNull(ResponseEntity<String> response) {
    assertThat(response.getStatusCode().value()).isEqualTo(200);
    JsonNode json = ApiClient.json(response);
    for (String field : List.of("title", "publishedOn", "sourceName")) {
      assertThat(json.has(field)).as(field + " is present").isTrue();
      assertThat(json.path(field).isNull()).as(field + " is null").isTrue();
    }
  }

  private long create(ApiClient client, String url, String titleVi) {
    var response = client.post("/admin/press", body(url, "Báo", titleVi, titleVi + " (en)"));
    assertThat(response.getStatusCode().value()).isEqualTo(201);
    return ApiClient.json(response).path("id").asLong();
  }

  private static Map<String, Object> body(
      String url, String sourceName, String titleVi, String titleEn) {
    var body = new LinkedHashMap<String, Object>();
    body.put("url", url);
    body.put("sourceName", sourceName);
    body.put("title", text(titleVi, titleEn));
    return body;
  }

  private static Map<String, Object> text(String vi, String en) {
    var text = new LinkedHashMap<String, Object>();
    text.put("vi", vi);
    text.put("en", en);
    return text;
  }

  private static void assertDetail(ResponseEntity<String> response, int status, String detail) {
    assertThat(response.getStatusCode().value()).isEqualTo(status);
    assertThat(ApiClient.json(response).path("detail").asString()).isEqualTo(detail);
  }

  private long newMedia(String path) {
    return mediaRepository
        .save(Media.create(path, "image/webp", 800, 600, 12345L, "Ảnh", "Image"))
        .getId();
  }

  private int count(String tableAndWhere) {
    return jdbc.queryForObject("select count(*) from " + tableAndWhere, Integer.class);
  }
}
