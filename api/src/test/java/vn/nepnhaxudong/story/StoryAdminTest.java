package vn.nepnhaxudong.story;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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

class StoryAdminTest extends AuthTestSupport {

  private static final Instant START = Instant.parse("2026-03-01T08:00:00Z");
  private static final String NOT_FOUND = "Không tìm thấy bài viết.";
  private static final String SLUG_TAKEN = "Đường dẫn bài viết đã tồn tại.";
  private static final String SLUG_REQUIRED = "Hãy nhập đường dẫn bài viết.";
  private static final String TITLE_REQUIRED = "Tiêu đề bài viết (tiếng Việt) không được để trống.";
  private static final String ENGLISH_TITLE_REQUIRED =
      "Tiêu đề bài viết (tiếng Anh) không được để trống khi đã có nội dung tiếng Anh.";

  @Autowired JdbcTemplate jdbc;
  @Autowired MediaRepository mediaRepository;

  @BeforeEach
  void emptyTablesAndFixTheClock() {
    cleanUp();
    clock.set(START);
  }

  // Stories point to media, and other test classes delete media, so nothing may stay behind.
  @AfterEach
  void cleanUp() {
    jdbc.update("delete from audit_log");
    jdbc.update("delete from story");
    jdbc.update("delete from media");
  }

  // ---- access --------------------------------------------------------------------------------

  @Test
  void aVisitorWhoIsNotLoggedInIsRefused() {
    var client = newClient();
    client.fetchCsrf();

    assertThat(client.get("/admin/stories").getStatusCode().value()).isEqualTo(401);
    assertThat(client.post("/admin/stories", story("A", null)).getStatusCode().value())
        .isEqualTo(401);
    assertThat(client.post("/admin/stories/1/publish", Map.of()).getStatusCode().value())
        .isEqualTo(401);
  }

  // ---- create and read -----------------------------------------------------------------------

  @Test
  void createdStoryReadsBackWithTheContractShapeAndSlugsFromTheTitles() {
    var client = loggedInClient();
    long mediaId = newMedia("cover.webp");
    var body = story("Câu chuyện mùa gặt ở Duy Tân", "The harvest season");
    body.put("coverMediaId", mediaId);
    body.put("excerpt", text("Tóm tắt", "Summary"));
    body.put("bodyHtml", text("<p>Nội dung</p>", "<p>Content</p>"));

    var created = client.post("/admin/stories", body);

    assertThat(created.getStatusCode().value()).isEqualTo(201);
    JsonNode json = ApiClient.json(created);
    long id = json.path("id").asLong();
    assertThat(id).isPositive();
    assertThat(json.path("status").asString()).isEqualTo("DRAFT");
    assertThat(json.path("publishedAt").isNull()).isTrue();
    assertThat(json.path("coverMediaId").asLong()).isEqualTo(mediaId);
    assertThat(json.path("slug").path("vi").asString()).isEqualTo("cau-chuyen-mua-gat-o-duy-tan");
    assertThat(json.path("slug").path("en").asString()).isEqualTo("the-harvest-season");
    assertThat(json.path("title").path("vi").asString()).isEqualTo("Câu chuyện mùa gặt ở Duy Tân");
    assertThat(json.path("title").path("en").asString()).isEqualTo("The harvest season");
    assertThat(json.path("excerpt").path("vi").asString()).isEqualTo("Tóm tắt");
    assertThat(json.path("excerpt").path("en").asString()).isEqualTo("Summary");
    assertThat(json.path("bodyHtml").path("vi").asString()).isEqualTo("<p>Nội dung</p>");
    assertThat(json.path("bodyHtml").path("en").asString()).isEqualTo("<p>Content</p>");
    assertThat(json.path("missingEn").asBoolean()).isFalse();
    assertThat(ApiClient.json(client.get("/admin/stories/" + id))).isEqualTo(json);
  }

