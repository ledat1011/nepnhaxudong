package vn.nepnhaxudong.publicapi;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.JsonNode;
import vn.nepnhaxudong.auth.ApiClient;
import vn.nepnhaxudong.auth.AuthTestSupport;
import vn.nepnhaxudong.common.LocalizedList;
import vn.nepnhaxudong.common.LocalizedText;
import vn.nepnhaxudong.media.Media;
import vn.nepnhaxudong.media.MediaRepository;
import vn.nepnhaxudong.press.PressMentionRequest;
import vn.nepnhaxudong.press.PressService;
import vn.nepnhaxudong.product.PackagingDto;
import vn.nepnhaxudong.product.ProductRequest;
import vn.nepnhaxudong.product.ProductService;
import vn.nepnhaxudong.story.StoryRequest;
import vn.nepnhaxudong.story.StoryService;
import vn.nepnhaxudong.timeline.TimelineEventRequest;
import vn.nepnhaxudong.timeline.TimelineService;

/**
 * The public JSON must match the TypeScript types of the web app (web/src/lib/content/types.ts):
 * the tests check the exact field names, and null where the type says {@code | null}.
 */
class PublicApiTest extends AuthTestSupport {

  private static final long FIRST_STORY_EPOCH = Instant.parse("2031-01-01T00:00:00Z").getEpochSecond();

  @Autowired JdbcTemplate jdbc;
  @Autowired MediaRepository mediaRepository;
  @Autowired ProductService products;
  @Autowired TimelineService timeline;
  @Autowired PressService press;
  @Autowired StoryService stories;
  @Autowired ApplicationContext context;

  @BeforeEach
  void emptyTables() {
    jdbc.update("delete from audit_log");
    jdbc.update("delete from product");
    jdbc.update("delete from timeline_event");
    jdbc.update("delete from press_mention");
    jdbc.update("delete from story");
    jdbc.update("delete from site_setting");
    jdbc.update("delete from media");
  }

  // ---- no login, no cookie -------------------------------------------------------------------

  @Test
  void publicEndpointsNeedNoLoginAndSetNoCookieAndCreateNoSession() {
    long storyId = publishedStory("gioi-thieu", "Giới thiệu", "intro", "Introduction");
    int sessionsBefore = count("spring_session");
    var client = newClient();

    for (String path :
        List.of(
            "/public/vi/home",
            "/public/en/home",
            "/public/vi/stories",
            "/public/en/stories?page=0",
            "/public/vi/stories/gioi-thieu",
            "/public/en/stories/intro",
            "/public/vi/stories/khong-co",
            "/public/fr/home")) {
      ResponseEntity<String> response = client.get(path);

      assertThat(response.getStatusCode().value()).as(path).isNotIn(401, 403, 500);
      assertThat(response.getHeaders().get(HttpHeaders.SET_COOKIE)).as(path).isNull();
    }
    assertThat(client.get("/public/vi/home").getStatusCode().value()).isEqualTo(200);
    assertThat(client.get("/public/vi/stories/gioi-thieu").getStatusCode().value()).isEqualTo(200);
    assertThat(count("spring_session")).isEqualTo(sessionsBefore);
    assertThat(storyId).isPositive();
  }

  @Test
  void aLoggedInUserDoesNotGetANewCookieFromAPublicCall() {
    var client = loggedInClient();
    int sessionsBefore = count("spring_session");

    var response = client.get("/public/vi/home");

    assertThat(response.getStatusCode().value()).isEqualTo(200);
    assertThat(response.getHeaders().get(HttpHeaders.SET_COOKIE)).isNull();
    assertThat(count("spring_session")).isEqualTo(sessionsBefore);
  }

  @Test
  void publicPathsAcceptOnlyGet() {
    var anonymous = newClient();
    var loggedIn = loggedInClient();

    for (ApiClient client : List.of(anonymous, loggedIn)) {
      assertThat(client.post("/public/vi/home", Map.of()).getStatusCode().is2xxSuccessful())
          .isFalse();
      assertThat(client.put("/public/vi/home", Map.of()).getStatusCode().is2xxSuccessful())
          .isFalse();
      assertThat(client.delete("/public/vi/home").getStatusCode().is2xxSuccessful()).isFalse();
    }
    assertThat(anonymous.post("/public/vi/home", Map.of()).getStatusCode().value())
        .isIn(401, 403);
  }

  // ---- language ------------------------------------------------------------------------------

