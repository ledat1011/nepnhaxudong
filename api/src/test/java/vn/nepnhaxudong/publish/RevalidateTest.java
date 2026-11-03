package vn.nepnhaxudong.publish;

import static org.assertj.core.api.Assertions.assertThat;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.support.TransactionTemplate;
import vn.nepnhaxudong.auth.ApiClient;
import vn.nepnhaxudong.auth.AuthTestSupport;
import vn.nepnhaxudong.media.Media;
import vn.nepnhaxudong.media.MediaRepository;
import vn.nepnhaxudong.media.MediaService;

/**
 * Content changes reach the website. The Spring application runs for real, with a fake Next.js
 * server as the website. The calls are asynchronous, so a test never counts requests at a random
 * time: after the action it saves one marker story, and everything that arrived before the marker
 * request is what the action caused (one worker thread keeps the order).
 */
class RevalidateTest extends AuthTestSupport {

  private static final String SECRET = "integration-test-secret";
  private static final FakeWebServer WEB = FakeWebServer.start();
  private static final AtomicInteger MARKERS = new AtomicInteger();

  @DynamicPropertySource
  static void website(DynamicPropertyRegistry registry) {
    registry.add("app.web.base-url", WEB::baseUrl);
    registry.add("app.web.revalidate-secret", () -> SECRET);
    registry.add("app.web.retry-wait", () -> "10ms");
  }

  // The tests of a failing website make the client log warnings; they stay out of the build output.
  private static LogCapture clientLog;

  @BeforeAll
  static void holdClientWarnings() {
    clientLog = new LogCapture(RevalidateClient.class);
  }

  @AfterAll
  static void stopWebsite() {
    clientLog.close();
    WEB.close();
  }

  @Autowired JdbcTemplate jdbc;
  @Autowired MediaRepository mediaRepository;
  @Autowired MediaService mediaService;
  @Autowired ApplicationEventPublisher publisher;
  @Autowired TransactionTemplate transaction;

  @BeforeEach
  void emptyTables() {
    jdbc.update("delete from audit_log");
    jdbc.update("delete from story");
    jdbc.update("delete from product");
    jdbc.update("delete from timeline_event");
    jdbc.update("delete from press_mention");
    jdbc.update("delete from site_setting");
    jdbc.update("delete from media");
    WEB.reset();
  }

  // ---- when a request is sent ----------------------------------------------------------------

  @Test
  void updatingAProductSendsOneRequestWithTheHomeTagAndTheSecret() {
    var client = loggedInClient();
    long id = createProduct(client);
    settle(client);

    var response = client.put("/admin/products/" + id, product("Nếp cái hoa vàng, sửa"));
    List<ReceivedRequest> sent = sentSince(client);

    assertThat(response.getStatusCode().value()).isEqualTo(200);
    assertThat(sent).hasSize(1);
    assertThat(sent.get(0).method()).isEqualTo("POST");
    assertThat(sent.get(0).path()).isEqualTo("/api/revalidate");
    assertThat(sent.get(0).secret()).isEqualTo(SECRET);
    assertThat(sent.get(0).tags()).containsExactly("home");
  }

  @Test
  void aRefusedWriteSendsNothing() {
    var client = loggedInClient();
    createStory(client, "Mua gat", "Harvest time");
    settle(client);

    var blankName = client.post("/admin/products", product("   "));
    var takenSlug = client.post("/admin/stories", story("Khac", "Other", "mua-gat", null));
    List<ReceivedRequest> sent = sentSince(client);

    assertThat(blankName.getStatusCode().value()).isEqualTo(400);
    assertThat(takenSlug.getStatusCode().value()).isEqualTo(409);
    assertThat(sent).isEmpty();
  }

  @Test
  void aRolledBackTransactionSendsNothingAndACommittedOneSendsOnce() {
    var client = loggedInClient();

    transaction.executeWithoutResult(
        status -> {
          publisher.publishEvent(ContentChangedEvent.stories(List.of("rolled-back")));
          status.setRollbackOnly();
        });
    List<ReceivedRequest> afterRollback = sentSince(client);
    transaction.executeWithoutResult(
        status -> publisher.publishEvent(ContentChangedEvent.stories(List.of("committed"))));
    List<ReceivedRequest> afterCommit = sentSince(client);

    assertThat(afterRollback).isEmpty();
    assertThat(afterCommit).hasSize(1);
    assertThat(afterCommit.get(0).tags()).contains("story:committed");
  }