  @Test
  void aStoryWithOnlyVietnameseHasNoEnglishRowAndIsMissingEnglish() {
    var client = loggedInClient();

    var created = client.post("/admin/stories", story("Chỉ tiếng Việt", null));

    assertThat(created.getStatusCode().value()).isEqualTo(201);
    JsonNode json = ApiClient.json(created);
    assertThat(json.path("slug").path("vi").asString()).isEqualTo("chi-tieng-viet");
    assertThat(json.path("slug").path("en").isNull()).isTrue();
    assertThat(json.path("title").path("en").isNull()).isTrue();
    assertThat(json.path("missingEn").asBoolean()).isTrue();
    assertThat(count("story_translation where lang = 'en'")).isZero();
  }

  @Test
  void aVietnameseBodyWithoutEnglishCountsAsMissingEnglish() {
    var client = loggedInClient();
    var body = story("Có bài", "With body");
    body.put("bodyHtml", text("<p>Chỉ tiếng Việt</p>", null));

    JsonNode json = ApiClient.json(client.post("/admin/stories", body));

    assertThat(json.path("missingEn").asBoolean()).isTrue();
  }

  @Test
  void aMissingBodyIsStoredAsAnEmptyString() {
    var client = loggedInClient();

    long id = create(client, "Chưa có nội dung", null);

    assertThat(
            jdbc.queryForObject(
                "select body_html from story_translation where story_id = ? and lang = 'vi'",
                String.class,
                id))
        .isEmpty();
  }

  @Test
  void theSameSlugInVietnameseAndEnglishOfOneStoryIsAllowed() {
    var client = loggedInClient();

    var created = client.post("/admin/stories", story("Nep", "Nep"));

    assertThat(created.getStatusCode().value()).isEqualTo(201);
    JsonNode json = ApiClient.json(created);
    assertThat(json.path("slug").path("vi").asString()).isEqualTo("nep");
    assertThat(json.path("slug").path("en").asString()).isEqualTo("nep");
  }

  // ---- slugs ---------------------------------------------------------------------------------

  @Test
  void aTypedSlugIsNormalizedLikeATitle() {
    var client = loggedInClient();
    var body = story("Tiêu đề", "Title");
    body.put("slug", text("  Đường Dẫn Mới!! ", "My  Own Slug"));

    JsonNode json = ApiClient.json(client.post("/admin/stories", body));

    assertThat(json.path("slug").path("vi").asString()).isEqualTo("duong-dan-moi");
    assertThat(json.path("slug").path("en").asString()).isEqualTo("my-own-slug");
  }

  @Test
  void aSlugThatHasNoLettersOrDigitsIsRefused() {
    var client = loggedInClient();
    var typedVi = story("Tiêu đề", null);
    typedVi.put("slug", text("🌾!!", null));
    var typedEn = story("Tiêu đề", "Title");
    typedEn.put("slug", text(null, "***"));

    assertDetail(client.post("/admin/stories", typedVi), 400, SLUG_REQUIRED);
    assertDetail(client.post("/admin/stories", typedEn), 400, SLUG_REQUIRED);
    assertThat(count("story")).isZero();
  }

  @Test
  void aTitleThatGivesAnEmptySlugIsRefused() {
    var client = loggedInClient();

    assertDetail(client.post("/admin/stories", story("🌾🌾", null)), 400, SLUG_REQUIRED);
    assertDetail(client.post("/admin/stories", story("Có chữ", "🌾")), 400, SLUG_REQUIRED);
    assertThat(count("story")).isZero();
  }

  @Test
  void aSlugOfTheSameLanguageThatIsInUseAnswers409() {
    var client = loggedInClient();
    create(client, "Mùa gặt", "Harvest");

    assertDetail(client.post("/admin/stories", story("Mùa Gặt!", "Other")), 409, SLUG_TAKEN);
    assertDetail(client.post("/admin/stories", story("Khác", "Harvest")), 409, SLUG_TAKEN);
    var typed = story("Khác", null);
    typed.put("slug", text("mua-gat", null));
    assertDetail(client.post("/admin/stories", typed), 409, SLUG_TAKEN);
    assertThat(count("story")).isEqualTo(1);
    assertThat(count("audit_log")).isEqualTo(1);
  }

  @Test
  void aVietnameseSlugMayEqualAnEnglishSlugOfAnotherStory() {
    var client = loggedInClient();
    create(client, "Một", "Rice");

    var created = client.post("/admin/stories", story("Rice", null));

    assertThat(created.getStatusCode().value()).isEqualTo(201);
  }

