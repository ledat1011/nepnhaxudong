package vn.nepnhaxudong.audit;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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

class AuditRestoreTest extends AuthTestSupport {

  private static final String CREATE_MESSAGE =
      "Không thể khôi phục bản tạo mới; hãy xóa nội dung.";
  private static final String MEDIA_GONE = "Không thể khôi phục: ảnh đã bị xóa.";
  private static final String NOT_FOUND = "Không tìm thấy dòng lịch sử.";
  private static final String BAD_SNAPSHOT =
      "Không thể khôi phục: dữ liệu lịch sử không hợp lệ.";

  @Autowired JdbcTemplate jdbc;
  @Autowired MediaRepository mediaRepository;

  @BeforeEach
  void emptyTables() {
    jdbc.update("delete from audit_log");
    jdbc.update("delete from product");
    jdbc.update("delete from timeline_event");
    jdbc.update("delete from press_mention");
    jdbc.update("delete from media");
  }

  // ---- timeline update -----------------------------------------------------------------------

  @Test
  void restoringTheFirstEditBringsBackTheOriginalTitleAndWritesARestoreRow() {
    var client = loggedInClient();
    long id = createTimeline(client, 1998, "Bản gốc", "Original");
    client.put("/admin/timeline/" + id, timeline(1998, "Sửa lần một", "Edit one"));
    client.put("/admin/timeline/" + id, timeline(1999, "Sửa lần hai", "Edit two"));
    long firstEdit = auditId("timeline_event", id, "UPDATE", 0);

    var response = client.post("/admin/audit/" + firstEdit + "/restore", Map.of());

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    JsonNode json = ApiClient.json(client.get("/admin/timeline/" + id));
    assertThat(json.path("title").path("vi").asString()).isEqualTo("Bản gốc");
    assertThat(json.path("title").path("en").asString()).isEqualTo("Original");
    assertThat(json.path("year").asInt()).isEqualTo(1998);
    var restoreRows =
        jdbc.queryForList(
            "select before_json ->> 'year' as before_year, after_json ->> 'year' as after_year,"
                + " user_id from audit_log where action = 'RESTORE' and entity_id = ?",
            id);
    assertThat(restoreRows).hasSize(1);
    assertThat(restoreRows.get(0).get("before_year")).isEqualTo("1999");
    assertThat(restoreRows.get(0).get("after_year")).isEqualTo("1998");
    assertThat(restoreRows.get(0).get("user_id"))
        .isEqualTo(jdbc.queryForObject("select id from app_user", Long.class));
  }

  @Test
  void restoringAnEditOfAnEventThatWasDeletedLaterBringsItBackWithTheOldIdAndBeforeState() {
    var client = loggedInClient();
    long id = createTimeline(client, 2000, "A", "A en");
    client.put("/admin/timeline/" + id, timeline(2001, "B", "B en"));
    client.delete("/admin/timeline/" + id);
    long edit = auditId("timeline_event", id, "UPDATE", 0);

    var response = client.post("/admin/audit/" + edit + "/restore", Map.of());

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    JsonNode json = ApiClient.json(client.get("/admin/timeline/" + id));
    assertThat(json.path("id").asLong()).isEqualTo(id);
    assertThat(json.path("year").asInt()).isEqualTo(2000);
    assertThat(json.path("title").path("vi").asString()).isEqualTo("A");
    assertThat(json.path("title").path("en").asString()).isEqualTo("A en");
    var restoreRow =
        jdbc.queryForMap(
            "select before_json is null as no_before, after_json ->> 'year' as after_year"
                + " from audit_log where action = 'RESTORE'");
    assertThat(restoreRow.get("no_before")).isEqualTo(true);
    assertThat(restoreRow.get("after_year")).isEqualTo("2000");
  }

  // ---- delete and restore --------------------------------------------------------------------

