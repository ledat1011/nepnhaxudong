package vn.nepnhaxudong.product;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;

import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import tools.jackson.databind.JsonNode;
import vn.nepnhaxudong.audit.AuditAction;
import vn.nepnhaxudong.audit.AuditService;
import vn.nepnhaxudong.auth.ApiClient;
import vn.nepnhaxudong.auth.AuthTestSupport;
import vn.nepnhaxudong.media.Media;
import vn.nepnhaxudong.media.MediaRepository;

class ProductAdminTest extends AuthTestSupport {

  private static final String NAME_VI = "Nếp cái hoa vàng 🌾";
  private static final String NAME_EN = "Yellow-flower sticky rice";
  private static final String ALL_TONE_MARKS =
      "Gạo nếp cái hoa vàng, dẻo thơm: à á ả ã ạ ă ằ ắ ẳ ẵ ặ â ầ ấ ẩ ẫ ậ è é ẻ ẽ ẹ ê ề ế ể ễ ệ "
          + "ì í ỉ ĩ ị ò ó ỏ õ ọ ô ồ ố ổ ỗ ộ ơ ờ ớ ở ỡ ợ ù ú ủ ũ ụ ư ừ ứ ử ữ ự ỳ ý ỷ ỹ ỵ đ "
          + "À Á Ả Ã Ạ Ă Ằ Ắ Ẳ Ẵ Ặ Â Ầ Ấ Ẩ Ẫ Ậ Ê Ề Ế Ể Ễ Ệ Ô Ồ Ố Ổ Ỗ Ộ Ơ Ờ Ớ Ở Ỡ Ợ Ư Ừ Ứ Ử Ữ Ự Đ";
  private static final String NAME_REQUIRED = "Tên sản phẩm (tiếng Việt) không được để trống.";
  private static final String NOT_FOUND = "Không tìm thấy sản phẩm.";

  @Autowired JdbcTemplate jdbc;
  @Autowired MediaRepository mediaRepository;
  @MockitoBean AuditService audit;

  @BeforeEach
  void emptyProductTables() {
    jdbc.update("delete from product");
    jdbc.update("delete from media");
  }

  // ---- access ---------------------------------------------------------------------------

  @Test
  void aVisitorWhoIsNotLoggedInIsRefused() {
    var client = newClient();

    assertThat(client.get("/admin/products").getStatusCode().value()).isEqualTo(401);
    assertThat(client.get("/admin/products/1").getStatusCode().value()).isEqualTo(401);
  }

  // ---- create and read ---------------------------------------------------------------------

  @Test
  void createdProductReadsBackCharacterForCharacter() {
    var client = loggedIn();
    var body = fullBody();
    body.put("name", text(NAME_VI, NAME_EN));
    body.put("description", text(ALL_TONE_MARKS, "Soft and fragrant."));

    var created = client.post("/admin/products", body);

    assertThat(created.getStatusCode().value()).isEqualTo(201);
    long id = ApiClient.json(created).path("id").asLong();
    JsonNode read = ApiClient.json(client.get("/admin/products/" + id));
    assertThat(read.path("name").path("vi").asString()).isEqualTo(NAME_VI);
    assertThat(read.path("name").path("en").asString()).isEqualTo(NAME_EN);
    assertThat(read.path("description").path("vi").asString()).isEqualTo(ALL_TONE_MARKS);
    assertThat(ApiClient.json(created).path("name").path("vi").asString()).isEqualTo(NAME_VI);
    String storedName =
        jdbc.queryForObject(
            "select name from product_translation where product_id = ? and lang = 'vi'",
            String.class,
            id);
    assertThat(storedName).isEqualTo(NAME_VI);
  }

