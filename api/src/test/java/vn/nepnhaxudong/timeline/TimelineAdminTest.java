package vn.nepnhaxudong.timeline;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.JsonNode;
import vn.nepnhaxudong.auth.ApiClient;
import vn.nepnhaxudong.auth.AuthTestSupport;
import vn.nepnhaxudong.media.Media;
import vn.nepnhaxudong.media.MediaRepository;

class TimelineAdminTest extends AuthTestSupport {

  private static final String TITLE_REQUIRED =
      "Tiêu đề mốc (tiếng Việt) không được để trống.";
  private static final String NOT_FOUND = "Không tìm thấy mốc hành trình.";
  private static final String YEAR_RANGE = "Năm phải nằm trong khoảng 1900 đến 2100.";

  @Autowired JdbcTemplate jdbc;
  @Autowired MediaRepository mediaRepository;

  @BeforeEach
  void emptyTables() {
    jdbc.update("delete from audit_log");
    jdbc.update("delete from timeline_event");
    jdbc.update("delete from media");
  }

  @Test
  void aVisitorWhoIsNotLoggedInIsRefused() {
    var client = newClient();

    assertThat(client.get("/admin/timeline").getStatusCode().value()).isEqualTo(401);
    assertThat(client.get("/admin/timeline/1").getStatusCode().value()).isEqualTo(401);
  }

  @Test
  void createdEventReadsBackWithTheContractShape() {
    var client = loggedInClient();
    long mediaId = newMedia("t1.webp");
    var body = body(1998, "Khởi đầu 🌾", "The beginning");
    body.put("description", text("Mô tả: à á ả ã ạ", "Description"));
    body.put("sortOrder", 4);
    body.put("mediaId", mediaId);

    var created = client.post("/admin/timeline", body);

    assertThat(created.getStatusCode().value()).isEqualTo(201);
    JsonNode json = ApiClient.json(created);
    long id = json.path("id").asLong();
    assertThat(id).isPositive();
    assertThat(json.path("year").asInt()).isEqualTo(1998);
    assertThat(json.path("sortOrder").asInt()).isEqualTo(4);
    assertThat(json.path("title").path("vi").asString()).isEqualTo("Khởi đầu 🌾");
    assertThat(json.path("title").path("en").asString()).isEqualTo("The beginning");
    assertThat(json.path("description").path("vi").asString()).isEqualTo("Mô tả: à á ả ã ạ");
    assertThat(json.path("mediaId").asLong()).isEqualTo(mediaId);
    assertThat(json.path("missingEn").asBoolean()).isFalse();
    assertThat(ApiClient.json(client.get("/admin/timeline/" + id))).isEqualTo(json);
    String stored =
        jdbc.queryForObject(
            "select title from timeline_event_translation where timeline_event_id = ? and lang = 'vi'",
            String.class,
            id);
    assertThat(stored).isEqualTo("Khởi đầu 🌾");
  }

  @Test
  void aMissingTitleOrBlankTitleIsRefused() {
    var client = loggedInClient();

    var withoutTitle = body(2000, "x", "x");
    withoutTitle.remove("title");
    var blank = body(2000, "   ", "x");

    assertDetail(client.post("/admin/timeline", withoutTitle), 400, TITLE_REQUIRED);
    assertDetail(client.post("/admin/timeline", blank), 400, TITLE_REQUIRED);
    assertThat(count("timeline_event")).isZero();
  }

  @Test
  void theYearMustBePresentAndBetween1900And2100() {
    var client = loggedInClient();

    var missing = body(2000, "A", "A");
    missing.remove("year");
    assertDetail(client.post("/admin/timeline", missing), 400, YEAR_RANGE);
    assertDetail(client.post("/admin/timeline", body(1899, "A", "A")), 400, YEAR_RANGE);
    assertDetail(client.post("/admin/timeline", body(2101, "A", "A")), 400, YEAR_RANGE);
    assertThat(client.post("/admin/timeline", body(1900, "A", "A")).getStatusCode().value())
        .isEqualTo(201);
    assertThat(client.post("/admin/timeline", body(2100, "B", "B")).getStatusCode().value())
        .isEqualTo(201);
  }