  @Test
  void aDeletedPressMentionComesBackWithTheSameIdAndBothTranslations() {
    var client = loggedInClient();
    long id = createPress(client, "https://baochi.example/a", "Gạo nếp 🌾", "Sticky rice");
    var before = ApiClient.json(client.get("/admin/press/" + id));
    client.delete("/admin/press/" + id);
    assertThat(count("press_mention")).isZero();
    long deleteRow = auditId("press_mention", id, "DELETE", 0);

    var response = client.post("/admin/audit/" + deleteRow + "/restore", Map.of());

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    JsonNode after = ApiClient.json(client.get("/admin/press/" + id));
    assertThat(after.path("id").asLong()).isEqualTo(id);
    assertThat(after.path("title").path("vi").asString()).isEqualTo("Gạo nếp 🌾");
    assertThat(after.path("title").path("en").asString()).isEqualTo("Sticky rice");
    assertThat(after.path("url").asString()).isEqualTo(before.path("url").asString());
    assertThat(after.path("publishedOn").asString()).isEqualTo("2024-05-01");
    assertThat(count("press_mention_translation where press_mention_id = " + id)).isEqualTo(2);
    assertThat(count("press_mention")).isEqualTo(1);
    var restoreRow =
        jdbc.queryForMap(
            "select before_json is null as no_before, after_json ->> 'id' as after_id"
                + " from audit_log where action = 'RESTORE'");
    assertThat(restoreRow.get("no_before")).isEqualTo(true);
    assertThat(restoreRow.get("after_id")).isEqualTo(Long.toString(id));
  }

  @Test
  void aNewRowAfterARestoreStillGetsAFreshId() {
    var client = loggedInClient();
    long first = createPress(client, "https://a.example/1", "Một", "One");
    long second = createPress(client, "https://a.example/2", "Hai", "Two");
    client.delete("/admin/press/" + first);
    client.post("/admin/audit/" + auditId("press_mention", first, "DELETE", 0) + "/restore", Map.of());

    long third = createPress(client, "https://a.example/3", "Ba", "Three");

    assertThat(third).isGreaterThan(second);
    assertThat(count("press_mention")).isEqualTo(3);
  }

  @Test
  void restoringADeleteWhileTheContentExistsOverwritesItWithTheBeforeState() {
    var client = loggedInClient();
    long id = createPress(client, "https://a.example/1", "Một", "One");
    client.delete("/admin/press/" + id);
    long deleteRow = auditId("press_mention", id, "DELETE", 0);
    assertThat(
            client.post("/admin/audit/" + deleteRow + "/restore", Map.of()).getStatusCode().value())
        .isEqualTo(204);
    var edited = new LinkedHashMap<String, Object>();
    edited.put("url", "https://a.example/changed");
    edited.put("sourceName", "Báo khác");
    edited.put("title", text("Đã sửa", "Edited"));
    client.put("/admin/press/" + id, edited);

    var again = client.post("/admin/audit/" + deleteRow + "/restore", Map.of());

    assertThat(again.getStatusCode().value()).isEqualTo(204);
    JsonNode json = ApiClient.json(client.get("/admin/press/" + id));
    assertThat(json.path("url").asString()).isEqualTo("https://a.example/1");
    assertThat(json.path("title").path("vi").asString()).isEqualTo("Một");
    assertThat(count("press_mention")).isEqualTo(1);
    assertThat(count("press_mention_translation where press_mention_id = " + id)).isEqualTo(2);
    var lastRestore =
        jdbc.queryForMap(
            "select before_json -> 'title' ->> 'vi' as before_title,"
                + " after_json -> 'title' ->> 'vi' as after_title from audit_log"
                + " where action = 'RESTORE' order by id desc limit 1");
    assertThat(lastRestore.get("before_title")).isEqualTo("Đã sửa");
    assertThat(lastRestore.get("after_title")).isEqualTo("Một");
  }

  // ---- product (children and images) ---------------------------------------------------------

  @Test
  void aDeletedProductComesBackWithItsPackagingsTranslationsAndImages() {
    var client = loggedInClient();
    long imageOne = newMedia("one.webp");
    long imageTwo = newMedia("two.webp");
    long id = createProduct(client, "Nếp cái hoa vàng", List.of(imageTwo, imageOne));
    var before = ApiClient.json(client.get("/admin/products/" + id));
    client.delete("/admin/products/" + id);
    assertThat(count("product")).isZero();
    long deleteRow = auditId("product", id, "DELETE", 0);

    var response = client.post("/admin/audit/" + deleteRow + "/restore", Map.of());

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    JsonNode after = ApiClient.json(client.get("/admin/products/" + id));
    assertThat(after.path("id").asLong()).isEqualTo(id);
    assertThat(after.path("name")).isEqualTo(before.path("name"));
    assertThat(after.path("description")).isEqualTo(before.path("description"));
    assertThat(after.path("features")).isEqualTo(before.path("features"));
    assertThat(after.path("cookingTips")).isEqualTo(before.path("cookingTips"));
    assertThat(after.path("packagings")).isEqualTo(before.path("packagings"));
    assertThat(after.path("mediaIds")).isEqualTo(before.path("mediaIds"));
    assertThat(after.path("mediaIds").get(0).asLong()).isEqualTo(imageTwo);
    assertThat(count("packaging where product_id = " + id)).isEqualTo(2);
    assertThat(count("product_translation where product_id = " + id)).isEqualTo(2);
    assertThat(count("product_media where product_id = " + id)).isEqualTo(2);
  }