  @Test
  void theJsonShapeMatchesTheContract() {
    var client = loggedIn();
    long mediaId = newMedia("shape.webp");
    var body = fullBody();
    body.put("sortOrder", 3);
    body.put("showPrice", true);
    body.put("mediaIds", List.of(mediaId));

    JsonNode read = ApiClient.json(client.post("/admin/products", body));

    assertThat(read.path("id").asLong()).isPositive();
    assertThat(read.path("sortOrder").asInt()).isEqualTo(3);
    assertThat(read.path("showPrice").asBoolean()).isTrue();
    assertThat(read.path("features").path("vi")).hasSize(2);
    assertThat(read.path("features").path("vi").get(0).asString()).isEqualTo("Dẻo");
    assertThat(read.path("features").path("en")).hasSize(2);
    assertThat(read.path("cookingTips").path("vi").asString()).isEqualTo("Ngâm 8 tiếng.");
    assertThat(read.path("packagings")).hasSize(2);
    assertThat(read.path("packagings").get(0).path("weightGrams").asInt()).isEqualTo(1000);
    assertThat(read.path("packagings").get(0).path("priceVnd").asLong()).isEqualTo(90000);
    assertThat(read.path("packagings").get(0).path("sortOrder").asInt()).isZero();
    assertThat(read.path("packagings").get(1).path("sortOrder").asInt()).isEqualTo(1);
    assertThat(read.path("mediaIds")).hasSize(1);
    assertThat(read.path("mediaIds").get(0).asLong()).isEqualTo(mediaId);
    assertThat(read.path("missingEn").asBoolean()).isFalse();
  }

  @Test
  void aBlankEnglishTextIsStoredAsNullNotAsAnEmptyString() {
    var client = loggedIn();
    var body = fullBody();
    body.put("name", text(NAME_VI, NAME_EN));
    body.put("description", text("Mô tả", "   "));
    body.put("cookingTips", text("Mẹo", ""));

    long id = ApiClient.json(client.post("/admin/products", body)).path("id").asLong();

    assertThat(
            jdbc.queryForObject(
                "select description is null from product_translation where product_id = ? and lang = 'en'",
                Boolean.class,
                id))
        .isTrue();
    assertThat(
            jdbc.queryForObject(
                "select cooking_tips is null from product_translation where product_id = ? and lang = 'en'",
                Boolean.class,
                id))
        .isTrue();
    JsonNode read = ApiClient.json(client.get("/admin/products/" + id));
    assertThat(read.path("description").path("en").isNull()).isTrue();
    assertThat(read.path("missingEn").asBoolean()).isTrue();
  }

  @Test
  void aProductWithoutAnyEnglishTextHasNoEnglishRow() {
    var client = loggedIn();
    var body = fullBody();
    body.put("name", text(NAME_VI, null));
    body.put("description", text("Mô tả", null));
    body.put("features", features(List.of("Dẻo"), List.of()));
    body.put("cookingTips", text("Mẹo", null));

    long id = ApiClient.json(client.post("/admin/products", body)).path("id").asLong();

    assertThat(
            jdbc.queryForObject(
                "select count(*) from product_translation where product_id = ? and lang = 'en'",
                Integer.class,
                id))
        .isZero();
    JsonNode read = ApiClient.json(client.get("/admin/products/" + id));
    assertThat(read.path("name").path("en").isNull()).isTrue();
    assertThat(read.path("features").path("en")).isEmpty();
    assertThat(read.path("missingEn").asBoolean()).isTrue();
  }

  @Test
  void theListIsOrderedBySortOrderThenId() {
    var client = loggedIn();
    long second = create(client, "Thứ hai", 5);
    long third = create(client, "Thứ ba", 5);
    long first = create(client, "Thứ nhất", 1);

    JsonNode list = ApiClient.json(client.get("/admin/products"));

    assertThat(list).hasSize(3);
    assertThat(list.get(0).path("id").asLong()).isEqualTo(first);
    assertThat(list.get(1).path("id").asLong()).isEqualTo(second);
    assertThat(list.get(2).path("id").asLong()).isEqualTo(third);
  }

  // ---- validation ------------------------------------------------------------------------

  @Test
  void aMissingVietnameseNameIsRefusedWithAVietnameseDetail() {
    var client = loggedIn();
    var body = fullBody();
    body.put("name", text(null, NAME_EN));

    var response = client.post("/admin/products", body);

    assertThat(response.getStatusCode().value()).isEqualTo(400);
    assertThat(ApiClient.json(response).path("detail").asString()).isEqualTo(NAME_REQUIRED);
    assertThat(count("product")).isZero();
  }

  @Test
  void aBlankOrAbsentNameIsRefusedToo() {
    var client = loggedIn();
    var blank = fullBody();
    blank.put("name", text("   ", NAME_EN));
    var absent = fullBody();
    absent.remove("name");

    for (var body : List.of(blank, absent)) {
      var response = client.post("/admin/products", body);
      assertThat(response.getStatusCode().value()).isEqualTo(400);
      assertThat(ApiClient.json(response).path("detail").asString()).isEqualTo(NAME_REQUIRED);
    }
  }