  @Test
  void englishTextWithoutAnEnglishTitleIsRefusedAndBlankEnglishIsStoredAsNull() {
    var client = loggedInClient();
    var bad = body(2001, "Tiêu đề", null);
    bad.put("description", text("Mô tả", "Only English description"));
    assertThat(client.post("/admin/timeline", bad).getStatusCode().value()).isEqualTo(400);

    var viOnly = body(2001, "Tiêu đề", "  ");
    viOnly.put("description", text("Mô tả", ""));
    var created = client.post("/admin/timeline", viOnly);

    assertThat(created.getStatusCode().value()).isEqualTo(201);
    JsonNode json = ApiClient.json(created);
    assertThat(json.path("title").path("en").isNull()).isTrue();
    assertThat(json.path("description").path("en").isNull()).isTrue();
    assertThat(json.path("missingEn").asBoolean()).isTrue();
    assertThat(count("timeline_event_translation where lang = 'en'")).isZero();
  }

  @Test
  void aTitleThatHasNoDescriptionAtAllIsNotMissingEnglish() {
    var client = loggedInClient();

    JsonNode json = ApiClient.json(client.post("/admin/timeline", body(2002, "Vi", "En")));

    assertThat(json.path("description").path("vi").isNull()).isTrue();
    assertThat(json.path("missingEn").asBoolean()).isFalse();
  }

  @Test
  void anUnknownImageIsRefused() {
    var client = loggedInClient();
    var body = body(2003, "A", "A");
    body.put("mediaId", 999999L);

    assertDetail(client.post("/admin/timeline", body), 400, "Ảnh không tồn tại: 999999.");
  }

  @Test
  void aNewEventWithoutSortOrderIsAppendedAtTheEnd() {
    var client = loggedInClient();

    long first = create(client, 2000, "A");
    long second = create(client, 1990, "B");
    long third = create(client, 2010, "C");

    assertThat(ids(client)).containsExactly(first, second, third);
    assertThat(ApiClient.json(client.get("/admin/timeline/" + third)).path("sortOrder").asInt())
        .isGreaterThan(
            ApiClient.json(client.get("/admin/timeline/" + second)).path("sortOrder").asInt());
  }

  @Test
  void updateReplacesTheEventAndKeepsTheSortOrderWhenNoneIsSent() {
    var client = loggedInClient();
    long id = create(client, 2000, "Cũ");
    create(client, 2001, "Khác");
    int sortOrder =
        ApiClient.json(client.get("/admin/timeline/" + id)).path("sortOrder").asInt();

    var update = body(2005, "Mới", null);
    var response = client.put("/admin/timeline/" + id, update);

    assertThat(response.getStatusCode().value()).isEqualTo(200);
    JsonNode json = ApiClient.json(response);
    assertThat(json.path("id").asLong()).isEqualTo(id);
    assertThat(json.path("year").asInt()).isEqualTo(2005);
    assertThat(json.path("title").path("vi").asString()).isEqualTo("Mới");
    assertThat(json.path("title").path("en").isNull()).isTrue();
    assertThat(json.path("sortOrder").asInt()).isEqualTo(sortOrder);
    assertThat(count("timeline_event_translation where timeline_event_id = " + id)).isEqualTo(1);
  }

  @Test
  void changingOnlyTheTitleMovesUpdatedAtOfTheEvent() {
    var client = loggedInClient();
    long id = create(client, 2000, "Cũ");
    java.time.Instant created = updatedAt(id);
    clock.advance(java.time.Duration.ofHours(1));
    var update = body(2000, "Chỉ đổi tiêu đề", "Cũ (en)");
    update.put("sortOrder", 0);

    assertThat(client.put("/admin/timeline/" + id, update).getStatusCode().value()).isEqualTo(200);

    assertThat(updatedAt(id)).isAfter(created);
    assertThat(updatedAt(id)).isEqualTo(created.plus(java.time.Duration.ofHours(1)));
  }

  private java.time.Instant updatedAt(long id) {
    return jdbc.queryForObject(
            "select updated_at from timeline_event where id = ?", java.sql.Timestamp.class, id)
        .toInstant();
  }

  @Test
  void deleteRemovesTheEventAndItsTranslations() {
    var client = loggedInClient();
    long id = create(client, 2000, "A");

    assertThat(client.delete("/admin/timeline/" + id).getStatusCode().value()).isEqualTo(204);

    assertThat(count("timeline_event")).isZero();
    assertThat(count("timeline_event_translation")).isZero();
    assertDetail(client.get("/admin/timeline/" + id), 404, NOT_FOUND);
    assertDetail(client.delete("/admin/timeline/" + id), 404, NOT_FOUND);
    assertDetail(client.put("/admin/timeline/" + id, body(2000, "A", "A")), 404, NOT_FOUND);
  }

  // ---- order ---------------------------------------------------------------------------------

