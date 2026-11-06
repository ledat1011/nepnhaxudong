package vn.nepnhaxudong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Import(TestcontainersConfig.class)
@Transactional
class SchemaTest {

  private static final List<String> EXPECTED_TABLES =
      List.of(
          "app_user",
          "product",
          "product_translation",
          "packaging",
          "media",
          "product_media",
          "timeline_event",
          "timeline_event_translation",
          "timeline_event_media",
          "press_mention",
          "press_mention_translation",
          "story",
          "story_translation",
          "site_setting",
          "audit_log",
          "spring_session",
          "spring_session_attributes");

  @Autowired JdbcTemplate jdbc;

  @Test
  void allTablesExist() {
    List<String> tables =
        jdbc.queryForList(
            "select table_name from information_schema.tables where table_schema = 'public'",
            String.class);
    assertThat(tables).containsAll(EXPECTED_TABLES);
  }

  @Test
  void storySlugIsUniquePerLanguage() {
    long storyId = insertStory();
    String sql =
        "insert into story_translation (story_id, lang, slug, title, excerpt, body_html)"
            + " values (?, ?, ?, 't', 'e', 'b')";
    jdbc.update(sql, storyId, "vi", "a");
    long otherStoryId = insertStory();
    assertThatThrownBy(() -> jdbc.update(sql, otherStoryId, "vi", "a"))
        .isInstanceOf(DuplicateKeyException.class);
  }

  @Test
  void translationLanguageMustBeViOrEn() {
    long storyId = insertStory();
    assertThatThrownBy(
            () ->
                jdbc.update(
                    "insert into story_translation (story_id, lang, slug, title, excerpt, body_html)"
                        + " values (?, 'fr', 'a', 't', 'e', 'b')",
                    storyId))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void emailMustBeLowerCase() {
    assertThatThrownBy(
            () ->
                jdbc.update(
                    "insert into app_user (email, display_name, password_hash)"
                        + " values ('Admin@Example.com', 'Admin', 'hash')"))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void mediaInUseCannotBeDeleted() {
    long mediaId =
        jdbc.queryForObject(
            "insert into media (path, mime, width, height, size_bytes, alt_vi, alt_en)"
                + " values ('a.webp', 'image/webp', 1, 1, 1, 'a', 'a') returning id",
            Long.class);
    jdbc.update(
        "insert into story (status, cover_media_id) values ('DRAFT', ?)", mediaId);
    assertThatThrownBy(() -> jdbc.update("delete from media where id = ?", mediaId))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void aPublishedStoryNeedsAPublishDate() {
    // The accepted rows come first: a refused statement aborts the test transaction.
    jdbc.update("insert into story (status, published_at) values ('PUBLISHED', now())");
    jdbc.update("insert into story (status) values ('DRAFT')");
    assertThatThrownBy(() -> jdbc.update("insert into story (status) values ('PUBLISHED')"))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void aSettingNeedsAValue() {
    assertThatThrownBy(() -> jdbc.update("insert into site_setting (key) values ('k')"))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void theListIndexesExist() {
    List<String> indexes =
        jdbc.queryForList(
            "select indexname from pg_indexes where schemaname = 'public'", String.class);
    assertThat(indexes).contains("story_list_idx", "audit_log_created_idx");
  }

  private long insertStory() {
    return jdbc.queryForObject(
        "insert into story (status) values ('DRAFT') returning id", Long.class);
  }
}
