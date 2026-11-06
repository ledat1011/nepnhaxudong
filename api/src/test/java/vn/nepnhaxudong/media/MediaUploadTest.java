package vn.nepnhaxudong.media;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import tools.jackson.databind.JsonNode;
import vn.nepnhaxudong.auth.ApiClient;
import vn.nepnhaxudong.auth.AuthTestSupport;

/** Upload, list, edit and delete of images through the admin API, with the files on disk. */
class MediaUploadTest extends AuthTestSupport {

  private static final String ALT_VI = "Cánh đồng lúa";
  private static final String ALT_EN = "A rice field";

  @Autowired JdbcTemplate jdbc;
  @Autowired MediaRepository mediaRepository;

  Path mediaDir = Path.of(MEDIA_DIR);

  @BeforeEach
  void emptyTablesAndFolder() throws IOException {
    jdbc.update("delete from audit_log");
    jdbc.update("delete from product_media");
    jdbc.update("delete from product");
    jdbc.update("delete from timeline_event");
    jdbc.update("delete from press_mention");
    jdbc.update("delete from story");
    jdbc.update("delete from media");
    deleteFolder();
  }

  @AfterEach
  void removeFiles() throws IOException {
    jdbc.execute("drop trigger if exists nepnha_fail_media_insert on media");
    deleteFolder();
  }

  // ---- upload --------------------------------------------------------------------------------

  @Test
  void aVisitorWhoIsNotLoggedInIsRefused() {
    var client = newClient();
    client.fetchCsrf();

    assertThat(client.get("/admin/media").getStatusCode().value()).isEqualTo(401);
    assertThat(
            client.post("/admin/media", form(TestImages.jpeg(10, 10), "a.jpg", "image/jpeg", ALT_VI, ALT_EN))
                .getStatusCode()
                .value())
        .isEqualTo(401);
    assertThat(files()).isEmpty();
  }

  @Test
  void aBigJpegWithGpsIsStoredSmallerAndWithoutMetadata() throws IOException {
    clock.set(Instant.parse("2031-01-05T10:00:00Z"));
    var client = loggedInClient();
    byte[] source = TestImages.jpegWithSegments(4000, 3000, TestImages.exifSegment(null, true));
    assertThat(TestImages.jpegMarkers(source)).contains(TestImages.APP1);

    var response =
        client.post(
            "/admin/media",
            form(source, "../../My Holiday.JPG", "image/jpeg", "  " + ALT_VI + "  ", ALT_EN));

    assertThat(response.getStatusCode().value()).isEqualTo(201);
    JsonNode json = ApiClient.json(response);
    assertThat(json.path("id").asLong()).isPositive();
    assertThat(json.path("width").asInt()).isEqualTo(2560);
    assertThat(json.path("height").asInt()).isEqualTo(1920);
    assertThat(json.path("mime").asString()).isEqualTo("image/jpeg");
    assertThat(json.path("altVi").asString()).isEqualTo(ALT_VI);
    assertThat(json.path("altEn").asString()).isEqualTo(ALT_EN);
    String url = json.path("url").asString();
    assertThat(url).matches("/media/2031/01/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.jpg");
    assertThat(url).doesNotContain("Holiday");

    String path = url.substring("/media/".length());
    Path file = mediaDir.resolve(path);
    assertThat(files()).containsExactly(file.toAbsolutePath().normalize());
    byte[] saved = Files.readAllBytes(file);
    var image = TestImages.decode(saved);
    assertThat(image.getWidth()).isEqualTo(2560);
    assertThat(image.getHeight()).isEqualTo(1920);
    assertThat(TestImages.jpegMarkers(saved)).doesNotContain(TestImages.APP1);
    assertThat(TestImages.contains(saved, "Exif")).isFalse();
    var row = jdbc.queryForMap("select * from media where id = ?", json.path("id").asLong());
    assertThat(row.get("path")).isEqualTo(path);
    assertThat(row.get("mime")).isEqualTo("image/jpeg");
    assertThat(row.get("width")).isEqualTo(2560);
    assertThat(row.get("height")).isEqualTo(1920);
    assertThat(row.get("size_bytes")).isEqualTo((long) saved.length);
    assertThat(row.get("alt_vi")).isEqualTo(ALT_VI);
    assertThat(row.get("alt_en")).isEqualTo(ALT_EN);
  }

