package vn.nepnhaxudong.site;

import static org.assertj.core.api.Assertions.assertThat;

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

class SiteSettingsAdminTest extends AuthTestSupport {

  private static final String NOT_FOUND = "Không tìm thấy cài đặt.";

  @Autowired JdbcTemplate jdbc;

  @BeforeEach
  void emptyTables() {
    jdbc.update("delete from audit_log");
    jdbc.update("delete from site_setting");
  }

  // ---- access and keys -----------------------------------------------------------------------

  @Test
  void aVisitorWhoIsNotLoggedInIsRefused() {
    var client = newClient();

    assertThat(client.get("/admin/settings/contact").getStatusCode().value()).isEqualTo(401);
    assertThat(client.put("/admin/settings/contact", contact()).getStatusCode().value())
        .isIn(401, 403);
  }

  @Test
  void onlyTheKeysContactSocialAndBrandExist() {
    var client = loggedInClient();

    for (String key : List.of("other", "Contact", "contacts", "colors", "1")) {
      assertDetail(client.get("/admin/settings/" + key), 404, NOT_FOUND);
      assertDetail(client.put("/admin/settings/" + key, new LinkedHashMap<String, Object>()), 404, NOT_FOUND);
    }
    assertThat(count("site_setting")).isZero();
  }

  // ---- read and write ------------------------------------------------------------------------

  @Test
  void aKeyWithoutARowReadsAsTheEmptyShapeNotAs404() {
    var client = loggedInClient();

    JsonNode contact = ApiClient.json(client.get("/admin/settings/contact"));
    JsonNode social = ApiClient.json(client.get("/admin/settings/social"));
    JsonNode brand = ApiClient.json(client.get("/admin/settings/brand"));

    for (String field : List.of("phone", "zalo", "messenger", "mapUrl")) {
      assertThat(contact.has(field)).as(field).isTrue();
      assertThat(contact.path(field).isNull()).as(field).isTrue();
    }
    for (String field : List.of("address", "hours")) {
      assertThat(contact.path(field).path("vi").isNull()).as(field).isTrue();
      assertThat(contact.path(field).path("en").isNull()).as(field).isTrue();
    }
    for (String field : List.of("facebook", "youtube", "tiktok")) {
      assertThat(social.has(field)).as(field).isTrue();
      assertThat(social.path(field).isNull()).as(field).isTrue();
    }
    assertThat(brand.path("tagline").path("vi").isNull()).isTrue();
    assertThat(count("site_setting")).isZero();
  }

  @Test
  void aSavedContactReadsBackAndIsStoredAsAJsonObjectWithNullForMissingEnglish() {
    var client = loggedInClient();
    var body = contact();
    body.put("address", text("Số 1, Hải Dương", null));

    var saved = client.put("/admin/settings/contact", body);

    assertThat(saved.getStatusCode().value()).isEqualTo(200);
    JsonNode json = ApiClient.json(saved);
    assertThat(json.path("phone").asString()).isEqualTo("0000 000 000");
    assertThat(json.path("address").path("vi").asString()).isEqualTo("Số 1, Hải Dương");
    assertThat(json.path("address").path("en").isNull()).isTrue();
    assertThat(ApiClient.json(client.get("/admin/settings/contact"))).isEqualTo(json);
    assertThat(jdbc.queryForObject("select jsonb_typeof(value) from site_setting where key = 'contact'", String.class))
        .isEqualTo("object");
    assertThat(
            jdbc.queryForObject(
                "select jsonb_typeof(value -> 'address' -> 'en') from site_setting where key = 'contact'",
                String.class))
        .isEqualTo("null");
    assertThat(
            jdbc.queryForObject(
                "select jsonb_typeof(value -> 'zalo') from site_setting where key = 'contact'",
                String.class))
        .isEqualTo("null");
  }