  @Test
  void aProductNeedsAtLeastOneVietnameseFeature() {
    var client = loggedIn();
    var body = fullBody();
    body.put("features", features(List.of(" "), List.of("Soft")));

    var response = client.post("/admin/products", body);

    assertThat(response.getStatusCode().value()).isEqualTo(400);
    assertThat(ApiClient.json(response).path("detail").asString())
        .isEqualTo("Đặc điểm (tiếng Việt) cần có ít nhất một mục.");
  }

  @Test
  void englishTextWithoutAnEnglishNameIsRefused() {
    var client = loggedIn();
    var body = fullBody();
    body.put("name", text(NAME_VI, null));
    body.put("description", text("Mô tả", "Description"));

    var response = client.post("/admin/products", body);

    assertThat(response.getStatusCode().value()).isEqualTo(400);
    assertThat(ApiClient.json(response).path("detail").asString())
        .isEqualTo("Tên sản phẩm (tiếng Anh) không được để trống khi đã có nội dung tiếng Anh.");
  }

  @Test
  void aWeightOfZeroOrLessIsRefused() {
    var client = loggedIn();
    for (int weight : new int[] {0, -5}) {
      var body = fullBody();
      body.put("packagings", List.of(packaging(weight, 1000L)));

      var response = client.post("/admin/products", body);

      assertThat(response.getStatusCode().value()).isEqualTo(400);
      assertThat(ApiClient.json(response).path("detail").asString())
          .isEqualTo("Khối lượng quy cách phải lớn hơn 0.");
    }
    assertThat(count("product")).isZero();
  }

  @Test
  void aNegativePriceIsRefusedButAMissingPriceIsAllowed() {
    var client = loggedIn();
    var negative = fullBody();
    negative.put("packagings", List.of(packaging(500, -1L)));
    var none = fullBody();
    none.put("packagings", List.of(packaging(500, null)));

    var refused = client.post("/admin/products", negative);
    var accepted = client.post("/admin/products", none);

    assertThat(refused.getStatusCode().value()).isEqualTo(400);
    assertThat(ApiClient.json(refused).path("detail").asString())
        .isEqualTo("Giá quy cách không được âm.");
    assertThat(accepted.getStatusCode().value()).isEqualTo(201);
    assertThat(ApiClient.json(accepted).path("packagings").get(0).path("priceVnd").isNull())
        .isTrue();
  }

  @Test
  void aNullPackagingIsRefusedWith400NotAnError() {
    var client = loggedIn();
    var body = fullBody();
    body.put("packagings", Arrays.asList((Object) null));

    var response = client.post("/admin/products", body);

    assertThat(response.getStatusCode().value()).isEqualTo(400);
    assertThat(ApiClient.json(response).path("detail").asString())
        .isEqualTo("Quy cách không được để trống.");
    assertThat(count("product")).isZero();
  }

  @Test
  void aNullImageIdIsRefusedWith400NotAnError() {
    var client = loggedIn();
    var body = fullBody();
    body.put("mediaIds", Arrays.asList((Object) null));

    var response = client.post("/admin/products", body);

    assertThat(response.getStatusCode().value()).isEqualTo(400);
    assertThat(ApiClient.json(response).path("detail").asString())
        .isEqualTo("Mã ảnh không được để trống.");
    assertThat(count("product")).isZero();
  }

  @Test
  void tooManyPackagingsOrImagesAreRefusedWithTheLimitInTheMessage() {
    var client = loggedIn();
    var tooManyPackagings = fullBody();
    tooManyPackagings.put(
        "packagings",
        Collections.nCopies(ProductRequest.MAX_PACKAGINGS + 1, packaging(100, 1L)));
    var tooManyImages = fullBody();
    tooManyImages.put(
        "mediaIds", Collections.nCopies(ProductRequest.MAX_IMAGES + 1, 1L));

    var packagingsResponse = client.post("/admin/products", tooManyPackagings);
    var imagesResponse = client.post("/admin/products", tooManyImages);

    assertThat(packagingsResponse.getStatusCode().value()).isEqualTo(400);
    assertThat(ApiClient.json(packagingsResponse).path("detail").asString())
        .isEqualTo("Một sản phẩm có tối đa " + ProductRequest.MAX_PACKAGINGS + " quy cách.");
    assertThat(imagesResponse.getStatusCode().value()).isEqualTo(400);
    assertThat(ApiClient.json(imagesResponse).path("detail").asString())
        .isEqualTo("Một sản phẩm có tối đa " + ProductRequest.MAX_IMAGES + " ảnh.");
  }