  @Test
  void anUnknownLanguageIsNotFoundOnEveryPublicPath() {
    var client = newClient();

    for (String path :
        List.of("/public/fr/home", "/public/fr/stories", "/public/fr/stories/abc")) {
      var response = client.get(path);
      assertThat(response.getStatusCode().value()).as(path).isEqualTo(404);
      assertThat(response.getHeaders().getContentType().toString()).contains("problem+json");
      assertThat(ApiClient.json(response).path("detail").asString())
          .isEqualTo("Không có ngôn ngữ \"fr\".");
    }
  }

  // ---- shape of the home answer --------------------------------------------------------------

  @Test
  void homeHasExactlyTheFieldsOfTheWebTypes() {
    long imageId = newMedia("a.webp");
    shownProduct(
        productRequest(
            "Gạo nếp",
            "Sticky rice",
            true,
            List.of(new PackagingDto(2000, 90000L, null)),
            List.of(imageId)));
    timeline.create(
        new TimelineEventRequest(
            1998, 0, new LocalizedText("Khởi đầu", "Start"), null, List.of(imageId)));
    press.create(
        new PressMentionRequest(
            "https://example.com/a",
            "Báo A",
            LocalDate.of(2024, 5, 6),
            new LocalizedText("Bài báo", "Article"),
            imageId,
            0));
    publishedStory("bai-1", "Bài 1", "post-1", "Post 1");
    insertSettings(true);

    JsonNode home = ApiClient.json(newClient().get("/public/en/home"));

    assertThat(names(home))
        .containsExactlyInAnyOrder(
            "lang", "brand", "products", "timeline", "press", "stories", "contact", "social");
    assertThat(home.path("lang").asString()).isEqualTo("en");
    assertThat(names(home.path("brand"))).containsExactly("tagline");
    JsonNode product = home.path("products").get(0);
    assertThat(names(product))
        .containsExactlyInAnyOrder(
            "name", "description", "features", "cookingTips", "showPrice", "packagings", "images");
    assertThat(product.path("showPrice").asBoolean()).isTrue();
    assertThat(names(product.path("packagings").get(0)))
        .containsExactlyInAnyOrder("weightGrams", "priceVnd");
    assertThat(names(product.path("images").get(0)))
        .containsExactlyInAnyOrder("url", "width", "height", "alt");
    JsonNode event = home.path("timeline").get(0);
    assertThat(names(event)).containsExactlyInAnyOrder("year", "title", "description", "images");
    assertThat(event.path("year").isInt()).isTrue();
    assertThat(names(event.path("images").get(0)))
        .containsExactlyInAnyOrder("url", "width", "height", "alt");
    JsonNode mention = home.path("press").get(0);
    assertThat(names(mention))
        .containsExactlyInAnyOrder("title", "sourceName", "url", "publishedOn", "image");
    assertThat(mention.path("publishedOn").asString()).isEqualTo("2024-05-06");
    JsonNode story = home.path("stories").get(0);
    assertThat(names(story))
        .containsExactlyInAnyOrder("slug", "title", "excerpt", "publishedAt", "cover");
    assertThat(names(home.path("contact")))
        .containsExactlyInAnyOrder("phone", "zalo", "messenger", "address", "mapUrl", "hours");
    assertThat(names(home.path("social")))
        .containsExactlyInAnyOrder("facebook", "youtube", "tiktok");
  }

  @Test
  void aSiteWithNothingInItStillAnswersWithEmptyListsAndNullContactFields() {
    JsonNode home = ApiClient.json(newClient().get("/public/vi/home"));

    assertThat(home.path("brand").path("tagline").isString()).isTrue();
    assertThat(home.path("brand").path("tagline").asString()).isEmpty();
    assertThat(home.path("products").isArray()).isTrue();
    assertThat(home.path("products")).isEmpty();
    assertThat(home.path("timeline")).isEmpty();
    assertThat(home.path("press")).isEmpty();
    assertThat(home.path("stories")).isEmpty();
    for (String field : List.of("phone", "zalo", "messenger", "address", "mapUrl", "hours")) {
      assertThat(home.path("contact").has(field)).as(field).isTrue();
      assertThat(home.path("contact").path(field).isNull()).as(field).isTrue();
    }
    for (String field : List.of("facebook", "youtube", "tiktok")) {
      assertThat(home.path("social").has(field)).as(field).isTrue();
      assertThat(home.path("social").path(field).isNull()).as(field).isTrue();
    }
  }

  // ---- language fallback ---------------------------------------------------------------------