  @Test
  void updateRefusesASlugOfAnotherStoryButAcceptsTheStoryOwnSlug() {
    var client = loggedInClient();
    create(client, "Một", null);
    long second = create(client, "Hai", null);
    var own = story("Hai (đổi tiêu đề)", null);
    own.put("slug", text("hai", null));
    var taken = story("Hai", null);
    taken.put("slug", text("mot", null));

    assertDetail(client.put("/admin/stories/" + second, taken), 409, SLUG_TAKEN);
    var updated = client.put("/admin/stories/" + second, own);

    assertThat(updated.getStatusCode().value()).isEqualTo(200);
    assertThat(ApiClient.json(updated).path("slug").path("vi").asString()).isEqualTo("hai");
  }

  // ---- texts ---------------------------------------------------------------------------------

  @Test
  void theVietnameseTitleIsRequired() {
    var client = loggedInClient();
    var blank = story("  ", null);
    var missing = story("x", null);
    missing.remove("title");
    var englishOnly = story("x", "Title");
    englishOnly.put("title", text(null, "Title"));

    assertDetail(client.post("/admin/stories", blank), 400, TITLE_REQUIRED);
    assertDetail(client.post("/admin/stories", missing), 400, TITLE_REQUIRED);
    assertDetail(client.post("/admin/stories", englishOnly), 400, TITLE_REQUIRED);
    assertThat(count("story")).isZero();
  }

  @Test
  void englishTextWithoutAnEnglishTitleIsRefused() {
    var client = loggedInClient();
    var withExcerpt = story("Tiêu đề", null);
    withExcerpt.put("excerpt", text("Tóm tắt", "Summary"));
    var withBody = story("Tiêu đề", null);
    withBody.put("bodyHtml", text("<p>vi</p>", "<p>en</p>"));
    var withSlug = story("Tiêu đề", null);
    withSlug.put("slug", text(null, "english-slug"));

    assertDetail(client.post("/admin/stories", withExcerpt), 400, ENGLISH_TITLE_REQUIRED);
    assertDetail(client.post("/admin/stories", withBody), 400, ENGLISH_TITLE_REQUIRED);
    assertDetail(client.post("/admin/stories", withSlug), 400, ENGLISH_TITLE_REQUIRED);
    assertThat(count("story")).isZero();
  }

  @Test
  void anUnknownCoverImageIsRefused() {
    var client = loggedInClient();
    var body = story("Có ảnh", null);
    body.put("coverMediaId", 424242L);

    assertDetail(client.post("/admin/stories", body), 400, "Ảnh không tồn tại: 424242.");
    assertThat(count("story")).isZero();
  }

  // ---- sanitizing ----------------------------------------------------------------------------

  @Test
  void bodyHtmlIsSanitizedInBothLanguagesWhenItIsSaved() {
    var client = loggedInClient();
    var body = story("Làm sạch", "Sanitize");
    body.put(
        "bodyHtml",
        text(
            "<p onclick=\"x()\"><strong>Đậm</strong></p><script>alert(1)</script>",
            "<p>ok</p><a href=\"javascript:alert(1)\">bad</a><img src=\"/media/x.webp\" alt=\"a\" onerror=\"y()\">"));

    JsonNode json = ApiClient.json(client.post("/admin/stories", body));

    assertThat(json.path("bodyHtml").path("vi").asString()).isEqualTo("<p><strong>Đậm</strong></p>");
    assertThat(json.path("bodyHtml").path("en").asString())
        .isEqualTo("<p>ok</p><a>bad</a><img src=\"/media/x.webp\" alt=\"a\">");
    assertThat(
            jdbc.queryForObject(
                "select body_html from story_translation where lang = 'vi'", String.class))
        .isEqualTo("<p><strong>Đậm</strong></p>");
  }