  @Test
  void restoringAProductThatReferencesADeletedImageIsRefusedAndChangesNothing() {
    var client = loggedInClient();
    long image = newMedia("gone.webp");
    long id = createProduct(client, "Sản phẩm", List.of(image));
    client.delete("/admin/products/" + id);
    long deleteRow = auditId("product", id, "DELETE", 0);
    jdbc.update("delete from media where id = ?", image);
    int auditRows = count("audit_log");

    var response = client.post("/admin/audit/" + deleteRow + "/restore", Map.of());

    assertDetail(response, 409, MEDIA_GONE);
    assertThat(count("product")).isZero();
    assertThat(count("product_translation")).isZero();
    assertThat(count("audit_log")).isEqualTo(auditRows);
  }

  @Test
  void restoringAnEditedProductPutsItsChildrenBack() {
    var client = loggedInClient();
    long image = newMedia("a.webp");
    long id = createProduct(client, "Tên cũ", List.of(image));
    var original = ApiClient.json(client.get("/admin/products/" + id));
    var changed = product("Tên mới", List.of());
    changed.put("packagings", List.of(packaging(500, 1L)));
    client.put("/admin/products/" + id, changed);
    long edit = auditId("product", id, "UPDATE", 0);

    var response = client.post("/admin/audit/" + edit + "/restore", Map.of());

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    JsonNode after = ApiClient.json(client.get("/admin/products/" + id));
    assertThat(after.path("name")).isEqualTo(original.path("name"));
    assertThat(after.path("packagings")).isEqualTo(original.path("packagings"));
    assertThat(after.path("mediaIds")).isEqualTo(original.path("mediaIds"));
  }

  // ---- timeline images -----------------------------------------------------------------------

  @Test
  void aDeletedEventComesBackWithItsImagesInOrder() {
    var client = loggedInClient();
    long one = newMedia("one.webp");
    long two = newMedia("two.webp");
    var body = timeline(2021, "Giấy chứng nhận", "Certificate");
    body.put("mediaIds", List.of(two, one));
    long id = ApiClient.json(client.post("/admin/timeline", body)).path("id").asLong();
    client.delete("/admin/timeline/" + id);
    assertThat(count("timeline_event_media")).isZero();
    long deleteRow = auditId("timeline_event", id, "DELETE", 0);

    var response = client.post("/admin/audit/" + deleteRow + "/restore", Map.of());

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    assertThat(timelineMediaIds(ApiClient.json(client.get("/admin/timeline/" + id))))
        .containsExactly(two, one);
    assertThat(storedTimelineMediaIds(id)).containsExactly(two, one);
  }

  @Test
  void restoringAnEditPutsTheOldImageListBack() {
    var client = loggedInClient();
    long a = newMedia("a.webp");
    long b = newMedia("b.webp");
    long c = newMedia("c.webp");
    var original = timeline(2021, "A", "A");
    original.put("mediaIds", List.of(a, b));
    long id = ApiClient.json(client.post("/admin/timeline", original)).path("id").asLong();
    var edited = timeline(2021, "A", "A");
    edited.put("mediaIds", List.of(c, b));
    client.put("/admin/timeline/" + id, edited);
    long edit = auditId("timeline_event", id, "UPDATE", 0);

    var response = client.post("/admin/audit/" + edit + "/restore", Map.of());

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    assertThat(storedTimelineMediaIds(id)).containsExactly(a, b);
  }

  @Test
  void anOldSnapshotWithOneImageIdIsRestoredAsAListOfOne() {
    var client = loggedInClient();
    long image = newMedia("old.webp");
    long id = createTimeline(client, 2000, "A", "A");
    client.delete("/admin/timeline/" + id);
    long deleteRow = auditId("timeline_event", id, "DELETE", 0);
    jdbc.update(
        "update audit_log set before_json = ?::jsonb where id = ?",
        oldTimelineSnapshot(id, Long.toString(image)),
        deleteRow);

    var response = client.post("/admin/audit/" + deleteRow + "/restore", Map.of());

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    JsonNode json = ApiClient.json(client.get("/admin/timeline/" + id));
    assertThat(json.path("title").path("vi").asString()).isEqualTo("Cũ");
    assertThat(timelineMediaIds(json)).containsExactly(image);
    assertThat(storedTimelineMediaIds(id)).containsExactly(image);
  }