  @Test
  void englishHomeFallsBackToVietnameseWhenThereIsNoEnglishText() {
    shownProduct(
        new ProductRequest(
            0,
            false,
            new LocalizedText("Gạo nếp cái", null),
            new LocalizedText("Mô tả tiếng Việt", null),
            new LocalizedList(List.of("Dẻo", "Thơm"), List.of()),
            new LocalizedText("Nấu bằng nồi hấp", null),
            List.of(),
            List.of()));
    timeline.create(
        new TimelineEventRequest(2000, 0, new LocalizedText("Mốc", null), null, null));
    press.create(
        new PressMentionRequest(
            "https://example.com/p", "Báo", null, new LocalizedText("Tiêu đề báo", null), null, 0));
    stories.publish(
        stories
            .create(
                new StoryRequest(
                    null,
                    new LocalizedText("chi-tieng-viet", null),
                    new LocalizedText("Bài chỉ có tiếng Việt", null),
                    new LocalizedText("Tóm tắt", null),
                    new LocalizedText("<p>Nội dung</p>", null)))
            .id());
    insertSettings(false);

    JsonNode home = ApiClient.json(newClient().get("/public/en/home"));

    JsonNode product = home.path("products").get(0);
    assertThat(product.path("name").asString()).isEqualTo("Gạo nếp cái");
    assertThat(product.path("description").asString()).isEqualTo("Mô tả tiếng Việt");
    assertThat(texts(product.path("features"))).containsExactly("Dẻo", "Thơm");
    assertThat(product.path("cookingTips").asString()).isEqualTo("Nấu bằng nồi hấp");
    assertThat(home.path("timeline").get(0).path("title").asString()).isEqualTo("Mốc");
    assertThat(home.path("timeline").get(0).path("description").asString()).isEmpty();
    assertThat(home.path("press").get(0).path("title").asString()).isEqualTo("Tiêu đề báo");
    JsonNode story = home.path("stories").get(0);
    assertThat(story.path("slug").asString()).isEqualTo("chi-tieng-viet");
    assertThat(story.path("title").asString()).isEqualTo("Bài chỉ có tiếng Việt");
    assertThat(story.path("excerpt").asString()).isEqualTo("Tóm tắt");
    assertThat(home.path("brand").path("tagline").asString()).isEqualTo("Khẩu hiệu");
    assertThat(home.path("contact").path("address").asString()).isEqualTo("Địa chỉ");
    assertThat(home.path("contact").path("hours").asString()).isEqualTo("Giờ làm việc");
  }

  @Test
  void englishHomeUsesTheEnglishTextAndVietnameseHomeKeepsVietnamese() {
    shownProduct(productRequest("Gạo nếp", "Sticky rice", false, List.of(), List.of()));
    timeline.create(
        new TimelineEventRequest(
            2000,
            0,
            new LocalizedText("Mốc", "Milestone"),
            new LocalizedText("Mô tả", "Detail"),
            null));
    insertSettings(true);

    JsonNode en = ApiClient.json(newClient().get("/public/en/home"));
    JsonNode vi = ApiClient.json(newClient().get("/public/vi/home"));

    assertThat(en.path("products").get(0).path("name").asString()).isEqualTo("Sticky rice");
    assertThat(texts(en.path("products").get(0).path("features"))).containsExactly("Feature");
    assertThat(en.path("timeline").get(0).path("title").asString()).isEqualTo("Milestone");
    assertThat(en.path("timeline").get(0).path("description").asString()).isEqualTo("Detail");
    assertThat(en.path("brand").path("tagline").asString()).isEqualTo("Tagline");
    assertThat(en.path("contact").path("address").asString()).isEqualTo("Address");
    assertThat(en.path("contact").path("phone").asString()).isEqualTo("0000 000 000");
    assertThat(vi.path("lang").asString()).isEqualTo("vi");
    assertThat(vi.path("products").get(0).path("name").asString()).isEqualTo("Gạo nếp");
    assertThat(vi.path("timeline").get(0).path("title").asString()).isEqualTo("Mốc");
    assertThat(vi.path("brand").path("tagline").asString()).isEqualTo("Khẩu hiệu");
    assertThat(vi.path("contact").path("address").asString()).isEqualTo("Địa chỉ");
  }

  // ---- products ------------------------------------------------------------------------------