  @Test
  void anUnknownImageIsRefused() {
    var client = loggedIn();
    var body = fullBody();
    body.put("mediaIds", List.of(987654L));

    var response = client.post("/admin/products", body);

    assertThat(response.getStatusCode().value()).isEqualTo(400);
    assertThat(ApiClient.json(response).path("detail").asString())
        .isEqualTo("Ảnh không tồn tại: 987654.");
    assertThat(count("product")).isZero();
  }

  @Test
  void theSameImageTwiceIsRefused() {
    var client = loggedIn();
    long mediaId = newMedia("twice.webp");
    var body = fullBody();
    body.put("mediaIds", List.of(mediaId, mediaId));

    var response = client.post("/admin/products", body);

    assertThat(response.getStatusCode().value()).isEqualTo(400);
    assertThat(ApiClient.json(response).path("detail").asString())
        .isEqualTo("Ảnh bị chọn hai lần: " + mediaId + ".");
  }

  // ---- update ----------------------------------------------------------------------------

  @Test
  void putReplacesThePackagingsAndTheImagesAndKeepsTheirOrder() {
    var client = loggedIn();
    long a = newMedia("a.webp");
    long b = newMedia("b.webp");
    long c = newMedia("c.webp");
    var body = fullBody();
    body.put("mediaIds", List.of(a, b));
    long id = ApiClient.json(client.post("/admin/products", body)).path("id").asLong();

    var update = fullBody();
    update.put("packagings", List.of(packaging(250, 25000L)));
    update.put("mediaIds", List.of(c, b));
    var response = client.put("/admin/products/" + id, update);

    assertThat(response.getStatusCode().value()).isEqualTo(200);
    JsonNode read = ApiClient.json(client.get("/admin/products/" + id));
    assertThat(read.path("packagings")).hasSize(1);
    assertThat(read.path("packagings").get(0).path("weightGrams").asInt()).isEqualTo(250);
    assertThat(read.path("mediaIds").get(0).asLong()).isEqualTo(c);
    assertThat(read.path("mediaIds").get(1).asLong()).isEqualTo(b);
    assertThat(count("packaging")).isEqualTo(1);
    assertThat(count("product_media")).isEqualTo(2);
    assertThat(
            jdbc.queryForList(
                "select media_id from product_media where product_id = ? order by sort_order",
                Long.class,
                id))
        .containsExactly(c, b);
  }

  @Test
  void putWithAnEmptyListRemovesEveryPackagingAndImage() {
    var client = loggedIn();
    long a = newMedia("only.webp");
    var body = fullBody();
    body.put("mediaIds", List.of(a));
    long id = ApiClient.json(client.post("/admin/products", body)).path("id").asLong();

    var update = fullBody();
    update.put("packagings", List.of());
    update.put("mediaIds", List.of());
    client.put("/admin/products/" + id, update);

    assertThat(count("packaging")).isZero();
    assertThat(count("product_media")).isZero();
    assertThat(count("media")).isEqualTo(1);
  }

  @Test
  void putChangesTheTextAndCanAddAndRemoveTheEnglishVersion() {
    var client = loggedIn();
    var vietnameseOnly = fullBody();
    vietnameseOnly.put("name", text(NAME_VI, null));
    vietnameseOnly.put("description", text("Mô tả", null));
    vietnameseOnly.put("features", features(List.of("Dẻo"), List.of()));
    vietnameseOnly.put("cookingTips", text("Mẹo", null));
    long id = ApiClient.json(client.post("/admin/products", vietnameseOnly)).path("id").asLong();

    var complete = fullBody();
    var added = ApiClient.json(client.put("/admin/products/" + id, complete));
    var removed = ApiClient.json(client.put("/admin/products/" + id, vietnameseOnly));

    assertThat(added.path("missingEn").asBoolean()).isFalse();
    assertThat(added.path("name").path("en").asString()).isEqualTo(NAME_EN);
    assertThat(removed.path("missingEn").asBoolean()).isTrue();
    assertThat(removed.path("name").path("en").isNull()).isTrue();
    assertThat(
            jdbc.queryForObject(
                "select count(*) from product_translation where product_id = ?",
                Integer.class,
                id))
        .isEqualTo(1);
  }