  @Test
  void aPhotoWithOrientationSixIsStoredUpright() {
    var client = loggedInClient();
    byte[] source = TestImages.jpegWithSegments(400, 300, TestImages.exifSegment(6, true));

    var response = client.post("/admin/media", form(source, "p.jpg", "image/jpeg", ALT_VI, ALT_EN));

    assertThat(response.getStatusCode().value()).isEqualTo(201);
    JsonNode json = ApiClient.json(response);
    assertThat(json.path("width").asInt()).isEqualTo(300);
    assertThat(json.path("height").asInt()).isEqualTo(400);
  }

  @Test
  void aPngIsStoredAsPngWithoutMetadataChunks() throws IOException {
    var client = loggedInClient();
    byte[] source = TestImages.pngWithMetadataChunks(TestImages.png(120, 90, true));

    var response = client.post("/admin/media", form(source, "logo.png", "image/png", ALT_VI, ALT_EN));

    assertThat(response.getStatusCode().value()).isEqualTo(201);
    JsonNode json = ApiClient.json(response);
    assertThat(json.path("mime").asString()).isEqualTo("image/png");
    assertThat(json.path("url").asString()).endsWith(".png");
    byte[] saved = Files.readAllBytes(mediaDir.resolve(json.path("url").asString().substring("/media/".length())));
    assertThat(TestImages.pngChunkTypes(saved)).doesNotContain("eXIf", "tEXt", "iTXt", "zTXt");
  }

  @Test
  void aWebpIsStoredAsJpeg() {
    var client = loggedInClient();
    byte[] webp = Base64.getDecoder().decode(TestImages.WEBP_1X1);

    var response = client.post("/admin/media", form(webp, "a.webp", "image/webp", ALT_VI, ALT_EN));

    assertThat(response.getStatusCode().value()).isEqualTo(201);
    assertThat(ApiClient.json(response).path("mime").asString()).isEqualTo("image/jpeg");
  }

  @Test
  void textNamedJpgIsRefusedAndNothingIsStored() {
    var client = loggedInClient();
    byte[] fake = "just some text".getBytes(java.nio.charset.StandardCharsets.UTF_8);

    var response = client.post("/admin/media", form(fake, "fake.jpg", "image/jpeg", ALT_VI, ALT_EN));

    assertProblem(response, 415, "Chỉ nhận ảnh JPEG, PNG hoặc WebP.");
    assertNothingStored();
  }

  @Test
  void heicIsRefusedWithItsOwnMessage() {
    var client = loggedInClient();

    var response =
        client.post("/admin/media", form(TestImages.HEIC, "p.heic", "image/heic", ALT_VI, ALT_EN));

    assertProblem(response, 415, "Ảnh HEIC chưa được hỗ trợ. Hãy chọn ảnh JPEG hoặc PNG.");
    assertNothingStored();
  }

  @Test
  void anImageWithTooManyPixelsIsRefused() {
    var client = loggedInClient();

    var response =
        client.post(
            "/admin/media",
            form(TestImages.binaryPng(7000, 6000), "big.png", "image/png", ALT_VI, ALT_EN));

    assertProblem(response, 415, "Ảnh quá lớn. Hãy chọn ảnh nhỏ hơn 40 megapixel.");
    assertNothingStored();
  }

  @Test
  void aMissingAltEnIsRefused() {
    var client = loggedInClient();

    var response =
        client.post("/admin/media", form(TestImages.jpeg(20, 20), "a.jpg", "image/jpeg", ALT_VI, null));

    assertProblem(response, 400, "Mô tả ảnh (tiếng Anh) không được để trống.");
    assertNothingStored();
  }

  @Test
  void aBlankAltViIsRefused() {
    var client = loggedInClient();

    var response =
        client.post("/admin/media", form(TestImages.jpeg(20, 20), "a.jpg", "image/jpeg", "   ", ALT_EN));

    assertProblem(response, 400, "Mô tả ảnh (tiếng Việt) không được để trống.");
    assertNothingStored();
  }

