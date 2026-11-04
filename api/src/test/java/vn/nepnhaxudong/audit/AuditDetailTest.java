package vn.nepnhaxudong.audit;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.JsonNode;
import vn.nepnhaxudong.auth.ApiClient;
import vn.nepnhaxudong.auth.AuthTestSupport;

class AuditDetailTest extends AuthTestSupport {

  @Autowired JdbcTemplate jdbc;

  @BeforeEach
  void emptyTables() {
    jdbc.update("delete from audit_log");
    jdbc.update("delete from timeline_event");
  }

  @Test
  void editingATimelineTitleShowsTheNewTitleAsLabelAndIsRestorable() {
    var client = loggedInClient();
    long id = createTimeline(client, "Bản gốc");
    client.put("/admin/timeline/" + id, timeline("Tiêu đề mới"));

    JsonNode update = entryOf(client, "timeline_event", id, "UPDATE");

    assertThat(update.path("label").asString()).isEqualTo("Tiêu đề mới");
    assertThat(update.path("restorable").asBoolean()).isTrue();
  }

  @Test
  void aCreateLineIsNotRestorable() {
    var client = loggedInClient();
    long id = createTimeline(client, "Mốc mới");

    JsonNode create = entryOf(client, "timeline_event", id, "CREATE");

    assertThat(create.path("label").asString()).isEqualTo("Mốc mới");
    assertThat(create.path("restorable").asBoolean()).isFalse();
  }

  @Test
  void mediaAndAppUserLinesAreNotRestorable() {
    var client = loggedInClient();
    long media =
        insert(
            "media", 5, "UPDATE", "{\"id\":5,\"altVi\":\"Cánh đồng\"}", "{\"id\":5,\"altVi\":\"Lúa\"}");
    long user =
        insert(
            "app_user",
            6,
            "UPDATE",
            "{\"id\":6,\"displayName\":\"Bà Hai\"}",
            "{\"id\":6,\"displayName\":\"Bà Ba\"}");

    assertThat(restorable(client, media)).isFalse();
    assertThat(restorable(client, user)).isFalse();
    for (JsonNode entry : ApiClient.json(client.get("/admin/audit"))) {
      assertThat(entry.path("restorable").asBoolean()).isFalse();
    }
  }

  @Test
  void anUnknownEntityTypeIsNotRestorable() {
    var client = loggedInClient();
    long id = insert("nothing", 1, "UPDATE", "{\"id\":1}", "{\"id\":1}");

    assertThat(restorable(client, id)).isFalse();
  }

  @Test
  void aSiteSettingLineIsRestorableAndLabelledWithTheVietnameseKeyName() {
    var client = loggedInClient();
    long contact = insert("site_setting", 1, "UPDATE", setting(1, "contact"), setting(1, "contact"));
    long social = insert("site_setting", 2, "UPDATE", setting(2, "social"), setting(2, "social"));
    long brand = insert("site_setting", 3, "UPDATE", setting(3, "brand"), setting(3, "brand"));

    assertThat(label(client, contact)).isEqualTo("Liên hệ");
    assertThat(restorable(client, contact)).isTrue();
    assertThat(label(client, social)).isEqualTo("Mạng xã hội");
    assertThat(label(client, brand)).isEqualTo("Thương hiệu");
  }

  @Test
  void everyEntityTypeGetsASensibleLabel() {
    var client = loggedInClient();
    assertThat(
            labelOf(
                client,
                "product",
                1,
                "{\"name\":{\"vi\":\"Gạo nếp\",\"en\":null}}",
                "{\"name\":{\"vi\":\"Gạo nếp cái\",\"en\":null}}"))
        .isEqualTo("Gạo nếp cái");
    assertThat(
            labelOf(
                client,
                "story",
                2,
                "{\"title\":{\"vi\":\"Chuyện\",\"en\":null}}",
                "{\"title\":{\"vi\":\"Chuyện mới\",\"en\":null}}"))
        .isEqualTo("Chuyện mới");
    assertThat(
            labelOf(
                client,
                "press_mention",
                3,
                "{\"title\":{\"vi\":\"Báo\",\"en\":null}}",
                "{\"title\":{\"vi\":\"Báo mới\",\"en\":null}}"))
        .isEqualTo("Báo mới");
    assertThat(labelOf(client, "media", 4, "{\"altVi\":\"Ảnh cũ\"}", "{\"altVi\":\"Ảnh mới\"}"))
        .isEqualTo("Ảnh mới");
    assertThat(
            labelOf(
                client,
                "app_user",
                5,
                "{\"displayName\":\"Bà Hai\",\"email\":\"a@b.c\"}",
                "{\"displayName\":\"Bà Ba\",\"email\":\"a@b.c\"}"))
        .isEqualTo("Bà Ba");
    assertThat(
            labelOf(
                client,
                "app_user",
                6,
                "{\"displayName\":\" \",\"email\":\"x@y.z\"}",
                "{\"displayName\":\" \",\"email\":\"x@y.z\"}"))
        .isEqualTo("x@y.z");
  }

  @Test
  void aDeleteLineIsLabelledFromTheBeforeSnapshot() {
    var client = loggedInClient();
    long id =
        insert("timeline_event", 7, "DELETE", "{\"title\":{\"vi\":\"Đã xóa\",\"en\":null}}", null);

    assertThat(label(client, id)).isEqualTo("Đã xóa");
  }