  @Test
  void putTouchesUpdatedAtEvenWhenOnlyTheChildrenChange() {
    var client = loggedIn();
    long id = create(client, "Không đổi", 0);
    Instant before = updatedAt(id);
    clock.advance(Duration.ofHours(2));

    var update = fullBody();
    update.put("name", text("Không đổi", NAME_EN));
    update.put("packagings", List.of(packaging(777, 1L)));
    client.put("/admin/products/" + id, update);

    assertThat(updatedAt(id)).isAfter(before);
  }

  // ---- missingEn -------------------------------------------------------------------------

  @Test
  void missingEnIsTrueWhenAnyEnglishFieldIsMissingAndFalseWhenAllArePresent() {
    var client = loggedIn();

    assertThat(missingEnAfterCreate(client, fullBody())).isFalse();

    var noName = fullBody();
    noName.put("name", text(NAME_VI, null));
    noName.put("description", text("Mô tả", null));
    noName.put("features", features(List.of("Dẻo"), List.of()));
    noName.put("cookingTips", text("Mẹo", null));
    assertThat(missingEnAfterCreate(client, noName)).isTrue();

    var noDescription = fullBody();
    noDescription.put("description", text("Mô tả", null));
    assertThat(missingEnAfterCreate(client, noDescription)).isTrue();

    var noTips = fullBody();
    noTips.put("cookingTips", text("Mẹo", null));
    assertThat(missingEnAfterCreate(client, noTips)).isTrue();

    var noFeatures = fullBody();
    noFeatures.put("features", features(List.of("Dẻo"), List.of()));
    assertThat(missingEnAfterCreate(client, noFeatures)).isTrue();
  }

  @Test
  void aFieldWithoutAnyVietnameseTextDoesNotNeedAnEnglishOne() {
    var client = loggedIn();
    var body = fullBody();
    body.put("description", text(null, null));
    body.put("cookingTips", text(null, null));

    assertThat(missingEnAfterCreate(client, body)).isFalse();
  }

  // ---- not found and delete ---------------------------------------------------------------

  @Test
  void anUnknownIdAnswers404WithAVietnameseDetail() {
    var client = loggedIn();

    var get = client.get("/admin/products/424242");
    var put = client.put("/admin/products/424242", fullBody());
    var delete = client.delete("/admin/products/424242");

    for (var response : List.of(get, put, delete)) {
      assertThat(response.getStatusCode().value()).isEqualTo(404);
      assertThat(ApiClient.json(response).path("detail").asString()).isEqualTo(NOT_FOUND);
    }
  }

  @Test
  void deleteRemovesTheProductAndItsChildrenButNotTheImage() {
    var client = loggedIn();
    long mediaId = newMedia("kept.webp");
    var body = fullBody();
    body.put("mediaIds", List.of(mediaId));
    long id = ApiClient.json(client.post("/admin/products", body)).path("id").asLong();

    var response = client.delete("/admin/products/" + id);

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    assertThat(client.get("/admin/products/" + id).getStatusCode().value()).isEqualTo(404);
    assertThat(count("product")).isZero();
    assertThat(count("product_translation")).isZero();
    assertThat(count("packaging")).isZero();
    assertThat(count("product_media")).isZero();
    assertThat(count("media")).isEqualTo(1);
  }

  // ---- audit -----------------------------------------------------------------------------

  @Test
  void createIsRecordedWithoutABeforeAndWithTheNewProductAsAfter() {
    var client = loggedIn();
    long id = create(client, "Tên mới tạo", 0);

    var after = ArgumentCaptor.forClass(Object.class);
    verify(audit)
        .record(eq("product"), eq(id), eq(AuditAction.CREATE), isNull(), after.capture());
    var snapshot = (ProductAdminDto) after.getValue();
    assertThat(snapshot.id()).isEqualTo(id);
    assertThat(snapshot.name().vi()).isEqualTo("Tên mới tạo");
    assertThat(snapshot.packagings()).hasSize(2);
  }

