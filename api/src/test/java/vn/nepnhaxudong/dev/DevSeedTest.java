package vn.nepnhaxudong.dev;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import vn.nepnhaxudong.TestcontainersConfig;
import vn.nepnhaxudong.common.ApiException;

/** The seed runs at startup of the profile "dev" and has its own database container. */
@SpringBootTest(webEnvironment = RANDOM_PORT)
@AutoConfigureTestRestTemplate
@Import(TestcontainersConfig.class)
@ActiveProfiles("dev")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class DevSeedTest {

  private static final String MARK = "[MẪU]";
  private static final ApplicationArguments NO_ARGUMENTS = new DefaultApplicationArguments();

  @DynamicPropertySource
  static void mediaFolder(DynamicPropertyRegistry registry) {
    String dir = System.getProperty("java.io.tmpdir") + "/nepnha-seed-media-" + UUID.randomUUID();
    registry.add("app.media.dir", () -> dir);
  }

  @Autowired JdbcTemplate jdbc;
  @Autowired ApplicationContext context;
  @Autowired TestRestTemplate rest;

  private ApplicationRunner seed() {
    return context.getBean("devSeed", ApplicationRunner.class);
  }

  /** Empties every table that the seed writes, so that a test can run the seed on its own. */
  private void emptyContent() {
    jdbc.update("delete from audit_log");
    jdbc.update("delete from product");
    jdbc.update("delete from timeline_event");
    jdbc.update("delete from press_mention");
    jdbc.update("delete from story");
    jdbc.update("delete from site_setting");
    jdbc.update("delete from media");
  }

  @Test
  @Order(1)
  void theSampleContentIsCreatedAtStartup() {
    assertThat(count("product")).isEqualTo(1);
    assertThat(count("timeline_event")).isEqualTo(3);
    assertThat(count("press_mention")).isEqualTo(2);
    assertThat(count("story where status = 'PUBLISHED'")).isEqualTo(2);
    assertThat(count("site_setting")).isEqualTo(3);
  }

  @Test
  @Order(2)
  void theProductHasOnePackagingOfTwoKilogramsAndNoImages() {
    reseed();

    assertThat(
            jdbc.queryForObject(
                "select name from product_translation where lang = 'vi'", String.class))
        .isEqualTo("[MẪU] Gạo nếp cái hoa vàng");
    assertThat(count("packaging")).isEqualTo(1);
    assertThat(jdbc.queryForObject("select weight_grams from packaging", Integer.class))
        .isEqualTo(2000);
    assertThat(count("media")).isZero();
    assertThat(count("product_media")).isZero();
    assertThat(count("timeline_event where media_id is not null")).isZero();
    assertThat(count("press_mention where media_id is not null")).isZero();
    assertThat(count("story where cover_media_id is not null")).isZero();
  }

  @Test
  @Order(3)
  void everySampleStringStartsWithTheMark() {
    reseed();

    List<String> strings =
        jdbc.queryForList(
            """
            select s from (
              select name as s from product_translation
              union all select description from product_translation
              union all select cooking_tips from product_translation
              union all select jsonb_array_elements_text(features) from product_translation
              union all select title from timeline_event_translation
              union all select description from timeline_event_translation
              union all select source_name from press_mention
              union all select title from press_mention_translation
              union all select title from story_translation
              union all select excerpt from story_translation
              union all select value #>> '{address,vi}' from site_setting where key = 'contact'
              union all select value #>> '{address,en}' from site_setting where key = 'contact'
              union all select value #>> '{hours,vi}' from site_setting where key = 'contact'
              union all select value #>> '{hours,en}' from site_setting where key = 'contact'
              union all select value #>> '{tagline,vi}' from site_setting where key = 'brand'
              union all select value #>> '{tagline,en}' from site_setting where key = 'brand'
            ) all_text where s is not null
            """,
            String.class);

    assertThat(strings).hasSizeGreaterThan(20);
    assertThat(strings).allSatisfy(text -> assertThat(text).startsWith(MARK));
    assertThat(jdbc.queryForList("select body_html from story_translation", String.class))
        .allSatisfy(body -> assertThat(body).contains(MARK));
  }

  @Test
  @Order(4)
  void thePlaceholdersAreObviouslyFake() {
    reseed();

    assertThat(jdbc.queryForList("select url from press_mention", String.class))
        .hasSize(2)
        .allSatisfy(url -> assertThat(url).startsWith("https://example.com/"));
    JsonNode contact =
        json(jdbc.queryForObject("select value::text from site_setting where key = 'contact'", String.class));
    assertThat(contact.path("phone").asString()).isEqualTo("0000 000 000");
    assertThat(contact.path("zalo").asString()).isEqualTo("0000000000");
    assertThat(contact.path("mapUrl").asString()).startsWith("https://example.com/");
    assertThat(contact.path("messenger").asString()).startsWith("https://example.com/");
    JsonNode social =
        json(jdbc.queryForObject("select value::text from site_setting where key = 'social'", String.class));
    for (String field : List.of("facebook", "youtube", "tiktok")) {
      assertThat(social.path(field).asString()).as(field).startsWith("https://example.com/");
    }
  }

  @Test
  @Order(5)
  void theStoriesAreInBothLanguagesWithSlugsAndSettingsAreJsonObjects() {
    reseed();

    assertThat(count("story_translation where lang = 'vi'")).isEqualTo(2);
    assertThat(count("story_translation where lang = 'en'")).isEqualTo(2);
    assertThat(count("story where published_at is not null")).isEqualTo(2);
    assertThat(jdbc.queryForList("select slug from story_translation", String.class))
        .allSatisfy(slug -> assertThat(slug).isNotBlank());
    assertThat(count("site_setting where jsonb_typeof(value) = 'object'")).isEqualTo(3);
    assertThat(count("audit_log where entity_type = 'site_setting'")).isEqualTo(3);
  }

  @Test
  @Order(6)
  void runningTheSeedAgainDoesNotDuplicateAnything() throws Exception {
    reseed();

    seed().run(NO_ARGUMENTS);
    seed().run(NO_ARGUMENTS);

    assertThat(count("product")).isEqualTo(1);
    assertThat(count("product_translation")).isEqualTo(2);
    assertThat(count("packaging")).isEqualTo(1);
    assertThat(count("timeline_event")).isEqualTo(3);
    assertThat(count("press_mention")).isEqualTo(2);
    assertThat(count("story")).isEqualTo(2);
    assertThat(count("site_setting")).isEqualTo(3);
  }

  @Test
  @Order(7)
  void theSeedDoesNothingWhenAProductExists() throws Exception {
    emptyContent();
    jdbc.update("insert into product (sort_order, show_price) values (0, false)");

    seed().run(NO_ARGUMENTS);

    assertThat(count("product")).isEqualTo(1);
    assertThat(count("timeline_event")).isZero();
    assertThat(count("press_mention")).isZero();
    assertThat(count("story")).isZero();
    assertThat(count("site_setting")).isZero();
  }

  @Test
  @Order(8)
  void theSeedIsOneTransactionAndLeavesNothingWhenItFails() {
    emptyContent();
    // The second sample story needs this slug, so the seed fails after it wrote the other content.
    long storyId =
        jdbc.queryForObject("insert into story (status) values ('DRAFT') returning id", Long.class);
    jdbc.update(
        "insert into story_translation (story_id, lang, slug, title) values (?, 'vi', ?, 'x')",
        storyId,
        "mau-cau-chuyen-hai");

    assertThatThrownBy(() -> seed().run(NO_ARGUMENTS)).isInstanceOf(ApiException.class);

    assertThat(count("product")).isZero();
    assertThat(count("timeline_event")).isZero();
    assertThat(count("press_mention")).isZero();
    assertThat(count("story")).isEqualTo(1);
    assertThat(count("site_setting")).isZero();
    assertThat(count("audit_log")).isZero();
  }

  @Test
  @Order(9)
  void thePublicHomeShowsTheSample() {
    reseed();

    JsonNode home =
        json(rest.getForObject("/public/vi/home", String.class));

    assertThat(home.path("products")).hasSize(1);
    assertThat(home.path("products").get(0).path("name").asString())
        .isEqualTo("[MẪU] Gạo nếp cái hoa vàng");
    assertThat(home.path("products").get(0).path("images")).isEmpty();
    assertThat(home.path("timeline")).hasSize(3);
    assertThat(home.path("press")).hasSize(2);
    assertThat(home.path("stories")).hasSize(2);
    assertThat(home.path("contact").path("phone").asString()).isEqualTo("0000 000 000");
    assertThat(home.path("brand").path("tagline").asString()).startsWith(MARK);
  }

  private void reseed() {
    emptyContent();
    try {
      seed().run(NO_ARGUMENTS);
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  private static JsonNode json(String text) {
    return JsonMapper.builder().build().readTree(text);
  }

  private int count(String tableAndWhere) {
    return jdbc.queryForObject("select count(*) from " + tableAndWhere, Integer.class);
  }
}