  @Test
  void aSecondWriteChangesTheSameRow() {
    var client = loggedInClient();
    client.put("/admin/settings/contact", contact());
    long id = jdbc.queryForObject("select id from site_setting where key = 'contact'", Long.class);
    var changed = contact();
    changed.put("phone", "+84 912.345-678");

    var response = client.put("/admin/settings/contact", changed);

    assertThat(response.getStatusCode().value()).isEqualTo(200);
    assertThat(count("site_setting")).isEqualTo(1);
    assertThat(jdbc.queryForObject("select id from site_setting where key = 'contact'", Long.class))
        .isEqualTo(id);
    assertThat(ApiClient.json(client.get("/admin/settings/contact")).path("phone").asString())
        .isEqualTo("+84 912.345-678");
  }

  @Test
  void socialAndBrandCanBeSaved() {
    var client = loggedInClient();
    var social = new LinkedHashMap<String, Object>();
    social.put("facebook", "https://example.com/fb");
    social.put("youtube", "http://example.com/yt");
    social.put("tiktok", null);
    var brand = new LinkedHashMap<String, Object>();
    brand.put("tagline", text("Hạt gạo quê nhà", "Rice from home"));

    assertThat(client.put("/admin/settings/social", social).getStatusCode().value()).isEqualTo(200);
    assertThat(client.put("/admin/settings/brand", brand).getStatusCode().value()).isEqualTo(200);

    JsonNode readSocial = ApiClient.json(client.get("/admin/settings/social"));
    assertThat(readSocial.path("facebook").asString()).isEqualTo("https://example.com/fb");
    assertThat(readSocial.path("tiktok").isNull()).isTrue();
    JsonNode readBrand = ApiClient.json(client.get("/admin/settings/brand"));
    assertThat(readBrand.path("tagline").path("en").asString()).isEqualTo("Rice from home");
  }

  @Test
  void blankValuesAreStoredAsNullAndTextIsTrimmed() {
    var client = loggedInClient();
    var body = new LinkedHashMap<String, Object>();
    body.put("phone", "   ");
    body.put("zalo", " 0000000000 ");
    body.put("messenger", "");
    body.put("address", text("  ", " "));

    JsonNode json = ApiClient.json(client.put("/admin/settings/contact", body));

    assertThat(json.path("phone").isNull()).isTrue();
    assertThat(json.path("zalo").asString()).isEqualTo("0000000000");
    assertThat(json.path("messenger").isNull()).isTrue();
    assertThat(json.path("address").path("vi").isNull()).isTrue();
    assertThat(json.path("address").path("en").isNull()).isTrue();
  }

  // ---- validation ----------------------------------------------------------------------------

  @Test
  void aPhoneOrZaloMustBeShortAndMadeOfDigitsSpacesPlusDotAndDash() {
    var client = loggedInClient();

    for (String field : List.of("phone", "zalo")) {
      for (String bad :
          List.of("abc", "0912 345 67x", "(028) 123", "0912;345", "1".repeat(31), "09\n12")) {
        var body = new LinkedHashMap<String, Object>();
        body.put(field, bad);
        var response = client.put("/admin/settings/contact", body);
        assertThat(response.getStatusCode().value()).as(field + "=" + bad).isEqualTo(400);
        assertThat(ApiClient.json(response).path("detail").asString())
            .as(field + "=" + bad)
            .isNotBlank()
            .contains("tối đa 30 ký tự");
      }
      var good = new LinkedHashMap<String, Object>();
      good.put(field, "+84 912.345-678");
      assertThat(client.put("/admin/settings/contact", good).getStatusCode().value())
          .as(field)
          .isEqualTo(200);
    }
    var limit = new LinkedHashMap<String, Object>();
    limit.put("phone", "1".repeat(30));
    assertThat(client.put("/admin/settings/contact", limit).getStatusCode().value()).isEqualTo(200);
  }