  @Test
  void anOldSnapshotWithANullImageIdIsRestoredWithoutImages() {
    var client = loggedInClient();
    long image = newMedia("now.webp");
    var body = timeline(2000, "A", "A");
    body.put("mediaIds", List.of(image));
    long id = ApiClient.json(client.post("/admin/timeline", body)).path("id").asLong();
    client.put("/admin/timeline/" + id, body);
    long edit = auditId("timeline_event", id, "UPDATE", 0);
    jdbc.update(
        "update audit_log set before_json = ?::jsonb where id = ?",
        oldTimelineSnapshot(id, "null"),
        edit);

    var response = client.post("/admin/audit/" + edit + "/restore", Map.of());

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    JsonNode json = ApiClient.json(client.get("/admin/timeline/" + id));
    assertThat(json.path("title").path("vi").asString()).isEqualTo("Cũ");
    assertThat(json.path("mediaIds").isArray()).isTrue();
    assertThat(json.path("mediaIds")).isEmpty();
    assertThat(count("timeline_event_media")).isZero();
  }

  @Test
  void restoringAnEventWhoseImageWasDeletedIsRefusedAndChangesNothing() {
    var client = loggedInClient();
    long kept = newMedia("kept.webp");
    long gone = newMedia("gone.webp");
    var body = timeline(2000, "A", "A");
    body.put("mediaIds", List.of(kept, gone));
    long id = ApiClient.json(client.post("/admin/timeline", body)).path("id").asLong();
    client.delete("/admin/timeline/" + id);
    long deleteRow = auditId("timeline_event", id, "DELETE", 0);
    jdbc.update("delete from media where id = ?", gone);
    int auditRows = count("audit_log");

    var response = client.post("/admin/audit/" + deleteRow + "/restore", Map.of());

    assertDetail(response, 409, MEDIA_GONE);
    assertThat(count("timeline_event")).isZero();
    assertThat(count("audit_log")).isEqualTo(auditRows);
  }

  @Test
  void aTimelineSnapshotWithADamagedImageListIsRefused() {
    var client = loggedInClient();
    long a = newMedia("a.webp");
    long id = createTimeline(client, 2000, "A", "A");
    client.delete("/admin/timeline/" + id);
    long deleteRow = auditId("timeline_event", id, "DELETE", 0);
    String start =
        "{\"id\":" + id + ",\"year\":2000,\"sortOrder\":0,\"missingEn\":false,"
            + "\"title\":{\"vi\":\"A\",\"en\":null},\"mediaIds\":";
    var damaged =
        List.of(
            start + "[null]}",
            start + "[" + a + "," + a + "]}",
            start + "[" + a + "," + a + "," + a + "," + a + "]}");
    for (String snapshot : damaged) {
      jdbc.update("update audit_log set before_json = ?::jsonb where id = ?", snapshot, deleteRow);

      assertDetail(
          client.post("/admin/audit/" + deleteRow + "/restore", Map.of()), 409, BAD_SNAPSHOT);
      assertThat(count("timeline_event")).isZero();
    }
  }

  // ---- refusals ------------------------------------------------------------------------------

  @Test
  void restoringACreateRowIsRefusedWithTheExactMessage() {
    var client = loggedInClient();
    long id = createTimeline(client, 2000, "A", "A");
    long createRow = auditId("timeline_event", id, "CREATE", 0);

    var response = client.post("/admin/audit/" + createRow + "/restore", Map.of());

    assertDetail(response, 409, CREATE_MESSAGE);
    assertThat(count("audit_log where action = 'RESTORE'")).isZero();
    assertThat(count("timeline_event")).isEqualTo(1);
  }

  @Test
  void anUnknownAuditRowIsNotFound() {
    var client = loggedInClient();

    assertDetail(client.post("/admin/audit/987654/restore", Map.of()), 404, NOT_FOUND);
  }

  @Test
  void anEntityTypeWithoutAHandlerIsRefusedNotAnError() {
    var client = loggedInClient();
    long row =
        insertAudit("unknown_type", 5, "UPDATE", "{\"id\":5}", "{\"id\":5}", null);

    var response = client.post("/admin/audit/" + row + "/restore", Map.of());

    assertThat(response.getStatusCode().value()).isEqualTo(409);
  }