  @Test
  void updateIsRecordedWithTheOldProductAsBeforeAndTheNewProductAsAfter() {
    var client = loggedIn();
    long id = create(client, "Tên cũ", 0);
    var update = fullBody();
    update.put("name", text("Tên mới", NAME_EN));
    update.put("packagings", List.of(packaging(300, 30000L)));

    client.put("/admin/products/" + id, update);

    var before = ArgumentCaptor.forClass(Object.class);
    var after = ArgumentCaptor.forClass(Object.class);
    verify(audit)
        .record(
            eq("product"), eq(id), eq(AuditAction.UPDATE), before.capture(), after.capture());
    var oldSnapshot = (ProductAdminDto) before.getValue();
    var newSnapshot = (ProductAdminDto) after.getValue();
    assertThat(oldSnapshot.name().vi()).isEqualTo("Tên cũ");
    assertThat(oldSnapshot.packagings()).hasSize(2);
    assertThat(newSnapshot.name().vi()).isEqualTo("Tên mới");
    assertThat(newSnapshot.packagings()).hasSize(1);
    assertThat(oldSnapshot).isNotEqualTo(newSnapshot);
  }

  @Test
  void deleteIsRecordedWithTheOldProductAsBeforeAndWithoutAnAfter() {
    var client = loggedIn();
    long id = create(client, "Sắp xóa", 0);

    client.delete("/admin/products/" + id);

    var before = ArgumentCaptor.forClass(Object.class);
    verify(audit)
        .record(eq("product"), eq(id), eq(AuditAction.DELETE), before.capture(), isNull());
    var snapshot = (ProductAdminDto) before.getValue();
    assertThat(snapshot.id()).isEqualTo(id);
    assertThat(snapshot.name().vi()).isEqualTo("Sắp xóa");
    assertThat(snapshot.packagings()).hasSize(2);
  }

  // ---- helpers ---------------------------------------------------------------------------

  private ApiClient loggedIn() {
    createUser("owner@example.com", "correct-password-1", false);
    var client = newClient();
    assertThat(login(client, "owner@example.com", "correct-password-1").getStatusCode().value())
        .isEqualTo(200);
    client.fetchCsrf();
    return client;
  }

  /** A complete product body: both languages everywhere, two pack sizes, no images. */
  private static Map<String, Object> fullBody() {
    var body = new LinkedHashMap<String, Object>();
    body.put("sortOrder", 0);
    body.put("showPrice", false);
    body.put("name", text(NAME_VI, NAME_EN));
    body.put("description", text("Hạt nếp dẻo thơm.", "Soft, fragrant grains."));
    body.put("features", features(List.of("Dẻo", "Thơm"), List.of("Soft", "Fragrant")));
    body.put("cookingTips", text("Ngâm 8 tiếng.", "Soak for 8 hours."));
    body.put("packagings", List.of(packaging(1000, 90000L), packaging(2000, null)));
    body.put("mediaIds", List.of());
    return body;
  }

  private static Map<String, Object> text(String vi, String en) {
    var text = new LinkedHashMap<String, Object>();
    text.put("vi", vi);
    text.put("en", en);
    return text;
  }

  private static Map<String, Object> features(List<String> vi, List<String> en) {
    return Map.of("vi", vi, "en", en);
  }

  private static Map<String, Object> packaging(int weightGrams, Long priceVnd) {
    var packaging = new LinkedHashMap<String, Object>();
    packaging.put("weightGrams", weightGrams);
    packaging.put("priceVnd", priceVnd);
    return packaging;
  }

  private long create(ApiClient client, String nameVi, int sortOrder) {
    var body = fullBody();
    body.put("name", text(nameVi, NAME_EN));
    body.put("sortOrder", sortOrder);
    var response = client.post("/admin/products", body);
    assertThat(response.getStatusCode().value()).isEqualTo(201);
    return ApiClient.json(response).path("id").asLong();
  }

  private boolean missingEnAfterCreate(ApiClient client, Map<String, Object> body) {
    var response = client.post("/admin/products", body);
    assertThat(response.getStatusCode().value()).isEqualTo(201);
    long id = ApiClient.json(response).path("id").asLong();
    boolean onCreate = ApiClient.json(response).path("missingEn").asBoolean();
    boolean onRead = ApiClient.json(client.get("/admin/products/" + id)).path("missingEn").asBoolean();
    assertThat(onRead).isEqualTo(onCreate);
    return onRead;
  }

  private long newMedia(String path) {
    return mediaRepository
        .save(Media.create(path, "image/webp", 800, 600, 12345L, "Ảnh", "Image"))
        .getId();
  }

  private int count(String table) {
    return jdbc.queryForObject("select count(*) from " + table, Integer.class);
  }

  private Instant updatedAt(long productId) {
    return jdbc.queryForObject(
            "select updated_at from product where id = ?", java.sql.Timestamp.class, productId)
        .toInstant();
  }
}