  @Test
  void anAltTextOfMoreThanThreeHundredCharactersIsRefused() {
    var client = loggedInClient();

    var tooLong =
        client.post(
            "/admin/media",
            form(TestImages.jpeg(20, 20), "a.jpg", "image/jpeg", ALT_VI, "x".repeat(301)));
    var exactly =
        client.post(
            "/admin/media",
            form(TestImages.jpeg(20, 20), "a.jpg", "image/jpeg", "y".repeat(300), ALT_EN));

    assertProblem(tooLong, 400, "Mô tả ảnh (tiếng Anh) dài tối đa 300 ký tự.");
    assertThat(exactly.getStatusCode().value()).isEqualTo(201);
  }

  @Test
  void aMissingFileIsRefused() {
    var client = loggedInClient();
    var form = new LinkedMultiValueMap<String, Object>();
    form.add("altVi", ALT_VI);
    form.add("altEn", ALT_EN);

    var response = client.post("/admin/media", form);

    assertProblem(response, 400, "Chưa chọn ảnh để tải lên.");
    assertNothingStored();
  }

  @Test
  void aMultipartBodyWithoutABoundaryIsRefusedWith400() {
    var client = loggedInClient();

    var response = client.postRaw("/admin/media", "multipart/form-data", new byte[] {1, 2, 3});

    assertProblem(response, 400, "Nội dung gửi lên không đọc được.");
    assertNothingStored();
  }

  @Test
  void aMultipartBodyThatIsCutShortIsRefusedWith400() {
    var client = loggedInClient();
    String cut =
        "--xyz\r\nContent-Disposition: form-data; name=\"file\"; filename=\"a.jpg\"\r\n"
            + "Content-Type: image/jpeg\r\n\r\nabc";

    var response =
        client.postRaw(
            "/admin/media",
            "multipart/form-data; boundary=xyz",
            cut.getBytes(java.nio.charset.StandardCharsets.UTF_8));

    assertProblem(response, 400, "Nội dung gửi lên không đọc được.");
    assertNothingStored();
  }

  @Test
  void aFileOfMoreThanFifteenMegabytesGetsA413() {
    var client = loggedInClient();
    byte[] big = new byte[16 * 1024 * 1024];

    var response = client.post("/admin/media", form(big, "huge.jpg", "image/jpeg", ALT_VI, ALT_EN));

    assertProblem(response, 413, "Ảnh quá lớn. Tối đa 15 MB.");
    assertNothingStored();
  }

  @Test
  void aFileJustOverTheFileLimitButInsideTheRequestLimitGetsA413() {
    var client = loggedInClient();
    byte[] big = new byte[15 * 1024 * 1024 + 512 * 1024];

    var response = client.post("/admin/media", form(big, "huge.jpg", "image/jpeg", ALT_VI, ALT_EN));

    assertProblem(response, 413, "Ảnh quá lớn. Tối đa 15 MB.");
    assertNothingStored();
  }

  @Test
  void theFileIsRemovedWhenTheDatabaseInsertFails() {
    var client = loggedInClient();
    jdbc.execute(
        """
        create or replace function nepnha_fail_media_insert() returns trigger
        language plpgsql as $$ begin raise exception 'insert refused by the test'; end $$
        """);
    jdbc.execute(
        """
        create trigger nepnha_fail_media_insert before insert on media
        for each row execute function nepnha_fail_media_insert()
        """);

    var response =
        client.post("/admin/media", form(TestImages.jpeg(300, 200), "a.jpg", "image/jpeg", ALT_VI, ALT_EN));

    assertThat(response.getStatusCode().value()).isEqualTo(500);
    assertThat(files()).isEmpty();
    assertThat(count("media")).isZero();
    assertThat(count("audit_log")).isZero();
  }

  // ---- audit ---------------------------------------------------------------------------------