  @Test
  void aSnapshotThatIsDamagedIsRefusedWith409NotAnError() {
    var client = loggedInClient();
    long image = newMedia("x.webp");
    long id = createProduct(client, "Tên", List.of(image));
    client.delete("/admin/products/" + id);
    long deleteRow = auditId("product", id, "DELETE", 0);

    String nullImageId =
        "{\"id\":" + id + ",\"name\":{\"vi\":\"Tên\",\"en\":null},"
            + "\"features\":{\"vi\":[\"Dẻo\"],\"en\":[]},\"packagings\":[],\"mediaIds\":[null]}";
    String nullPackaging =
        "{\"id\":" + id + ",\"name\":{\"vi\":\"Tên\",\"en\":null},"
            + "\"features\":{\"vi\":[\"Dẻo\"],\"en\":[]},\"packagings\":[null],\"mediaIds\":[]}";
    String noName = "{\"id\":" + id + ",\"mediaIds\":[]}";
    String notJson = "\"just a string\"";
    for (String damaged : List.of(nullImageId, nullPackaging, noName, notJson)) {
      jdbc.update("update audit_log set before_json = ?::jsonb where id = ?", damaged, deleteRow);

      var response = client.post("/admin/audit/" + deleteRow + "/restore", Map.of());

      assertDetail(response, 409, BAD_SNAPSHOT);
      assertThat(count("product")).isZero();
    }
  }

  @Test
  void aSnapshotThatLacksWholePartsIsRefusedWith409NotAnError() {
    var client = loggedInClient();
    long productId = createProduct(client, "Tên", List.of());
    client.delete("/admin/products/" + productId);
    long productRow = auditId("product", productId, "DELETE", 0);
    long timelineId = createTimeline(client, 2000, "A", "A");
    client.delete("/admin/timeline/" + timelineId);
    long timelineRow = auditId("timeline_event", timelineId, "DELETE", 0);
    long pressId = createPress(client, "https://a.example/1", "P", "P");
    client.delete("/admin/press/" + pressId);
    long pressRow = auditId("press_mention", pressId, "DELETE", 0);

    var productSnapshots =
        List.of(
            "{\"id\":" + productId + ",\"sortOrder\":0,\"missingEn\":false,\"showPrice\":false,\"name\":{\"vi\":\"Tên\"}}",
            "{\"id\":" + productId + ",\"sortOrder\":0,\"missingEn\":false,\"showPrice\":false,\"name\":null,"
                + "\"features\":{\"vi\":[\"Dẻo\"]}}",
            "{\"id\":" + productId + ",\"sortOrder\":0,\"missingEn\":false,\"showPrice\":false,"
                + "\"name\":{\"vi\":\"Tên\"},\"features\":null,\"description\":null,"
                + "\"cookingTips\":null,\"packagings\":null,\"mediaIds\":null}",
            "{\"id\":" + productId + ",\"sortOrder\":0,\"missingEn\":false,\"showPrice\":false,"
                + "\"name\":{\"vi\":\"Tên\"},\"features\":{\"vi\":null,\"en\":null}}");
    for (String damaged : productSnapshots) {
      jdbc.update("update audit_log set before_json = ?::jsonb where id = ?", damaged, productRow);
      assertDetail(
          client.post("/admin/audit/" + productRow + "/restore", Map.of()), 409, BAD_SNAPSHOT);
    }
    var timelineSnapshots =
        List.of(
            "{\"id\":" + timelineId + ",\"year\":2000,\"sortOrder\":0,\"missingEn\":false}",
            "{\"id\":" + timelineId + ",\"year\":2000,\"sortOrder\":0,\"missingEn\":false,\"title\":{}}",
            "{\"id\":" + timelineId + ",\"sortOrder\":0,\"missingEn\":false,\"title\":{\"vi\":\"A\"}}");
    for (String damaged : timelineSnapshots) {
      jdbc.update("update audit_log set before_json = ?::jsonb where id = ?", damaged, timelineRow);
      assertDetail(
          client.post("/admin/audit/" + timelineRow + "/restore", Map.of()), 409, BAD_SNAPSHOT);
    }
    var pressSnapshots =
        List.of(
            "{\"id\":" + pressId + ",\"sortOrder\":0,\"missingEn\":false}",
            "{\"id\":" + pressId + ",\"url\":\"https://a.example\",\"sourceName\":\"B\","
                + "\"sortOrder\":0,\"missingEn\":false}",
            "{\"id\":" + pressId + ",\"url\":\"javascript:x\",\"sourceName\":\"B\","
                + "\"sortOrder\":0,\"missingEn\":false,\"title\":{\"vi\":\"T\"}}");
    for (String damaged : pressSnapshots) {
      jdbc.update("update audit_log set before_json = ?::jsonb where id = ?", damaged, pressRow);
      assertDetail(
          client.post("/admin/audit/" + pressRow + "/restore", Map.of()), 409, BAD_SNAPSHOT);
    }

    assertThat(count("product")).isZero();
    assertThat(count("timeline_event")).isZero();
    assertThat(count("press_mention")).isZero();
  }