  @Test
  void anAddressMustBeAWebAddressOfAtMost2000Characters() {
    var client = loggedInClient();
    String tooLong = "https://example.com/" + "a".repeat(2000);
    var bad =
        List.of(
            "javascript:alert(1)",
            "ftp://example.com/x",
            "example.com/page",
            "not a url",
            "https://",
            "//example.com",
            "https://exa mple.com",
            tooLong);

    for (String field : List.of("messenger", "mapUrl")) {
      for (String value : bad) {
        var body = new LinkedHashMap<String, Object>();
        body.put(field, value);
        var response = client.put("/admin/settings/contact", body);
        assertThat(response.getStatusCode().value()).as(field + "=" + value).isEqualTo(400);
        assertThat(ApiClient.json(response).path("detail").asString()).isNotBlank();
      }
    }
    for (String field : List.of("facebook", "youtube", "tiktok")) {
      for (String value : bad) {
        var body = new LinkedHashMap<String, Object>();
        body.put(field, value);
        var response = client.put("/admin/settings/social", body);
        assertThat(response.getStatusCode().value()).as(field + "=" + value).isEqualTo(400);
      }
    }
    var fine = new LinkedHashMap<String, Object>();
    fine.put("mapUrl", "https://maps.example.com/?q=1");
    fine.put("messenger", "HTTP://example.com/m");
    assertThat(client.put("/admin/settings/contact", fine).getStatusCode().value()).isEqualTo(200);
    var maxLength = new LinkedHashMap<String, Object>();
    maxLength.put("facebook", ("https://example.com/" + "a".repeat(2000)).substring(0, 2000));
    assertThat(client.put("/admin/settings/social", maxLength).getStatusCode().value())
        .isEqualTo(200);
  }

  @Test
  void aRefusedWriteChangesNothingAndWritesNoAuditLine() {
    var client = loggedInClient();
    client.put("/admin/settings/contact", contact());
    jdbc.update("delete from audit_log");
    var bad = contact();
    bad.put("phone", "abc");

    assertThat(client.put("/admin/settings/contact", bad).getStatusCode().value()).isEqualTo(400);

    assertThat(ApiClient.json(client.get("/admin/settings/contact")).path("phone").asString())
        .isEqualTo("0000 000 000");
    assertThat(count("audit_log")).isZero();
  }

  @Test
  void unknownFieldsAreRefused() {
    var client = loggedInClient();
    var extra = contact();
    extra.put("email", "x@example.com");
    var nested = contact();
    nested.put("address", new LinkedHashMap<>(Map.of("vi", "a", "fr", "b")));
    var wrongKey = new LinkedHashMap<String, Object>();
    wrongKey.put("facebook", "https://example.com/fb");

    assertThat(client.put("/admin/settings/contact", extra).getStatusCode().value()).isEqualTo(400);
    assertThat(client.put("/admin/settings/contact", nested).getStatusCode().value())
        .isEqualTo(400);
    assertThat(client.put("/admin/settings/contact", wrongKey).getStatusCode().value())
        .isEqualTo(400);
    assertThat(client.put("/admin/settings/brand", wrongKey).getStatusCode().value()).isEqualTo(400);
    assertThat(count("site_setting")).isZero();
  }

  @Test
  void aBodyThatIsNotAnObjectIsRefused() {
    var client = loggedInClient();

    assertThat(client.put("/admin/settings/contact", List.of()).getStatusCode().value())
        .isEqualTo(400);
    assertThat(client.put("/admin/settings/contact", "text").getStatusCode().value()).isEqualTo(400);
    assertThat(client.put("/admin/settings/contact", null).getStatusCode().value()).isEqualTo(400);
    assertThat(count("site_setting")).isZero();
  }

  @Test
  void aPhoneThatIsNotATextIsRefused() {
    var client = loggedInClient();
    var body = new LinkedHashMap<String, Object>();
    body.put("phone", Map.of("vi", "x"));

    assertThat(client.put("/admin/settings/contact", body).getStatusCode().value()).isEqualTo(400);
  }