  @Test
  void updateSanitizesTheBodyToo() {
    var client = loggedInClient();
    long id = create(client, "Bài", null);
    var update = story("Bài", null);
    update.put("slug", text("bai", null));
    update.put("bodyHtml", text("<h2>Tiêu đề</h2><p style=\"x\">a</p><a href=\"data:text/html,x\">b</a>", null));

    JsonNode json = ApiClient.json(client.put("/admin/stories/" + id, update));

    assertThat(json.path("bodyHtml").path("vi").asString()).isEqualTo("<h2>Tiêu đề</h2><p>a</p><a>b</a>");
  }

  // ---- update and delete ---------------------------------------------------------------------

  @Test
  void updateReplacesTheStoryAndRemovesTheEnglishRowWhenTheEnglishTitleIsGone() {
    var client = loggedInClient();
    long id = create(client, "Cũ", "Old");

    var update = story("Mới", null);
    update.put("slug", text("cu", null));
    var updated = client.put("/admin/stories/" + id, update);

    assertThat(updated.getStatusCode().value()).isEqualTo(200);
    JsonNode json = ApiClient.json(updated);
    assertThat(json.path("title").path("vi").asString()).isEqualTo("Mới");
    assertThat(json.path("slug").path("vi").asString()).isEqualTo("cu");
    assertThat(json.path("title").path("en").isNull()).isTrue();
    assertThat(count("story_translation where story_id = " + id)).isEqualTo(1);
    assertDetail(client.put("/admin/stories/424242", update), 404, NOT_FOUND);
  }

  @Test
  void changingOnlyATranslationMovesUpdatedAtOfTheStory() {
    var client = loggedInClient();
    long id = create(client, "Cũ", "Old");
    clock.advance(Duration.ofHours(1));
    var update = story("Cũ", "Old");
    update.put("excerpt", text("Chỉ đổi tóm tắt", null));

    assertThat(client.put("/admin/stories/" + id, update).getStatusCode().value()).isEqualTo(200);

    assertThat(updatedAt(id)).isEqualTo(START.plus(Duration.ofHours(1)));
  }

  @Test
  void deleteRemovesTheStoryAndItsTexts() {
    var client = loggedInClient();
    long id = create(client, "Xóa", "Delete");

    assertThat(client.delete("/admin/stories/" + id).getStatusCode().value()).isEqualTo(204);

    assertThat(count("story")).isZero();
    assertThat(count("story_translation")).isZero();
    assertDetail(client.get("/admin/stories/" + id), 404, NOT_FOUND);
    assertDetail(client.delete("/admin/stories/" + id), 404, NOT_FOUND);
  }

  // ---- list ----------------------------------------------------------------------------------

  @Test
  void theListShowsEveryStatusNewestChangeFirst() {
    var client = loggedInClient();
    long first = create(client, "Một", "One");
    clock.advance(Duration.ofMinutes(1));
    long second = create(client, "Hai", null);
    clock.advance(Duration.ofMinutes(1));
    client.post("/admin/stories/" + first + "/publish", Map.of());

    JsonNode list = ApiClient.json(client.get("/admin/stories"));

    var ids = new ArrayList<Long>();
    for (JsonNode node : list) {
      ids.add(node.path("id").asLong());
    }
    assertThat(ids).containsExactly(first, second);
    assertThat(list.get(0).path("status").asString()).isEqualTo("PUBLISHED");
    assertThat(list.get(0).path("slug").path("vi").asString()).isEqualTo("mot");
    assertThat(list.get(0).path("missingEn").asBoolean()).isFalse();
    assertThat(list.get(1).path("status").asString()).isEqualTo("DRAFT");
    assertThat(list.get(1).path("missingEn").asBoolean()).isTrue();
  }

  // ---- publish and unpublish -----------------------------------------------------------------