  @Test
  void contentWhoseVietnameseRowIsMissingIsRefusedWith409NotAnError() {
    var client = loggedInClient();
    long timelineId = createTimeline(client, 2000, "A", "A");
    client.put("/admin/timeline/" + timelineId, timeline(2001, "B", "B"));
    long timelineRow = auditId("timeline_event", timelineId, "UPDATE", 0);
    jdbc.update(
        "delete from timeline_event_translation where timeline_event_id = ? and lang = 'vi'",
        timelineId);
    long pressId = createPress(client, "https://a.example/1", "P", "P");
    client.put(
        "/admin/press/" + pressId,
        Map.of("url", "https://a.example/2", "sourceName", "B", "title", text("Q", "Q")));
    long pressRow = auditId("press_mention", pressId, "UPDATE", 0);
    jdbc.update(
        "delete from press_mention_translation where press_mention_id = ? and lang = 'vi'",
        pressId);

    assertDetail(
        client.post("/admin/audit/" + timelineRow + "/restore", Map.of()), 409, BAD_SNAPSHOT);
    assertDetail(client.post("/admin/audit/" + pressRow + "/restore", Map.of()), 409, BAD_SNAPSHOT);
  }

  @Test
  void aSnapshotWithOnlyTheRequiredPartsIsRestoredNotRefused() {
    var client = loggedInClient();
    long productId = createProduct(client, "Tên", List.of());
    client.delete("/admin/products/" + productId);
    long productRow = auditId("product", productId, "DELETE", 0);
    long timelineId = createTimeline(client, 2000, "A", "A");
    client.delete("/admin/timeline/" + timelineId);
    long timelineRow = auditId("timeline_event", timelineId, "DELETE", 0);
    jdbc.update(
        "update audit_log set before_json = ?::jsonb where id = ?",
        "{\"id\":" + productId + ",\"sortOrder\":0,\"missingEn\":false,\"showPrice\":false,"
            + "\"name\":{\"vi\":\"Tên\"},\"features\":{\"vi\":[\"Dẻo\"]}}",
        productRow);
    jdbc.update(
        "update audit_log set before_json = ?::jsonb where id = ?",
        "{\"id\":" + timelineId + ",\"year\":2000,\"sortOrder\":0,\"missingEn\":false,\"title\":{\"vi\":\"A\"}}",
        timelineRow);

    assertThat(client.post("/admin/audit/" + productRow + "/restore", Map.of()).getStatusCode().value())
        .isEqualTo(204);
    assertThat(client.post("/admin/audit/" + timelineRow + "/restore", Map.of()).getStatusCode().value())
        .isEqualTo(204);
    assertThat(ApiClient.json(client.get("/admin/products/" + productId)).path("name").path("vi").asString())
        .isEqualTo("Tên");
  }

  @Test
  void aSnapshotWithADifferentIdIsNeverInserted() {
    var client = loggedInClient();
    long id = createTimeline(client, 2000, "A", "A");
    client.delete("/admin/timeline/" + id);
    long deleteRow = auditId("timeline_event", id, "DELETE", 0);
    long otherId = id + 1000;
    jdbc.update(
        "update audit_log set before_json = jsonb_set(before_json, '{id}', to_jsonb(?::bigint)) where id = ?",
        otherId,
        deleteRow);

    var response = client.post("/admin/audit/" + deleteRow + "/restore", Map.of());

    assertDetail(response, 409, BAD_SNAPSHOT);
    assertThat(count("timeline_event")).isZero();
  }

  @Test
  void restoreNeedsALoginAndTheCsrfToken() {
    var visitor = newClient();
    visitor.fetchCsrf();
    assertThat(visitor.post("/admin/audit/1/restore", Map.of()).getStatusCode().value())
        .isEqualTo(401);
    assertThat(visitor.get("/admin/audit").getStatusCode().value()).isEqualTo(401);

    var noCsrf = newClient();
    createUser("owner@example.com", "correct-password-1", false);
    login(noCsrf, "owner@example.com", "correct-password-1");
    assertThat(noCsrf.post("/admin/audit/1/restore", Map.of()).getStatusCode().value())
        .isEqualTo(403);
  }