  @Test
  void uploadEditAndDeleteWriteAuditLines() {
    var client = loggedInClient();
    long id = upload(client, "a.jpg");

    client.put("/admin/media/" + id, Map.of("altVi", "Mô tả mới", "altEn", "New text"));
    client.delete("/admin/media/" + id);

    var lines =
        jdbc.queryForList(
            "select action, before_json->>'altVi' as before_alt, after_json->>'altVi' as after_alt,"
                + " after_json->>'url' as after_url, user_id from audit_log"
                + " where entity_type = 'media' and entity_id = ? order by id",
            id);
    assertThat(lines).extracting(l -> l.get("action")).containsExactly("CREATE", "UPDATE", "DELETE");
    assertThat(lines.get(0).get("before_alt")).isNull();
    assertThat(lines.get(0).get("after_alt")).isEqualTo(ALT_VI);
    assertThat((String) lines.get(0).get("after_url")).startsWith("/media/");
    assertThat(lines.get(1).get("before_alt")).isEqualTo(ALT_VI);
    assertThat(lines.get(1).get("after_alt")).isEqualTo("Mô tả mới");
    assertThat(lines.get(2).get("before_alt")).isEqualTo("Mô tả mới");
    assertThat(lines.get(2).get("after_alt")).isNull();
    assertThat(lines).allSatisfy(l -> assertThat(l.get("user_id")).isNotNull());
  }

  @Test
  void aDeletedImageCannotBeRestoredFromTheHistory() {
    var client = loggedInClient();
    long id = upload(client, "a.jpg");
    client.delete("/admin/media/" + id);
    long deleteLine =
        jdbc.queryForObject(
            "select id from audit_log where entity_type = 'media' and action = 'DELETE'", Long.class);

    var response = client.post("/admin/audit/" + deleteLine + "/restore", Map.of());

    assertProblem(response, 409, "Ảnh đã xóa không khôi phục được. Hãy tải ảnh lên lại.");
    assertThat(count("media")).isZero();
  }

  @Test
  void anAltTextChangeOfAnExistingImageCannotBeRestoredEither() {
    var client = loggedInClient();
    long id = upload(client, "a.jpg");
    client.put("/admin/media/" + id, Map.of("altVi", "Mô tả mới", "altEn", "New text"));
    long updateLine =
        jdbc.queryForObject(
            "select id from audit_log where entity_type = 'media' and action = 'UPDATE'",
            Long.class);

    var response = client.post("/admin/audit/" + updateLine + "/restore", Map.of());

    assertProblem(response, 409, "Không khôi phục được thay đổi của ảnh. Hãy sửa lại chữ mô tả.");
    assertThat(jdbc.queryForObject("select alt_vi from media where id = ?", String.class, id))
        .isEqualTo("Mô tả mới");
  }

  // ---- edit ----------------------------------------------------------------------------------

  @Test
  void theAltTextsCanBeChangedAndNothingElse() {
    var client = loggedInClient();
    long id = upload(client, "a.jpg");
    String pathBefore = jdbc.queryForObject("select path from media where id = ?", String.class, id);

    var response =
        client.put("/admin/media/" + id, Map.of("altVi", " Mô tả mới ", "altEn", "New text"));

    assertThat(response.getStatusCode().value()).isEqualTo(200);
    JsonNode json = ApiClient.json(response);
    assertThat(json.path("altVi").asString()).isEqualTo("Mô tả mới");
    assertThat(json.path("altEn").asString()).isEqualTo("New text");
    assertThat(json.path("url").asString()).isEqualTo("/media/" + pathBefore);
    assertThat(jdbc.queryForObject("select alt_vi from media where id = ?", String.class, id))
        .isEqualTo("Mô tả mới");
    assertThat(files()).hasSize(1);
  }

  @Test
  void aBlankAltTextIsRefusedOnEdit() {
    var client = loggedInClient();
    long id = upload(client, "a.jpg");

    var response = client.put("/admin/media/" + id, Map.of("altVi", ALT_VI, "altEn", " "));

    assertProblem(response, 400, "Mô tả ảnh (tiếng Anh) không được để trống.");
    assertThat(jdbc.queryForObject("select alt_en from media where id = ?", String.class, id))
        .isEqualTo(ALT_EN);
  }

  @Test
  void anUnknownImageIsNotFound() {
    var client = loggedInClient();

    assertProblem(
        client.put("/admin/media/999999", Map.of("altVi", ALT_VI, "altEn", ALT_EN)),
        404,
        "Không tìm thấy ảnh.");
    assertProblem(client.delete("/admin/media/999999"), 404, "Không tìm thấy ảnh.");
  }