  @Test
  void publishSetsPublishedAtOnceAndUnpublishThenPublishKeepsIt() {
    var client = loggedInClient();
    long id = create(client, "Đăng bài", null);
    clock.advance(Duration.ofDays(1));

    var published = client.post("/admin/stories/" + id + "/publish", Map.of());

    assertThat(published.getStatusCode().value()).isEqualTo(200);
    JsonNode json = ApiClient.json(published);
    assertThat(json.path("status").asString()).isEqualTo("PUBLISHED");
    Instant firstPublishedAt = Instant.parse(json.path("publishedAt").asString());
    assertThat(firstPublishedAt).isEqualTo(START.plus(Duration.ofDays(1)));

    clock.advance(Duration.ofDays(1));
    JsonNode unpublished = ApiClient.json(client.post("/admin/stories/" + id + "/unpublish", Map.of()));
    assertThat(unpublished.path("status").asString()).isEqualTo("DRAFT");
    assertThat(Instant.parse(unpublished.path("publishedAt").asString())).isEqualTo(firstPublishedAt);

    clock.advance(Duration.ofDays(1));
    JsonNode again = ApiClient.json(client.post("/admin/stories/" + id + "/publish", Map.of()));
    assertThat(again.path("status").asString()).isEqualTo("PUBLISHED");
    assertThat(Instant.parse(again.path("publishedAt").asString())).isEqualTo(firstPublishedAt);
    assertThat(ApiClient.json(client.get("/admin/stories/" + id)).path("publishedAt").asString())
        .isEqualTo(json.path("publishedAt").asString());
  }

  @Test
  void publishingAPublishedStoryAndUnpublishingADraftChangeNothing() {
    var client = loggedInClient();
    long id = create(client, "Hai lần", null);

    var draftUnpublished = client.post("/admin/stories/" + id + "/unpublish", Map.of());
    client.post("/admin/stories/" + id + "/publish", Map.of());
    clock.advance(Duration.ofHours(2));
    var publishedAgain = client.post("/admin/stories/" + id + "/publish", Map.of());

    assertThat(draftUnpublished.getStatusCode().value()).isEqualTo(200);
    assertThat(ApiClient.json(draftUnpublished).path("status").asString()).isEqualTo("DRAFT");
    assertThat(publishedAgain.getStatusCode().value()).isEqualTo(200);
    JsonNode json = ApiClient.json(publishedAgain);
    assertThat(json.path("status").asString()).isEqualTo("PUBLISHED");
    assertThat(Instant.parse(json.path("publishedAt").asString())).isEqualTo(START);
    assertThat(auditActions(id)).containsExactly("CREATE", "UPDATE");
    assertThat(updatedAt(id)).isEqualTo(START);
  }

  @Test
  void publishAndUnpublishOfAnUnknownStoryAnswer404() {
    var client = loggedInClient();

    assertDetail(client.post("/admin/stories/424242/publish", Map.of()), 404, NOT_FOUND);
    assertDetail(client.post("/admin/stories/424242/unpublish", Map.of()), 404, NOT_FOUND);
  }

  // ---- audit and restore ---------------------------------------------------------------------

  @Test
  void everyWriteIsRecordedInTheAuditLogInTheSameTransaction() {
    var client = loggedInClient();
    long id = create(client, "Ghi lại", null);
    var update = story("Ghi lại 2", null);
    update.put("slug", text("ghi-lai", null));
    client.put("/admin/stories/" + id, update);
    client.post("/admin/stories/" + id + "/publish", Map.of());
    client.post("/admin/stories/" + id + "/unpublish", Map.of());
    client.delete("/admin/stories/" + id);

    assertThat(auditActions(id)).containsExactly("CREATE", "UPDATE", "UPDATE", "UPDATE", "DELETE");
    assertThat(
            jdbc.queryForObject(
                "select after_json -> 'title' ->> 'vi' from audit_log where entity_type = 'story'"
                    + " and entity_id = ? and action = 'CREATE'",
                String.class,
                id))
        .isEqualTo("Ghi lại");
  }

  @Test
  void restoringTheDeleteLineBringsTheStoryBackWithItsIdSlugAndPublishedAt() {
    var client = loggedInClient();
    long id = create(client, "Bài đã xóa", "Deleted story");
    client.post("/admin/stories/" + id + "/publish", Map.of());
    JsonNode before = ApiClient.json(client.get("/admin/stories/" + id));
    client.delete("/admin/stories/" + id);

    var restored = client.post("/admin/audit/" + auditId(id, "DELETE") + "/restore", Map.of());

    assertThat(restored.getStatusCode().value()).isEqualTo(204);
    JsonNode after = ApiClient.json(client.get("/admin/stories/" + id));
    assertThat(after.path("slug").path("vi").asString()).isEqualTo("bai-da-xoa");
    assertThat(after.path("slug").path("en").asString()).isEqualTo("deleted-story");
    assertThat(after.path("status").asString()).isEqualTo("PUBLISHED");
    assertThat(after.path("publishedAt")).isEqualTo(before.path("publishedAt"));
    assertThat(after.path("title")).isEqualTo(before.path("title"));
    assertThat(auditActions(id)).endsWith("DELETE", "RESTORE");
  }