  @Test
  void priceIsNullWhenShowPriceIsFalseAndShownWhenItIsTrue() {
    shownProduct(
        productRequest(
            "Giá ẩn",
            "Hidden",
            false,
            List.of(new PackagingDto(1000, 50000L, null), new PackagingDto(2000, null, null)),
            List.of()));
    shownProduct(
        productRequest(
            "Giá hiện",
            "Shown",
            true,
            List.of(new PackagingDto(500, 30000L, null), new PackagingDto(2000, null, null)),
            List.of()));

    JsonNode list = ApiClient.json(newClient().get("/public/vi/home")).path("products");

    JsonNode hidden = list.get(0);
    assertThat(hidden.path("showPrice").asBoolean()).isFalse();
    assertThat(hidden.path("packagings")).hasSize(2);
    assertThat(hidden.path("packagings").get(0).path("weightGrams").asInt()).isEqualTo(1000);
    assertThat(hidden.path("packagings").get(0).has("priceVnd")).isTrue();
    assertThat(hidden.path("packagings").get(0).path("priceVnd").isNull()).isTrue();
    assertThat(hidden.path("packagings").get(1).path("priceVnd").isNull()).isTrue();
    JsonNode shown = list.get(1);
    assertThat(shown.path("showPrice").asBoolean()).isTrue();
    assertThat(shown.path("packagings").get(0).path("priceVnd").asLong()).isEqualTo(30000L);
    assertThat(shown.path("packagings").get(1).path("priceVnd").isNull()).isTrue();
  }

  @Test
  void productsAreSortedBySortOrderThenId() {
    long first = productWithOrder("Hai a", 2);
    long second = productWithOrder("Một", 1);
    long third = productWithOrder("Hai b", 2);
    assertThat(List.of(first, second, third)).doesNotHaveDuplicates();

    JsonNode list = ApiClient.json(newClient().get("/public/vi/home")).path("products");

    assertThat(texts(list, "name")).containsExactly("Một", "Hai a", "Hai b");
  }

  @Test
  void productImagesAreInOrderAndAltFollowsTheLanguage() {
    long one = newMedia("one.webp");
    long two = newMedia("two.webp");
    shownProduct(productRequest("A", "A en", false, List.of(), List.of(two, one)));

    JsonNode vi = ApiClient.json(newClient().get("/public/vi/home")).path("products").get(0);
    JsonNode en = ApiClient.json(newClient().get("/public/en/home")).path("products").get(0);

    assertThat(texts(vi.path("images"), "url")).containsExactly("/media/two.webp", "/media/one.webp");
    JsonNode image = vi.path("images").get(0);
    assertThat(image.path("width").asInt()).isEqualTo(800);
    assertThat(image.path("height").asInt()).isEqualTo(600);
    assertThat(image.path("alt").asString()).isEqualTo("Ảnh mô tả");
    assertThat(en.path("images").get(0).path("alt").asString()).isEqualTo("Image description");
  }

  // ---- timeline and press --------------------------------------------------------------------

  @Test
  void timelineAndPressAreSortedBySortOrderThenId() {
    for (int order : new int[] {2, 1, 2}) {
      timeline.create(
          new TimelineEventRequest(
              2000 + order, order, new LocalizedText("Mốc " + order, null), null, null));
      press.create(
          new PressMentionRequest(
              "https://example.com/" + order,
              "Báo",
              null,
              new LocalizedText("Bài " + order, null),
              null,
              order));
    }

    JsonNode home = ApiClient.json(newClient().get("/public/vi/home"));

    assertThat(texts(home.path("timeline"), "title")).containsExactly("Mốc 1", "Mốc 2", "Mốc 2");
    assertThat(home.path("timeline").get(0).path("year").asInt()).isEqualTo(2001);
    assertThat(texts(home.path("press"), "title")).containsExactly("Bài 1", "Bài 2", "Bài 2");
  }

  @Test
  void pressWithoutDateOrImageHasNulls() {
    press.create(
        new PressMentionRequest(
            "https://example.com/x", "Báo X", null, new LocalizedText("Tiêu đề", null), null, 0));
    timeline.create(new TimelineEventRequest(1999, 0, new LocalizedText("Mốc", null), null, null));

    JsonNode home = ApiClient.json(newClient().get("/public/vi/home"));

    JsonNode mention = home.path("press").get(0);
    assertThat(mention.path("publishedOn").isNull()).isTrue();
    assertThat(mention.path("image").isNull()).isTrue();
    assertThat(mention.path("url").asString()).isEqualTo("https://example.com/x");
    assertThat(mention.path("sourceName").asString()).isEqualTo("Báo X");
    assertThat(home.path("timeline").get(0).path("images").isArray()).isTrue();
    assertThat(home.path("timeline").get(0).path("images")).isEmpty();
  }