  // ---- list ----------------------------------------------------------------------------------

  @Test
  void theListIsNewestFirstWithFiftyPerPage() {
    var client = loggedInClient();
    for (int i = 0; i < 51; i++) {
      clock.advance(Duration.ofSeconds(1));
      newMedia("2031/01/image-" + i + ".jpg");
    }

    JsonNode first = ApiClient.json(client.get("/admin/media"));
    JsonNode second = ApiClient.json(client.get("/admin/media?page=1"));
    JsonNode third = ApiClient.json(client.get("/admin/media?page=2"));

    assertThat(first).hasSize(50);
    assertThat(first.get(0).path("url").asString()).isEqualTo("/media/2031/01/image-50.jpg");
    assertThat(first.get(49).path("url").asString()).isEqualTo("/media/2031/01/image-1.jpg");
    assertThat(second).hasSize(1);
    assertThat(second.get(0).path("url").asString()).isEqualTo("/media/2031/01/image-0.jpg");
    assertThat(third).isEmpty();
    assertThat(first.get(0).propertyNames())
        .containsExactlyInAnyOrder("id", "url", "width", "height", "mime", "altVi", "altEn");
  }

  @Test
  void imagesWithTheSameTimeAreOrderedByIdNewestFirst() {
    var client = loggedInClient();
    long older = newMedia("2031/01/older.jpg");
    long newer = newMedia("2031/01/newer.jpg");

    JsonNode list = ApiClient.json(client.get("/admin/media"));

    assertThat(list.get(0).path("id").asLong()).isEqualTo(newer);
    assertThat(list.get(1).path("id").asLong()).isEqualTo(older);
  }

  @Test
  void aNegativePageIsRefused() {
    var client = loggedInClient();

    assertProblem(client.get("/admin/media?page=-1"), 400, "Số trang không hợp lệ.");
  }

  // ---- delete --------------------------------------------------------------------------------

  @Test
  void anUnusedImageIsDeletedWithItsFile() {
    var client = loggedInClient();
    long id = upload(client, "a.jpg");
    assertThat(files()).hasSize(1);

    var response = client.delete("/admin/media/" + id);

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    assertThat(count("media")).isZero();
    assertThat(files()).isEmpty();
  }

  @Test
  void aMissingFileDoesNotStopTheDelete() throws IOException {
    var client = loggedInClient();
    long id = upload(client, "a.jpg");
    for (Path file : files()) {
      Files.delete(file);
    }

    var response = client.delete("/admin/media/" + id);

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    assertThat(count("media")).isZero();
  }

  @Test
  void anImageOfAProductCannotBeDeleted() {
    var client = loggedInClient();
    long id = upload(client, "a.jpg");
    long productId = jdbc.queryForObject("insert into product default values returning id", Long.class);
    jdbc.update("insert into product_media (product_id, media_id) values (?, ?)", productId, id);

    assertStillUsed(client, id);
  }

  @Test
  void aCoverOfAStoryCannotBeDeleted() {
    var client = loggedInClient();
    long id = upload(client, "a.jpg");
    jdbc.update("insert into story (cover_media_id) values (?)", id);

    assertStillUsed(client, id);
  }

  @Test
  void anImageOfATimelineEventCannotBeDeleted() {
    var client = loggedInClient();
    long id = upload(client, "a.jpg");
    long eventId =
        jdbc.queryForObject(
            "insert into timeline_event (year) values (2001) returning id", Long.class);
    jdbc.update(
        "insert into timeline_event_media (timeline_event_id, media_id, sort_order)"
            + " values (?, ?, 2)",
        eventId,
        id);

    assertStillUsed(client, id);
  }

  @Test
  void anImageOfAPressMentionCannotBeDeleted() {
    var client = loggedInClient();
    long id = upload(client, "a.jpg");
    jdbc.update(
        "insert into press_mention (url, source_name, media_id) values ('https://a.example', 'A', ?)",
        id);

    assertStillUsed(client, id);
  }