  @Test
  void withoutAnyNameTheLabelIsTheIdWithAHash() {
    var client = loggedInClient();
    long id = insert("timeline_event", 42, "UPDATE", "{\"year\":2000}", "{\"year\":2001}");

    assertThat(label(client, id)).isEqualTo("#42");
  }

  @Test
  void theDetailReturnsBeforeAndAfterAsJsonObjects() {
    var client = loggedInClient();
    long id = createTimeline(client, "Bản gốc");
    client.put("/admin/timeline/" + id, timeline("Bản sửa"));
    long line = entryOf(client, "timeline_event", id, "UPDATE").path("id").asLong();

    JsonNode detail = ApiClient.json(client.get("/admin/audit/" + line));

    assertThat(detail.path("id").asLong()).isEqualTo(line);
    assertThat(detail.path("entityType").asString()).isEqualTo("timeline_event");
    assertThat(detail.path("entityId").asLong()).isEqualTo(id);
    assertThat(detail.path("action").asString()).isEqualTo("UPDATE");
    assertThat(detail.path("userDisplayName").asString()).isEqualTo("Tester");
    assertThat(detail.path("before").isObject()).isTrue();
    assertThat(detail.path("after").isObject()).isTrue();
    assertThat(detail.path("before").path("title").path("vi").asString()).isEqualTo("Bản gốc");
    assertThat(detail.path("after").path("title").path("vi").asString()).isEqualTo("Bản sửa");
  }

  @Test
  void aCreateLineHasNullBefore() {
    var client = loggedInClient();
    long id = createTimeline(client, "Mốc mới");
    long line = entryOf(client, "timeline_event", id, "CREATE").path("id").asLong();

    JsonNode detail = ApiClient.json(client.get("/admin/audit/" + line));

    assertThat(detail.path("before").isNull()).isTrue();
    assertThat(detail.path("after").isObject()).isTrue();
  }

  @Test
  void theDetailOfAnAppUserLineNeverShowsSecrets() {
    var client = loggedInClient();
    String snapshot =
        "{\"id\":9,\"email\":\"a@b.c\",\"displayName\":\"Bà Hai\","
            + "\"passwordHash\":\"hash-value\",\"totpSecret\":\"ABCDEF\"}";
    long id = insert("app_user", 9, "UPDATE", snapshot, snapshot);

    var response = client.get("/admin/audit/" + id);

    assertThat(response.getStatusCode().value()).isEqualTo(200);
    assertThat(response.getBody()).doesNotContain("passwordHash").doesNotContain("totpSecret");
    assertThat(ApiClient.json(response).path("after").path("displayName").asString())
        .isEqualTo("Bà Hai");
  }

  @Test
  void anUnknownIdAnswers404InVietnamese() {
    var client = loggedInClient();

    var response = client.get("/admin/audit/999999");

    assertThat(response.getStatusCode().value()).isEqualTo(404);
    assertThat(ApiClient.json(response).path("detail").asString())
        .isEqualTo("Không tìm thấy dòng lịch sử.");
  }

  // ---- helpers -------------------------------------------------------------------------------

  private static String setting(long id, String key) {
    return "{\"id\":" + id + ",\"key\":\"" + key + "\",\"value\":{}}";
  }

  private boolean restorable(ApiClient client, long auditId) {
    return ApiClient.json(client.get("/admin/audit/" + auditId)).path("restorable").asBoolean();
  }

  private String label(ApiClient client, long auditId) {
    return ApiClient.json(client.get("/admin/audit/" + auditId)).path("label").asString();
  }

  private String labelOf(ApiClient client, String type, long entityId, String before, String after) {
    return label(client, insert(type, entityId, "UPDATE", before, after));
  }

  private JsonNode entryOf(ApiClient client, String type, long entityId, String action) {
    JsonNode list =
        ApiClient.json(client.get("/admin/audit?entityType=" + type + "&entityId=" + entityId));
    for (JsonNode entry : list) {
      if (action.equals(entry.path("action").asString())) {
        return entry;
      }
    }
    throw new AssertionError("No " + action + " line for " + type + " " + entityId);
  }

  private long insert(String type, long entityId, String action, String before, String after) {
    return jdbc.queryForObject(
        "insert into audit_log (entity_type, entity_id, action, before_json, after_json)"
            + " values (?, ?, ?, ?::jsonb, ?::jsonb) returning id",
        Long.class,
        type,
        entityId,
        action,
        before,
        after);
  }

  private long createTimeline(ApiClient client, String titleVi) {
    var response = client.post("/admin/timeline", timeline(titleVi));
    assertThat(response.getStatusCode().value()).isEqualTo(201);
    return ApiClient.json(response).path("id").asLong();
  }

  private static Map<String, Object> timeline(String titleVi) {
    var body = new LinkedHashMap<String, Object>();
    body.put("year", 1998);
    body.put("title", text(titleVi, "Title"));
    body.put("description", text("Mô tả", "Description"));
    return body;
  }

  private static Map<String, Object> text(String vi, String en) {
    var text = new LinkedHashMap<String, Object>();
    text.put("vi", vi);
    text.put("en", en);
    return text;
  }
}