  // ---- failures of the website never reach the admin -----------------------------------------

  @Test
  void aWebsiteThatFailsTwiceAndThenAnswersOkIsCalledThreeTimesAndTheAdminSeesNoError() {
    var client = loggedInClient();
    WEB.respondWith(500, 500);

    var response = client.post("/admin/products", product("Nếp cái"));
    var requests = List.of(WEB.next(), WEB.next(), WEB.next());

    assertThat(response.getStatusCode().value()).isEqualTo(201);
    assertThat(requests).allSatisfy(request -> assertThat(request.tags()).containsExactly("home"));
    assertThat(sentSince(client)).isEmpty();
  }

  @Test
  void aWebsiteThatAlwaysFailsIsCalledFourTimesAndTheContentIsStillSaved() {
    var client = loggedInClient();
    WEB.alwaysRespondWith(500);

    var response = client.post("/admin/products", product("Nếp cái"));
    var requests = List.of(WEB.next(), WEB.next(), WEB.next(), WEB.next());
    WEB.alwaysRespondWith(200);

    assertThat(response.getStatusCode().value()).isEqualTo(201);
    assertThat(requests).allSatisfy(request -> assertThat(request.tags()).containsExactly("home"));
    assertThat(count("product")).isEqualTo(1);
    assertThat(sentSince(client)).isEmpty();
  }

  // ---- stories -------------------------------------------------------------------------------

  @Test
  void publishingAndUnpublishingAStorySendHomeStoriesAndTheSlugOfEachLanguage() {
    var client = loggedInClient();
    long id = createStory(client, "Mua gat", "Harvest time");
    settle(client);

    client.post("/admin/stories/" + id + "/publish", Map.of());
    List<ReceivedRequest> published = sentSince(client);
    client.post("/admin/stories/" + id + "/unpublish", Map.of());
    List<ReceivedRequest> unpublished = sentSince(client);

    var expected = new String[] {"home", "stories", "story:harvest-time", "story:mua-gat"};
    assertThat(published).hasSize(1);
    assertThat(published.get(0).tags()).containsExactly(expected);
    assertThat(unpublished).hasSize(1);
    assertThat(unpublished.get(0).tags()).containsExactly(expected);
  }

  @Test
  void publishingAStoryThatIsAlreadyPublishedSendsNothing() {
    var client = loggedInClient();
    long id = createStory(client, "Mua gat", "Harvest time");
    client.post("/admin/stories/" + id + "/publish", Map.of());
    settle(client);

    client.post("/admin/stories/" + id + "/publish", Map.of());

    assertThat(sentSince(client)).isEmpty();
  }

  @Test
  void aStoryWithOnlyVietnameseTextHasOneSlugTag() {
    var client = loggedInClient();

    createStory(client, "Chi tieng Viet", null);
    // The marker of sentSince is a story too, so read the request of the story above first.
    ReceivedRequest first = WEB.next();

    assertThat(first.tags()).containsExactly("home", "stories", "story:chi-tieng-viet");
  }

  @Test
  void changingTheSlugsOfAStoryAlsoSendsTheOldSlugs() {
    var client = loggedInClient();
    long id = createStory(client, "Mua gat", "Harvest time");
    settle(client);

    var response =
        client.put("/admin/stories/" + id, story("Mua gat", "Harvest time", "mua-moi", "new-season"));
    List<ReceivedRequest> sent = sentSince(client);

    assertThat(response.getStatusCode().value()).isEqualTo(200);
    assertThat(sent).hasSize(1);
    assertThat(sent.get(0).tags())
        .containsExactly(
            "home",
            "stories",
            "story:harvest-time",
            "story:mua-gat",
            "story:mua-moi",
            "story:new-season");
  }

  @Test
  void deletingAStorySendsItsSlugs() {
    var client = loggedInClient();
    long id = createStory(client, "Mua gat", "Harvest time");
    settle(client);

    var response = client.delete("/admin/stories/" + id);
    List<ReceivedRequest> sent = sentSince(client);

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    assertThat(sent).hasSize(1);
    assertThat(sent.get(0).tags())
        .containsExactly("home", "stories", "story:harvest-time", "story:mua-gat");
  }