  @Test
  void restoringAnEditBringsBackTheOldTextAndSlug() {
    var client = loggedInClient();
    long id = create(client, "Bản gốc", "Original");
    var update = story("Bản sửa", "Edited");
    update.put("slug", text("ban-sua", "edited"));
    client.put("/admin/stories/" + id, update);

    var restored = client.post("/admin/audit/" + auditId(id, "UPDATE") + "/restore", Map.of());

    assertThat(restored.getStatusCode().value()).isEqualTo(204);
    JsonNode json = ApiClient.json(client.get("/admin/stories/" + id));
    assertThat(json.path("title").path("vi").asString()).isEqualTo("Bản gốc");
    assertThat(json.path("slug").path("vi").asString()).isEqualTo("ban-goc");
  }

  @Test
  void restoringAPublishLineBringsBackTheDraft() {
    var client = loggedInClient();
    long id = create(client, "Nháp", null);
    client.post("/admin/stories/" + id + "/publish", Map.of());

    var restored = client.post("/admin/audit/" + auditId(id, "UPDATE") + "/restore", Map.of());

    assertThat(restored.getStatusCode().value()).isEqualTo(204);
    JsonNode json = ApiClient.json(client.get("/admin/stories/" + id));
    assertThat(json.path("status").asString()).isEqualTo("DRAFT");
    assertThat(json.path("publishedAt").isNull()).isTrue();
  }

  @Test
  void restoringADeletedStoryWhoseSlugIsNowUsedAnswers409AndWritesNothing() {
    var client = loggedInClient();
    long id = create(client, "Trùng đường dẫn", null);
    client.delete("/admin/stories/" + id);
    create(client, "Trùng đường dẫn", null);
    int auditLines = count("audit_log");

    var restored = client.post("/admin/audit/" + auditId(id, "DELETE") + "/restore", Map.of());

    assertDetail(restored, 409, SLUG_TAKEN);
    assertThat(count("story")).isEqualTo(1);
    assertThat(count("audit_log")).isEqualTo(auditLines);
  }

  @Test
  void restoringADeletedStoryWhoseCoverImageIsGoneAnswers409() {
    var client = loggedInClient();
    long mediaId = newMedia("gone.webp");
    var body = story("Ảnh bìa", null);
    body.put("coverMediaId", mediaId);
    long id = ApiClient.json(client.post("/admin/stories", body)).path("id").asLong();
    client.delete("/admin/stories/" + id);
    jdbc.update("delete from media");

    var restored = client.post("/admin/audit/" + auditId(id, "DELETE") + "/restore", Map.of());

    assertDetail(restored, 409, "Không thể khôi phục: ảnh đã bị xóa.");
    assertThat(count("story")).isZero();
  }

  // ---- helpers -------------------------------------------------------------------------------

  private long create(ApiClient client, String titleVi, String titleEn) {
    var response = client.post("/admin/stories", story(titleVi, titleEn));
    assertThat(response.getStatusCode().value()).isEqualTo(201);
    return ApiClient.json(response).path("id").asLong();
  }

  private static Map<String, Object> story(String titleVi, String titleEn) {
    var body = new LinkedHashMap<String, Object>();
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

  private Instant updatedAt(long id) {
    return jdbc.queryForObject("select updated_at from story where id = ?", Timestamp.class, id)
        .toInstant();
  }

  private List<String> auditActions(long id) {
    return jdbc.queryForList(
        "select action from audit_log where entity_type = 'story' and entity_id = ? order by id",
        String.class,
        id);
  }

  private long auditId(long storyId, String action) {
    return jdbc.queryForObject(
        "select min(id) from audit_log where entity_type = 'story' and entity_id = ? and action = ?",
        Long.class,
        storyId,
        action);
  }
}