  @Test
  void englishTextWithoutVietnameseTextIsRefused() {
    var client = loggedInClient();
    var brand = new LinkedHashMap<String, Object>();
    brand.put("tagline", text(null, "Only English"));
    var contact = new LinkedHashMap<String, Object>();
    contact.put("hours", text("  ", "Only English hours"));

    var tagline = client.put("/admin/settings/brand", brand);
    var hours = client.put("/admin/settings/contact", contact);

    assertThat(tagline.getStatusCode().value()).isEqualTo(400);
    assertThat(ApiClient.json(tagline).path("detail").asString()).contains("tiếng Việt");
    assertThat(hours.getStatusCode().value()).isEqualTo(400);
  }

  @Test
  void textsAreLimitedInLength() {
    var client = loggedInClient();
    var brand = new LinkedHashMap<String, Object>();
    brand.put("tagline", text("a".repeat(501), null));

    assertThat(client.put("/admin/settings/brand", brand).getStatusCode().value()).isEqualTo(400);
  }

  // ---- audit and restore ---------------------------------------------------------------------

  @Test
  void everyWriteIsAuditedWithTheRowIdAndTheUser() {
    var client = loggedInClient();
    long userId = jdbc.queryForObject("select id from app_user", Long.class);

    client.put("/admin/settings/contact", contact());
    long rowId = jdbc.queryForObject("select id from site_setting where key = 'contact'", Long.class);
    var changed = contact();
    changed.put("phone", "0111 111 111");
    client.put("/admin/settings/contact", changed);

    var rows =
        jdbc.queryForList(
            "select action, user_id, entity_type, entity_id, before_json, after_json from audit_log order by id");
    assertThat(rows).extracting(r -> r.get("action")).containsExactly("CREATE", "UPDATE");
    assertThat(rows)
        .allSatisfy(
            r -> {
              assertThat(r.get("entity_type")).isEqualTo("site_setting");
              assertThat(r.get("entity_id")).isEqualTo(rowId);
              assertThat(r.get("user_id")).isEqualTo(userId);
            });
    assertThat(rows.get(0).get("before_json")).isNull();
    assertThat(
            jdbc.queryForObject(
                "select after_json -> 'value' ->> 'phone' from audit_log where action = 'CREATE'",
                String.class))
        .isEqualTo("0000 000 000");
    assertThat(
            jdbc.queryForObject(
                "select before_json -> 'value' ->> 'phone' from audit_log where action = 'UPDATE'",
                String.class))
        .isEqualTo("0000 000 000");
    assertThat(
            jdbc.queryForObject(
                "select after_json ->> 'key' from audit_log where action = 'UPDATE'", String.class))
        .isEqualTo("contact");
  }

  @Test
  void anUpdateLineCanBeRestored() {
    var client = loggedInClient();
    client.put("/admin/settings/contact", contact());
    long rowId = jdbc.queryForObject("select id from site_setting where key = 'contact'", Long.class);
    var changed = contact();
    changed.put("phone", "0111 111 111");
    changed.put("address", text("Địa chỉ mới", "New address"));
    client.put("/admin/settings/contact", changed);
    long updateLine = jdbc.queryForObject("select id from audit_log where action = 'UPDATE'", Long.class);

    var response = client.post("/admin/audit/" + updateLine + "/restore", Map.of());

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    JsonNode json = ApiClient.json(client.get("/admin/settings/contact"));
    assertThat(json.path("phone").asString()).isEqualTo("0000 000 000");
    assertThat(json.path("address").path("vi").asString()).isEqualTo("Số 1, Hải Dương");
    assertThat(count("site_setting")).isEqualTo(1);
    assertThat(jdbc.queryForObject("select id from site_setting where key = 'contact'", Long.class))
        .isEqualTo(rowId);
    var restore =
        jdbc.queryForList(
            "select entity_type, entity_id, before_json -> 'value' ->> 'phone' as before_phone,"
                + " after_json -> 'value' ->> 'phone' as after_phone from audit_log where action = 'RESTORE'");
    assertThat(restore).hasSize(1);
    assertThat(restore.get(0).get("entity_type")).isEqualTo("site_setting");
    assertThat(restore.get(0).get("entity_id")).isEqualTo(rowId);
    assertThat(restore.get(0).get("before_phone")).isEqualTo("0111 111 111");
    assertThat(restore.get(0).get("after_phone")).isEqualTo("0000 000 000");
  }