  // ---- the other content types ---------------------------------------------------------------

  @Test
  void pressTimelineAndSettingsChangesSendHome() {
    var client = loggedInClient();

    assertSendsOnlyHome(client, () -> client.post("/admin/press", press()));
    assertSendsOnlyHome(client, () -> client.post("/admin/timeline", timeline(1998)));
    assertSendsOnlyHome(client, () -> client.put("/admin/settings/contact", contact()));
  }

  @Test
  void reorderingTheTimelineSendsHomeOnce() {
    var client = loggedInClient();
    long first = idOf(client.post("/admin/timeline", timeline(1998)));
    long second = idOf(client.post("/admin/timeline", timeline(1999)));
    settle(client);

    var response = client.put("/admin/timeline/order", Map.of("ids", List.of(second, first)));
    List<ReceivedRequest> sent = sentSince(client);

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    assertThat(sent).hasSize(1);
    assertThat(sent.get(0).tags()).containsExactly("home");
  }

  @Test
  void changingTheAltTextOfAnImageAndDeletingItSendHome() {
    var client = loggedInClient();
    long mediaId = newMedia("2026/11/a.webp");

    assertSendsOnlyHome(
        client,
        () ->
            client.put(
                "/admin/media/" + mediaId, Map.of("altVi", "Ảnh mới", "altEn", "New image")));
    assertSendsOnlyHome(client, () -> client.delete("/admin/media/" + mediaId));
  }

  @Test
  void uploadingAnImageSendsNothing() {
    var client = loggedInClient();

    var saved = mediaService.upload(new ByteArrayInputStream(png()), "Ảnh", "Image");

    assertThat(saved.id()).isPositive();
    assertThat(sentSince(client)).isEmpty();
  }

  // ---- restore -------------------------------------------------------------------------------

  @Test
  void restoringAStorySendsTheSlugsBeforeAndAfterTheRestore() {
    var client = loggedInClient();
    long id = createStory(client, "Mua gat", "Harvest time");
    client.put("/admin/stories/" + id, story("Mua gat", "Harvest time", "mua-moi", "new-season"));
    long line = auditId("story", id, "UPDATE");
    settle(client);

    var response = client.post("/admin/audit/" + line + "/restore", Map.of());
    List<ReceivedRequest> sent = sentSince(client);

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    assertThat(sent).hasSize(1);
    assertThat(sent.get(0).tags())
        .containsExactly(
            "home",
            "stories",
            "story:harvest-time",
            "story:mua-gat",
            "story:mua-moi",
            "story:new-season");
  }

  @Test
  void restoringADeletedStorySendsItsSlugs() {
    var client = loggedInClient();
    long id = createStory(client, "Mua gat", "Harvest time");
    client.delete("/admin/stories/" + id);
    long line = auditId("story", id, "DELETE");
    settle(client);

    var response = client.post("/admin/audit/" + line + "/restore", Map.of());
    List<ReceivedRequest> sent = sentSince(client);

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    assertThat(sent).hasSize(1);
    assertThat(sent.get(0).tags())
        .containsExactly("home", "stories", "story:harvest-time", "story:mua-gat");
  }

  @Test
  void restoringAProductSendsHome() {
    var client = loggedInClient();
    long id = createProduct(client);
    client.delete("/admin/products/" + id);
    long line = auditId("product", id, "DELETE");
    settle(client);

    var response = client.post("/admin/audit/" + line + "/restore", Map.of());
    List<ReceivedRequest> sent = sentSince(client);

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    assertThat(sent).hasSize(1);
    assertThat(sent.get(0).tags()).containsExactly("home");
  }

  @Test
  void restoringASiteSettingSendsHome() {
    var client = loggedInClient();
    client.put("/admin/settings/contact", contact());
    var changed = contact();
    changed.put("phone", "1111 111 111");
    client.put("/admin/settings/contact", changed);
    long line = jdbc.queryForObject(
        "select id from audit_log where entity_type = 'site_setting' and action = 'UPDATE'",
        Long.class);
    settle(client);

    var response = client.post("/admin/audit/" + line + "/restore", Map.of());
    List<ReceivedRequest> sent = sentSince(client);

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    assertThat(sent).hasSize(1);
    assertThat(sent.get(0).tags()).containsExactly("home");
  }