  // ---- the list ------------------------------------------------------------------------------

  @Test
  void theListShowsTheNewestRowFirstWithTheUserName() {
    var client = loggedInClient();
    long id = createTimeline(client, 2000, "A", "A");
    client.put("/admin/timeline/" + id, timeline(2001, "B", "B"));
    client.delete("/admin/timeline/" + id);

    JsonNode rows = ApiClient.json(client.get("/admin/audit"));

    assertThat(rows).hasSize(3);
    assertThat(rows.get(0).path("action").asString()).isEqualTo("DELETE");
    assertThat(rows.get(1).path("action").asString()).isEqualTo("UPDATE");
    assertThat(rows.get(2).path("action").asString()).isEqualTo("CREATE");
    JsonNode first = rows.get(0);
    assertThat(first.path("id").asLong()).isPositive();
    assertThat(first.path("userDisplayName").asString()).isEqualTo("Tester");
    assertThat(first.path("entityType").asString()).isEqualTo("timeline_event");
    assertThat(first.path("entityId").asLong()).isEqualTo(id);
    assertThat(first.path("createdAt").asString()).isNotBlank();
    assertThat(first.has("beforeJson")).isFalse();
    assertThat(first.has("afterJson")).isFalse();
  }

  @Test
  void theListCanBeFilteredByEntityTypeAndEntityId() {
    var client = loggedInClient();
    long timelineId = createTimeline(client, 2000, "A", "A");
    long otherTimelineId = createTimeline(client, 2001, "B", "B");
    long pressId = createPress(client, "https://a.example/1", "P", "P");

    assertThat(ApiClient.json(client.get("/admin/audit?entityType=press_mention"))).hasSize(1);
    assertThat(ApiClient.json(client.get("/admin/audit?entityType=timeline_event"))).hasSize(2);
    var one =
        ApiClient.json(
            client.get("/admin/audit?entityType=timeline_event&entityId=" + timelineId));
    assertThat(one).hasSize(1);
    assertThat(one.get(0).path("entityId").asLong()).isEqualTo(timelineId);
    assertThat(ApiClient.json(client.get("/admin/audit?entityId=" + pressId))).hasSize(1);
    assertThat(ApiClient.json(client.get("/admin/audit?entityId=" + otherTimelineId))).hasSize(1);
    assertThat(ApiClient.json(client.get("/admin/audit?entityType=story"))).isEmpty();
  }

  @Test
  void theListHas50RowsPerPageAndPagesStartAtZero() {
    var client = loggedInClient();
    for (int i = 0; i < 55; i++) {
      insertAudit("timeline_event", i + 1, "UPDATE", null, null, null);
    }

    JsonNode first = ApiClient.json(client.get("/admin/audit"));
    JsonNode page0 = ApiClient.json(client.get("/admin/audit?page=0"));
    JsonNode page1 = ApiClient.json(client.get("/admin/audit?page=1"));
    JsonNode page2 = ApiClient.json(client.get("/admin/audit?page=2"));

    assertThat(first).hasSize(50);
    assertThat(page0).isEqualTo(first);
    assertThat(page1).hasSize(5);
    assertThat(page2).isEmpty();
    assertThat(page1.get(0).path("id").asLong()).isLessThan(page0.get(49).path("id").asLong());
    assertThat(client.get("/admin/audit?page=-1").getStatusCode().value()).isEqualTo(400);
  }

  @Test
  void rowsWithTheSameTimeAreOrderedByIdDescending() {
    var client = loggedInClient();
    for (int i = 0; i < 3; i++) {
      jdbc.update(
          "insert into audit_log (entity_type, entity_id, action, created_at)"
              + " values ('timeline_event', ?, 'UPDATE', '2026-01-01T00:00:00Z')",
          i + 1);
    }

    JsonNode rows = ApiClient.json(client.get("/admin/audit"));

    var ids = new ArrayList<Long>();
    rows.forEach(r -> ids.add(r.path("id").asLong()));
    assertThat(ids).isSortedAccordingTo(java.util.Comparator.reverseOrder());
  }

  @Test
  void theUserNameIsNullWhenTheUserWasDeleted() {
    var client = loggedInClient();
    createTimeline(client, 2000, "A", "A");
    jdbc.update("update audit_log set user_id = null");

    JsonNode rows = ApiClient.json(client.get("/admin/audit"));

    assertThat(rows).hasSize(1);
    assertThat(rows.get(0).has("userDisplayName")).isTrue();
    assertThat(rows.get(0).path("userDisplayName").isNull()).isTrue();
  }