  @Test
  void anImageUsedOnlyInAStoryBodyCannotBeDeleted() {
    var client = loggedInClient();
    long used = upload(client, "a.jpg");
    long free = upload(client, "b.jpg");
    String usedPath = jdbc.queryForObject("select path from media where id = ?", String.class, used);
    long storyId = jdbc.queryForObject("insert into story default values returning id", Long.class);
    jdbc.update(
        "insert into story_translation (story_id, lang, slug, title, body_html)"
            + " values (?, 'vi', 'bai', 'Bài', ?)",
        storyId,
        "<p>Xem <img src=\"/media/" + usedPath + "\" alt=\"x\"></p>");

    var refused = client.delete("/admin/media/" + used);
    assertProblem(refused, 409, "Ảnh đang được dùng.");
    assertThat(count("media")).isEqualTo(2);
    assertThat(files()).hasSize(2);

    var deleted = client.delete("/admin/media/" + free);
    assertThat(deleted.getStatusCode().value()).isEqualTo(204);
    assertThat(count("media")).isEqualTo(1);
    assertThat(files()).hasSize(1);
  }

  // ---- helpers -------------------------------------------------------------------------------

  private void assertStillUsed(ApiClient client, long id) {
    var response = client.delete("/admin/media/" + id);

    assertProblem(response, 409, "Ảnh đang được dùng.");
    assertThat(count("media")).isEqualTo(1);
    assertThat(files()).hasSize(1);
    assertThat(
            jdbc.queryForObject(
                "select count(*) from audit_log where entity_type = 'media' and action = 'DELETE'",
                Integer.class))
        .isZero();
  }

  private static void assertProblem(ResponseEntity<String> response, int status, String detail) {
    assertThat(response.getStatusCode().value()).isEqualTo(status);
    assertThat(response.getHeaders().getContentType().toString()).startsWith("application/problem+json");
    assertThat(ApiClient.json(response).path("detail").asString()).isEqualTo(detail);
  }

  private void assertNothingStored() {
    assertThat(count("media")).isZero();
    assertThat(count("audit_log")).isZero();
    assertThat(files()).isEmpty();
  }

  private long upload(ApiClient client, String name) {
    var response =
        client.post("/admin/media", form(TestImages.jpeg(300, 200), name, "image/jpeg", ALT_VI, ALT_EN));
    assertThat(response.getStatusCode().value()).isEqualTo(201);
    return ApiClient.json(response).path("id").asLong();
  }

  private long newMedia(String path) {
    return mediaRepository
        .save(Media.create(path, "image/jpeg", 800, 600, 12345L, ALT_VI, ALT_EN))
        .getId();
  }

  /** A multipart form like the admin page sends it; a null alt text leaves the field out. */
  private static MultiValueMap<String, Object> form(
      byte[] bytes, String filename, String contentType, String altVi, String altEn) {
    var part = new HttpHeaders();
    part.setContentType(MediaType.parseMediaType(contentType));
    var resource =
        new ByteArrayResource(bytes) {
          @Override
          public String getFilename() {
            return filename;
          }
        };
    var form = new LinkedMultiValueMap<String, Object>();
    form.add("file", new HttpEntity<>(resource, part));
    if (altVi != null) {
      form.add("altVi", altVi);
    }
    if (altEn != null) {
      form.add("altEn", altEn);
    }
    return form;
  }

  private int count(String table) {
    return jdbc.queryForObject("select count(*) from " + table, Integer.class);
  }

  /** Every file below the media folder, as absolute normalized paths. */
  private List<Path> files() {
    if (!Files.exists(mediaDir)) {
      return List.of();
    }
    try (Stream<Path> walk = Files.walk(mediaDir)) {
      return walk.filter(Files::isRegularFile).map(p -> p.toAbsolutePath().normalize()).toList();
    } catch (IOException e) {
      throw new java.io.UncheckedIOException(e);
    }
  }

  private void deleteFolder() throws IOException {
    if (!Files.exists(mediaDir)) {
      return;
    }
    try (Stream<Path> walk = Files.walk(mediaDir)) {
      for (Path p : walk.sorted(Comparator.reverseOrder()).toList()) {
        Files.delete(p);
      }
    }
  }
}