  // ---- helpers -------------------------------------------------------------------------------

  /**
   * Saves a marker story and returns every request that arrived before the marker request. The
   * marker request itself is taken out of the record.
   */
  private List<ReceivedRequest> sentSince(ApiClient client) {
    String slug = "marker-" + MARKERS.incrementAndGet();
    var response = client.post("/admin/stories", story("Marker", null, slug, null));
    assertThat(response.getStatusCode().value()).isEqualTo(201);
    var before = new ArrayList<ReceivedRequest>();
    while (true) {
      ReceivedRequest request = WEB.next();
      if (request.tags().contains("story:" + slug)) {
        return before;
      }
      before.add(request);
    }
  }

  /** Waits until every earlier request has arrived and forgets them. */
  private void settle(ApiClient client) {
    sentSince(client);
  }

  private void assertSendsOnlyHome(ApiClient client, Runnable write) {
    settle(client);
    write.run();
    List<ReceivedRequest> sent = sentSince(client);
    assertThat(sent).hasSize(1);
    assertThat(sent.get(0).tags()).containsExactly("home");
  }

  private long createProduct(ApiClient client) {
    var response = client.post("/admin/products", product("Nếp cái hoa vàng"));
    assertThat(response.getStatusCode().value()).isEqualTo(201);
    return idOf(response);
  }

  private long createStory(ApiClient client, String titleVi, String titleEn) {
    var response = client.post("/admin/stories", story(titleVi, titleEn, null, null));
    assertThat(response.getStatusCode().value()).isEqualTo(201);
    return idOf(response);
  }

  private static long idOf(ResponseEntity<String> response) {
    return ApiClient.json(response).path("id").asLong();
  }

  private long auditId(String entityType, long entityId, String action) {
    return jdbc.queryForObject(
        "select id from audit_log where entity_type = ? and entity_id = ? and action = ?"
            + " order by id limit 1",
        Long.class,
        entityType,
        entityId,
        action);
  }

  private int count(String table) {
    return jdbc.queryForObject("select count(*) from " + table, Integer.class);
  }

  private long newMedia(String path) {
    return mediaRepository
        .save(Media.create(path, "image/webp", 800, 600, 12345L, "Ảnh", "Image"))
        .getId();
  }

  private static Map<String, Object> story(
      String titleVi, String titleEn, String slugVi, String slugEn) {
    var body = new LinkedHashMap<String, Object>();
    body.put("title", text(titleVi, titleEn));
    if (slugVi != null || slugEn != null) {
      body.put("slug", text(slugVi, slugEn));
    }
    return body;
  }

  private static Map<String, Object> product(String nameVi) {
    var body = new LinkedHashMap<String, Object>();
    body.put("sortOrder", 0);
    body.put("showPrice", false);
    body.put("name", text(nameVi, "Yellow-flower sticky rice"));
    body.put("description", text("Hạt nếp dẻo thơm.", "Soft, fragrant grains."));
    body.put("features", Map.of("vi", List.of("Dẻo", "Thơm"), "en", List.of("Soft", "Fragrant")));
    body.put("cookingTips", text("Ngâm 8 tiếng.", "Soak for 8 hours."));
    body.put("packagings", List.of(Map.of("weightGrams", 1000, "priceVnd", 90000L)));
    body.put("mediaIds", List.of());
    return body;
  }

  private static Map<String, Object> press() {
    var body = new LinkedHashMap<String, Object>();
    body.put("url", "https://a.example/1");
    body.put("sourceName", "Báo Hải Dương");
    body.put("publishedOn", "2024-05-01");
    body.put("title", text("Bài báo", "Article"));
    return body;
  }

  private static Map<String, Object> timeline(int year) {
    var body = new LinkedHashMap<String, Object>();
    body.put("year", year);
    body.put("title", text("Mốc " + year, "Event " + year));
    body.put("description", text("Mô tả", "Description"));
    return body;
  }

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

  private static byte[] png() {
    var image = new BufferedImage(8, 8, BufferedImage.TYPE_INT_RGB);
    var out = new ByteArrayOutputStream();
    try {
      ImageIO.write(image, "png", out);
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
    return out.toByteArray();
  }
}