  @Test
  void timelineImagesAreInOrderAndAltFollowsTheLanguage() {
    long one = newMedia("one.webp");
    long two = newMedia("two.webp");
    long three = newMedia("three.webp");
    timeline.create(
        new TimelineEventRequest(
            2001, 0, new LocalizedText("Mốc", "Milestone"), null, List.of(three, one, two)));

    JsonNode vi = ApiClient.json(newClient().get("/public/vi/home")).path("timeline").get(0);
    JsonNode en = ApiClient.json(newClient().get("/public/en/home")).path("timeline").get(0);

    assertThat(texts(en.path("images"), "url"))
        .containsExactly("/media/three.webp", "/media/one.webp", "/media/two.webp");
    assertThat(en.path("images").get(0).path("width").asInt()).isEqualTo(800);
    assertThat(en.path("images").get(0).path("height").asInt()).isEqualTo(600);
    assertThat(en.path("images").get(0).path("alt").asString()).isEqualTo("Image description");
    assertThat(vi.path("images").get(0).path("alt").asString()).isEqualTo("Ảnh mô tả");
  }

  @Test
  void aTimelineImageWhoseRowIsGoneIsLeftOutAndThePageStillAnswers() {
    long kept = newMedia("kept.webp");
    long gone = newMedia("gone.webp");
    timeline.create(
        new TimelineEventRequest(
            2001, 0, new LocalizedText("Mốc", null), null, List.of(gone, kept)));
    deleteMediaPastTheForeignKey(gone);

    var response = newClient().get("/public/vi/home");

    assertThat(response.getStatusCode().value()).isEqualTo(200);
    JsonNode event = ApiClient.json(response).path("timeline").get(0);
    assertThat(texts(event.path("images"), "url")).containsExactly("/media/kept.webp");
  }

  // ---- stories on the home page --------------------------------------------------------------

  @Test
  void homeShowsTheThreeNewestPublishedStoriesAndNoDraft() {
    long coverId = newMedia("cover.webp");
    clock.set(Instant.parse("2031-01-01T00:00:00Z"));
    publishedStory("cu-nhat", "Cũ nhất", null, null);
    clock.set(Instant.parse("2031-01-02T00:00:00Z"));
    publishedStory("hai", "Hai", null, null);
    clock.set(Instant.parse("2031-01-03T00:00:00Z"));
    publishedStory("ba", "Ba", null, null);
    clock.set(Instant.parse("2031-01-04T00:00:00Z"));
    long newest = publishedStory("bon", "Bốn", null, null);
    stories.create(
        new StoryRequest(
            null,
            new LocalizedText("nhap", null),
            new LocalizedText("Bản nháp", null),
            null,
            null));
    var withCover =
        stories.update(
            newest,
            new StoryRequest(
                coverId,
                new LocalizedText("bon", null),
                new LocalizedText("Bốn", null),
                new LocalizedText("Tóm tắt bốn", null),
                null));
    assertThat(withCover.coverMediaId()).isEqualTo(coverId);

    JsonNode list = ApiClient.json(newClient().get("/public/vi/home")).path("stories");

    assertThat(texts(list, "slug")).containsExactly("bon", "ba", "hai");
    JsonNode top = list.get(0);
    assertThat(Instant.parse(top.path("publishedAt").asString()))
        .isEqualTo(Instant.parse("2031-01-04T00:00:00Z"));
    assertThat(top.path("excerpt").asString()).isEqualTo("Tóm tắt bốn");
    assertThat(top.path("cover").path("url").asString()).isEqualTo("/media/cover.webp");
    assertThat(list.get(1).path("cover").isNull()).isTrue();
    assertThat(list.get(1).path("excerpt").asString()).isEmpty();
  }

  // ---- story list ----------------------------------------------------------------------------

  @Test
  void theStoryListHasTwelvePerPageNewestFirstAndOnlyPublishedStories() {
    for (int i = 1; i <= 13; i++) {
      clock.set(Instant.ofEpochSecond(FIRST_STORY_EPOCH + i * 60L));
      publishedStory("bai-" + i, "Bài " + i, null, null);
    }
    stories.create(
        new StoryRequest(
            null, new LocalizedText("nhap", null), new LocalizedText("Nháp", null), null, null));
    var client = newClient();

    JsonNode first = ApiClient.json(client.get("/public/vi/stories"));
    JsonNode zero = ApiClient.json(client.get("/public/vi/stories?page=0"));
    JsonNode second = ApiClient.json(client.get("/public/vi/stories?page=1"));
    var third = client.get("/public/vi/stories?page=2");

    assertThat(first.isArray()).isTrue();
    assertThat(first).hasSize(12);
    assertThat(first).isEqualTo(zero);
    assertThat(texts(first, "slug").get(0)).isEqualTo("bai-13");
    assertThat(texts(first, "slug").get(11)).isEqualTo("bai-2");
    assertThat(texts(second, "slug")).containsExactly("bai-1");
    assertThat(third.getStatusCode().value()).isEqualTo(200);
    assertThat(ApiClient.json(third).isArray()).isTrue();
    assertThat(ApiClient.json(third)).isEmpty();
    assertThat(names(first.get(0)))
        .containsExactlyInAnyOrder("slug", "title", "excerpt", "publishedAt", "cover");
  }