  @Test
  void aSettingRowThatWasDeletedIsCreatedAgainWithItsOldIdOnRestore() {
    var client = loggedInClient();
    client.put("/admin/settings/contact", contact());
    long rowId = jdbc.queryForObject("select id from site_setting where key = 'contact'", Long.class);
    var changed = contact();
    changed.put("phone", "0111 111 111");
    client.put("/admin/settings/contact", changed);
    long updateLine = jdbc.queryForObject("select id from audit_log where action = 'UPDATE'", Long.class);
    jdbc.update("delete from site_setting");

    var response = client.post("/admin/audit/" + updateLine + "/restore", Map.of());

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    assertThat(jdbc.queryForObject("select id from site_setting where key = 'contact'", Long.class))
        .isEqualTo(rowId);
    assertThat(ApiClient.json(client.get("/admin/settings/contact")).path("phone").asString())
        .isEqualTo("0000 000 000");
    assertThat(jdbc.queryForObject("select jsonb_typeof(value) from site_setting", String.class))
        .isEqualTo("object");
  }

  @Test
  void aRestoreWhoseKeyWasTakenByAnotherRowAnswers409() {
    var client = loggedInClient();
    client.put("/admin/settings/contact", contact());
    var changed = contact();
    changed.put("phone", "0111 111 111");
    client.put("/admin/settings/contact", changed);
    long updateLine = jdbc.queryForObject("select id from audit_log where action = 'UPDATE'", Long.class);
    jdbc.update("delete from site_setting");
    jdbc.update("insert into site_setting (key, value) values ('contact', '{}'::jsonb)");

    var response = client.post("/admin/audit/" + updateLine + "/restore", Map.of());

    assertThat(response.getStatusCode().value()).isEqualTo(409);
  }

  @Test
  void aSnapshotWithAnInvalidValueIsNotRestored() {
    var client = loggedInClient();
    client.put("/admin/settings/contact", contact());
    long rowId = jdbc.queryForObject("select id from site_setting where key = 'contact'", Long.class);
    long line =
        jdbc.queryForObject(
            "insert into audit_log (entity_type, entity_id, action, before_json, after_json)"
                + " values ('site_setting', ?, 'UPDATE', ?::jsonb, ?::jsonb) returning id",
            Long.class,
            rowId,
            "{\"id\":" + rowId + ",\"key\":\"contact\",\"value\":{\"phone\":\"abc\"}}",
            "{\"id\":" + rowId + ",\"key\":\"contact\",\"value\":{}}");

    var response = client.post("/admin/audit/" + line + "/restore", Map.of());

    assertThat(response.getStatusCode().value()).isEqualTo(409);
    assertThat(ApiClient.json(client.get("/admin/settings/contact")).path("phone").asString())
        .isEqualTo("0000 000 000");
  }

  // ---- helpers -------------------------------------------------------------------------------

  private static Map<String, Object> contact() {
    var body = new LinkedHashMap<String, Object>();
    body.put("phone", "0000 000 000");
    body.put("zalo", null);
    body.put("messenger", "https://example.com/m");
    body.put("address", text("Số 1, Hải Dương", "1 Main Street"));
    body.put("mapUrl", "https://example.com/map");
    body.put("hours", text("8:00 - 17:00", "8 am - 5 pm"));
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

  private int count(String table) {
    return jdbc.queryForObject("select count(*) from " + table, Integer.class);
  }
}