  @Test
  void aStoredSnapshotIsRealJsonNotAQuotedString() {
    var client = loggedInClient();
    createTimeline(client, 2000, "A", "A");

    String type =
        jdbc.queryForObject(
            "select jsonb_typeof(after_json) from audit_log where action = 'CREATE'", String.class);
    boolean beforeIsNull =
        jdbc.queryForObject(
            "select before_json is null from audit_log where action = 'CREATE'", Boolean.class);

    assertThat(type).isEqualTo("object");
    assertThat(beforeIsNull).isTrue();
  }

  // ---- helpers -------------------------------------------------------------------------------

  private long auditId(String entityType, long entityId, String action, int index) {
    return jdbc.queryForList(
            "select id from audit_log where entity_type = ? and entity_id = ? and action = ?"
                + " order by id",
            Long.class,
            entityType,
            entityId,
            action)
        .get(index);
  }

  private long insertAudit(
      String type, long entityId, String action, String before, String after, Long userId) {
    return jdbc.queryForObject(
        "insert into audit_log (entity_type, entity_id, action, before_json, after_json, user_id)"
            + " values (?, ?, ?, ?::jsonb, ?::jsonb, ?) returning id",
        Long.class,
        type,
        entityId,
        action,
        before,
        after,
        userId);
  }

  private long createTimeline(ApiClient client, int year, String vi, String en) {
    var response = client.post("/admin/timeline", timeline(year, vi, en));
    assertThat(response.getStatusCode().value()).isEqualTo(201);
    return ApiClient.json(response).path("id").asLong();
  }

  private long createPress(ApiClient client, String url, String vi, String en) {
    var body = new LinkedHashMap<String, Object>();
    body.put("url", url);
    body.put("sourceName", "Báo Hải Dương");
    body.put("publishedOn", "2024-05-01");
    body.put("title", text(vi, en));
    var response = client.post("/admin/press", body);
    assertThat(response.getStatusCode().value()).isEqualTo(201);
    return ApiClient.json(response).path("id").asLong();
  }

  private long createProduct(ApiClient client, String nameVi, List<Long> mediaIds) {
    var response = client.post("/admin/products", product(nameVi, mediaIds));
    assertThat(response.getStatusCode().value()).isEqualTo(201);
    return ApiClient.json(response).path("id").asLong();
  }

  /** A timeline snapshot as it was written before the image list: one {@code mediaId} field. */
  private static String oldTimelineSnapshot(long id, String mediaIdJson) {
    return "{\"id\":" + id + ",\"year\":1999,\"sortOrder\":0,"
        + "\"title\":{\"vi\":\"Cũ\",\"en\":\"Old\"},"
        + "\"description\":{\"vi\":null,\"en\":null},"
        + "\"mediaId\":" + mediaIdJson + ",\"missingEn\":false}";
  }

  private static List<Long> timelineMediaIds(JsonNode event) {
    var ids = new ArrayList<Long>();
    for (JsonNode node : event.path("mediaIds")) {
      ids.add(node.asLong());
    }
    return ids;
  }

  private List<Long> storedTimelineMediaIds(long eventId) {
    return jdbc.queryForList(
        "select media_id from timeline_event_media where timeline_event_id = ? order by sort_order",
        Long.class,
        eventId);
  }

  private static Map<String, Object> timeline(int year, String vi, String en) {
    var body = new LinkedHashMap<String, Object>();
    body.put("year", year);
    body.put("title", text(vi, en));
    body.put("description", text("Mô tả " + vi, "Description " + en));
    return body;
  }

  private static Map<String, Object> product(String nameVi, List<Long> mediaIds) {
    var body = new LinkedHashMap<String, Object>();
    body.put("name", text(nameVi, "Yellow-flower sticky rice"));
    body.put("description", text("Hạt nếp dẻo thơm.", "Soft, fragrant grains."));
    body.put("features", Map.of("vi", List.of("Dẻo", "Thơm"), "en", List.of("Soft", "Fragrant")));
    body.put("cookingTips", text("Ngâm 8 tiếng.", "Soak for 8 hours."));
    body.put("packagings", List.of(packaging(1000, 90000L), packaging(2000, null)));
    body.put("mediaIds", mediaIds);
    return body;
  }

  private static Map<String, Object> packaging(int weightGrams, Long priceVnd) {
    var packaging = new LinkedHashMap<String, Object>();
    packaging.put("weightGrams", weightGrams);
    packaging.put("priceVnd", priceVnd);
    return packaging;
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