  @Test
  void storiesPublishedAtTheSameTimeAreOrderedByIdDescending() {
    clock.set(Instant.parse("2031-02-01T00:00:00Z"));
    publishedStory("mot", "Một", null, null);
    publishedStory("hai", "Hai", null, null);
    publishedStory("ba", "Ba", null, null);

    JsonNode list = ApiClient.json(newClient().get("/public/vi/stories"));

    assertThat(texts(list, "slug")).containsExactly("ba", "hai", "mot");
  }

  @Test
  void aBadPageNumberIsA400ProblemInVietnameseAndAHugeOneIsAnEmptyList() {
    publishedStory("bai", "Bài", null, null);
    var client = newClient();

    for (String bad : List.of("-1", "abc", "1.5", "99999999999999999999", "%20")) {
      var response = client.get("/public/vi/stories?page=" + bad);
      assertThat(response.getStatusCode().value()).as(bad).isEqualTo(400);
      assertThat(response.getHeaders().getContentType().toString()).contains("problem+json");
      assertThat(ApiClient.json(response).path("detail").asString())
          .as(bad)
          .isEqualTo("Số trang không hợp lệ.");
    }
    for (String huge : List.of("2147483647", "99999999999")) {
      var response = client.get("/public/vi/stories?page=" + huge);
      assertThat(response.getStatusCode().value()).as(huge).isEqualTo(200);
      assertThat(ApiClient.json(response)).as(huge).isEmpty();
    }
    assertThat(ApiClient.json(client.get("/public/vi/stories?page="))).hasSize(1);
  }

  @Test
  void theEnglishListFallsBackToTheVietnameseSlugAndText() {
    publishedStory("co-ca-hai", "Có cả hai", "has-both", "Has both");
    publishedStory("chi-viet", "Chỉ Việt", null, null);

    JsonNode list = ApiClient.json(newClient().get("/public/en/stories"));

    assertThat(texts(list, "slug")).containsExactlyInAnyOrder("has-both", "chi-viet");
    assertThat(texts(list, "title")).containsExactlyInAnyOrder("Has both", "Chỉ Việt");
  }

  // ---- story detail --------------------------------------------------------------------------

  @Test
  void aStoryIsFoundByItsVietnameseSlugWithTheFullShape() {
    long coverId = newMedia("c.webp");
    clock.set(Instant.parse("2031-03-04T05:06:07Z"));
    long id =
        stories
            .create(
                new StoryRequest(
                    coverId,
                    new LocalizedText("mua-gat", "harvest"),
                    new LocalizedText("Mùa gặt", "Harvest"),
                    new LocalizedText("Tóm tắt", "Summary"),
                    new LocalizedText("<p>Nội dung <strong>đậm</strong></p>", "<p>Body</p>")))
            .id();
    stories.publish(id);

    JsonNode story = ApiClient.json(newClient().get("/public/vi/stories/mua-gat"));

    assertThat(names(story))
        .containsExactlyInAnyOrder(
            "slug", "title", "excerpt", "bodyHtml", "publishedAt", "cover", "alternateSlug");
    assertThat(story.path("slug").asString()).isEqualTo("mua-gat");
    assertThat(story.path("title").asString()).isEqualTo("Mùa gặt");
    assertThat(story.path("excerpt").asString()).isEqualTo("Tóm tắt");
    assertThat(story.path("bodyHtml").asString()).isEqualTo("<p>Nội dung <strong>đậm</strong></p>");
    assertThat(Instant.parse(story.path("publishedAt").asString()))
        .isEqualTo(Instant.parse("2031-03-04T05:06:07Z"));
    assertThat(names(story.path("cover")))
        .containsExactlyInAnyOrder("url", "width", "height", "alt");
    assertThat(story.path("cover").path("alt").asString()).isEqualTo("Ảnh mô tả");
    assertThat(story.path("alternateSlug").asString()).isEqualTo("harvest");
  }