  @Test
  void theOrderEndpointSortsByTheArray() {
    var client = loggedInClient();
    long a = create(client, 2000, "A");
    long b = create(client, 2001, "B");
    long c = create(client, 2002, "C");

    var response = client.put("/admin/timeline/order", Map.of("ids", List.of(c, a, b)));

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    assertThat(ids(client)).containsExactly(c, a, b);
    assertThat(
            ApiClient.json(client.get("/admin/timeline/" + c)).path("sortOrder").asInt())
        .isLessThan(ApiClient.json(client.get("/admin/timeline/" + a)).path("sortOrder").asInt());
  }

  @Test
  void theOrderMustContainExactlyTheExistingIds() {
    var client = loggedInClient();
    long a = create(client, 2000, "A");
    long b = create(client, 2001, "B");

    var missing = client.put("/admin/timeline/order", Map.of("ids", List.of(a)));
    var extra = client.put("/admin/timeline/order", Map.of("ids", List.of(a, b, 987654L)));
    var duplicate = client.put("/admin/timeline/order", Map.of("ids", List.of(a, b, b)));
    var noIds = client.put("/admin/timeline/order", new LinkedHashMap<String, Object>());
    var nullElement =
        client.put("/admin/timeline/order", Map.of("ids", Arrays.asList(a, null, b)));

    assertDetail(missing, 400, "Thiếu mã mốc: " + b + ".");
    assertDetail(extra, 400, "Mã mốc không tồn tại: 987654.");
    assertDetail(duplicate, 400, "Mã mốc bị lặp: " + b + ".");
    assertThat(noIds.getStatusCode().value()).isEqualTo(400);
    assertThat(nullElement.getStatusCode().value()).isEqualTo(400);
    assertThat(ids(client)).containsExactly(a, b);
  }

  @Test
  void reorderingWritesAnAuditRowOnlyForEventsThatMoved() {
    var client = loggedInClient();
    long a = create(client, 2000, "A");
    long b = create(client, 2001, "B");
    long c = create(client, 2002, "C");
    jdbc.update("delete from audit_log");

    client.put("/admin/timeline/order", Map.of("ids", List.of(a, c, b)));

    var moved =
        jdbc.queryForList(
            "select entity_id from audit_log where action = 'UPDATE' order by entity_id",
            Long.class);
    assertThat(moved).containsExactly(b, c);
  }

  // ---- audit ---------------------------------------------------------------------------------

  @Test
  void everyWriteIsRecordedWithTheLoggedInUser() {
    var client = loggedInClient();
    long userId = jdbc.queryForObject("select id from app_user", Long.class);
    long id = create(client, 2000, "A");
    client.put("/admin/timeline/" + id, body(2001, "B", "B"));
    client.delete("/admin/timeline/" + id);

    var rows =
        jdbc.queryForList(
            "select action, user_id, entity_type, entity_id from audit_log order by id");

    assertThat(rows).extracting(r -> r.get("action")).containsExactly("CREATE", "UPDATE", "DELETE");
    assertThat(rows).allSatisfy(r -> {
      assertThat(r.get("user_id")).isEqualTo(userId);
      assertThat(r.get("entity_type")).isEqualTo("timeline_event");
      assertThat(r.get("entity_id")).isEqualTo(id);
    });
    String before =
        jdbc.queryForObject(
            "select before_json ->> 'year' from audit_log where action = 'UPDATE'", String.class);
    String after =
        jdbc.queryForObject(
            "select after_json ->> 'year' from audit_log where action = 'UPDATE'", String.class);
    assertThat(before).isEqualTo("2000");
    assertThat(after).isEqualTo("2001");
  }

  // ---- helpers -------------------------------------------------------------------------------

  private long create(ApiClient client, int year, String titleVi) {
    var response = client.post("/admin/timeline", body(year, titleVi, titleVi + " (en)"));
    assertThat(response.getStatusCode().value()).isEqualTo(201);
    return ApiClient.json(response).path("id").asLong();
  }

  private List<Long> ids(ApiClient client) {
    var ids = new ArrayList<Long>();
    for (JsonNode node : ApiClient.json(client.get("/admin/timeline"))) {
      ids.add(node.path("id").asLong());
    }
    return ids;
  }

  private static Map<String, Object> body(Integer year, String titleVi, String titleEn) {
    var body = new LinkedHashMap<String, Object>();
    body.put("year", year);
    body.put("title", text(titleVi, titleEn));
    return body;
  }

  private static Map<String, Object> text(String vi, String en) {
    var text = new LinkedHashMap<String, Object>();
    text.put("vi", vi);
    text.put("en", en);
    return text;
  }

  private static void assertDetail(
      org.springframework.http.ResponseEntity<String> response, int status, String detail) {
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