  @Test
  void aDraftOrMissingStoryIsNotFoundInBothLanguages() {
    long draft =
        stories
            .create(
                new StoryRequest(
                    null,
                    new LocalizedText("ban-nhap", "draft"),
                    new LocalizedText("Bản nháp", "Draft"),
                    null,
                    null))
            .id();
    assertThat(draft).isPositive();
    long unpublished = publishedStory("da-go", "Đã gỡ", "removed", "Removed");
    stories.unpublish(unpublished);
    var client = newClient();

    for (String path :
        List.of(
            "/public/vi/stories/ban-nhap",
            "/public/en/stories/draft",
            "/public/en/stories/ban-nhap",
            "/public/vi/stories/da-go",
            "/public/en/stories/removed",
            "/public/vi/stories/khong-ton-tai",
            "/public/en/stories/khong-ton-tai")) {
      var response = client.get(path);
      assertThat(response.getStatusCode().value()).as(path).isEqualTo(404);
      assertThat(response.getHeaders().getContentType().toString()).contains("problem+json");
    }
  }

  @Test
  void theVietnamesePageIsNotFoundByTheEnglishSlug() {
    publishedStory("mua-gat", "Mùa gặt", "harvest", "Harvest");

    assertThat(newClient().get("/public/vi/stories/harvest").getStatusCode().value())
        .isEqualTo(404);
  }

  @Test
  void theEnglishPageIsFoundByTheEnglishSlugThenByTheVietnameseSlug() {
    publishedStory("mua-gat", "Mùa gặt", "harvest", "Harvest");
    publishedStory("chi-viet", "Chỉ Việt", null, null);
    var client = newClient();

    JsonNode byEnglish = ApiClient.json(client.get("/public/en/stories/harvest"));
    var byVietnamese = client.get("/public/en/stories/mua-gat");
    JsonNode onlyVietnamese = ApiClient.json(client.get("/public/en/stories/chi-viet"));

    assertThat(byEnglish.path("title").asString()).isEqualTo("Harvest");
    assertThat(byEnglish.path("slug").asString()).isEqualTo("harvest");
    assertThat(byEnglish.path("alternateSlug").asString()).isEqualTo("mua-gat");
    assertThat(byVietnamese.getStatusCode().value()).isEqualTo(200);
    assertThat(ApiClient.json(byVietnamese).path("title").asString()).isEqualTo("Harvest");
    assertThat(ApiClient.json(byVietnamese).path("slug").asString()).isEqualTo("harvest");
    assertThat(onlyVietnamese.path("title").asString()).isEqualTo("Chỉ Việt");
    assertThat(onlyVietnamese.path("slug").asString()).isEqualTo("chi-viet");
  }

  @Test
  void englishLookupPrefersTheEnglishSlugWhenAVietnameseSlugIsTheSameText() {
    publishedStory("trung", "Việt A", null, null);
    publishedStory("khac", "Việt B", "trung", "English B");

    JsonNode story = ApiClient.json(newClient().get("/public/en/stories/trung"));

    assertThat(story.path("title").asString()).isEqualTo("English B");
  }

  @Test
  void alternateSlugIsTheOtherLanguagesOwnSlugOrNull() {
    publishedStory("co-ca-hai", "Có cả hai", "has-both", "Has both");
    publishedStory("chi-viet", "Chỉ Việt", null, null);
    var client = newClient();

    JsonNode viBoth = ApiClient.json(client.get("/public/vi/stories/co-ca-hai"));
    JsonNode viOnly = ApiClient.json(client.get("/public/vi/stories/chi-viet"));
    JsonNode enBoth = ApiClient.json(client.get("/public/en/stories/has-both"));
    JsonNode enFallback = ApiClient.json(client.get("/public/en/stories/chi-viet"));

    assertThat(viBoth.path("alternateSlug").asString()).isEqualTo("has-both");
    assertThat(viOnly.has("alternateSlug")).isTrue();
    assertThat(viOnly.path("alternateSlug").isNull()).isTrue();
    assertThat(enBoth.path("alternateSlug").asString()).isEqualTo("co-ca-hai");
    assertThat(enFallback.path("alternateSlug").asString()).isEqualTo("chi-viet");
  }

  @Test
  void anEmptyEnglishBodyOrExcerptFallsBackToTheVietnameseOne() {
    long id =
        stories
            .create(
                new StoryRequest(
                    null,
                    new LocalizedText("noi-dung", "content"),
                    new LocalizedText("Nội dung", "Content"),
                    new LocalizedText("Tóm tắt", null),
                    new LocalizedText("<p>Thân bài</p>", null)))
            .id();
    stories.publish(id);

    JsonNode en = ApiClient.json(newClient().get("/public/en/stories/content"));

    assertThat(en.path("title").asString()).isEqualTo("Content");
    assertThat(en.path("excerpt").asString()).isEqualTo("Tóm tắt");
    assertThat(en.path("bodyHtml").asString()).isEqualTo("<p>Thân bài</p>");
  }

  @Test
  void aStoryWithoutBodyOrExcerptHasEmptyStringsNotNull() {
    publishedStory("trong", "Trống", null, null);

    JsonNode story = ApiClient.json(newClient().get("/public/vi/stories/trong"));

    assertThat(story.path("bodyHtml").isString()).isTrue();
    assertThat(story.path("bodyHtml").asString()).isEmpty();
    assertThat(story.path("excerpt").isString()).isTrue();
    assertThat(story.path("excerpt").asString()).isEmpty();
    assertThat(story.path("cover").isNull()).isTrue();
  }

  // ---- seed is for dev only ------------------------------------------------------------------

  @Test
  void theDevSeedIsNotPartOfTheDefaultProfile() {
    assertThat(context.containsBean("devSeed")).isFalse();
  }

  // ---- helpers -------------------------------------------------------------------------------

  /** A product with a description, one feature and cooking tips in both languages. */
  private static ProductRequest productRequest(
      String nameVi,
      String nameEn,
      boolean showPrice,
      List<PackagingDto> packagings,
      List<Long> mediaIds) {
    return new ProductRequest(
        0,
        showPrice,
        new LocalizedText(nameVi, nameEn),
        new LocalizedText("Mô tả", "Description"),
        new LocalizedList(List.of("Đặc điểm"), List.of("Feature")),
        new LocalizedText("Cách nấu", "How to cook"),
        packagings,
        mediaIds);
  }

  /** Creates the product and turns "Hiện trên web" on: a new product is hidden. */
  private long shownProduct(ProductRequest request) {
    long id = products.create(request).id();
    products.show(id);
    return id;
  }

  private long productWithOrder(String nameVi, int sortOrder) {
    return shownProduct(
        new ProductRequest(
            sortOrder,
            false,
            new LocalizedText(nameVi, null),
            null,
            new LocalizedList(List.of("Đặc điểm"), null),
            null,
            List.of(),
            List.of()));
  }

  private long publishedStory(String slugVi, String titleVi, String slugEn, String titleEn) {
    long id =
        stories
            .create(
                new StoryRequest(
                    null,
                    new LocalizedText(slugVi, slugEn),
                    new LocalizedText(titleVi, titleEn),
                    null,
                    null))
            .id();
    stories.publish(id);
    return id;
  }

  /** Writes the three settings; without English, every English text is JSON null. */
  private void insertSettings(boolean withEnglish) {
    String tagline = withEnglish ? "\"Tagline\"" : "null";
    String address = withEnglish ? "\"Address\"" : "null";
    String hours = withEnglish ? "\"Hours\"" : "null";
    jdbc.update(
        "insert into site_setting (key, value) values ('brand', ?::jsonb), ('contact', ?::jsonb),"
            + " ('social', ?::jsonb)",
        "{\"tagline\":{\"vi\":\"Khẩu hiệu\",\"en\":" + tagline + "}}",
        "{\"phone\":\"0000 000 000\",\"zalo\":null,\"messenger\":null,"
            + "\"address\":{\"vi\":\"Địa chỉ\",\"en\":"
            + address
            + "},\"mapUrl\":null,\"hours\":{\"vi\":\"Giờ làm việc\",\"en\":"
            + hours
            + "}}",
        "{\"facebook\":\"https://example.com/fb\",\"youtube\":null,\"tiktok\":null}");
  }

  private long newMedia(String path) {
    return mediaRepository
        .save(Media.create(path, "image/webp", 800, 600, 12345L, "Ảnh mô tả", "Image description"))
        .getId();
  }

  /**
   * The foreign key keeps a used image row in place, so the test switches the key checks off for
   * one connection (the Testcontainers user is a superuser) to make the broken state on purpose.
   */
  private void deleteMediaPastTheForeignKey(long mediaId) {
    jdbc.execute(
        (ConnectionCallback<Void>)
            connection -> {
              try (var statement = connection.createStatement()) {
                statement.execute("set session_replication_role = replica");
                try {
                  statement.execute("delete from media where id = " + mediaId);
                } finally {
                  statement.execute("set session_replication_role = origin");
                }
              }
              return null;
            });
  }

  private int count(String table) {
    return jdbc.queryForObject("select count(*) from " + table, Integer.class);
  }

  private static Set<String> names(JsonNode node) {
    return new TreeSet<>(node.propertyNames());
  }

  private static List<String> texts(JsonNode array) {
    var out = new ArrayList<String>();
    for (JsonNode item : array) {
      out.add(item.asString());
    }
    return out;
  }

  private static List<String> texts(JsonNode array, String field) {
    var out = new ArrayList<String>();
    for (JsonNode item : array) {
      out.add(item.path(field).asString());
    }
    return out;
  }
}
