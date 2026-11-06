package vn.nepnhaxudong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Migration V5 moves the single image of a milestone into the list table {@code
 * timeline_event_media}. The check runs the real migrations in a schema of its own, so the shared
 * test schema is not touched.
 */
@SpringBootTest
@Import(TestcontainersConfig.class)
class TimelineEventMediaMigrationTest {

  private static final String SCHEMA = "v5_check";

  @Autowired DataSource dataSource;
  @Autowired JdbcTemplate jdbc;

  @AfterEach
  void dropSchema() {
    jdbc.execute("drop schema if exists " + SCHEMA + " cascade");
  }

  @Test
  void theImageOfAnExistingMilestoneBecomesTheFirstRowOfItsList() {
    migrateTo("4");
    long mediaId =
        jdbc.queryForObject(
            "insert into " + SCHEMA + ".media (path, mime, width, height, size_bytes, alt_vi, alt_en)"
                + " values ('a.webp', 'image/webp', 1, 1, 1, 'a', 'a') returning id",
            Long.class);
    long withImage =
        jdbc.queryForObject(
            "insert into " + SCHEMA + ".timeline_event (year, media_id) values (2021, ?) returning id",
            Long.class,
            mediaId);
    jdbc.update("insert into " + SCHEMA + ".timeline_event (year) values (2022)");

    migrateTo("5");

    List<Map<String, Object>> rows =
        jdbc.queryForList(
            "select timeline_event_id, media_id, sort_order from " + SCHEMA + ".timeline_event_media");
    assertThat(rows).hasSize(1);
    assertThat(rows.get(0))
        .containsEntry("timeline_event_id", withImage)
        .containsEntry("media_id", mediaId)
        .containsEntry("sort_order", 0);
    assertThat(
            jdbc.queryForList(
                "select column_name from information_schema.columns"
                    + " where table_schema = ? and table_name = 'timeline_event'",
                String.class,
                SCHEMA))
        .doesNotContain("media_id");
    assertThat(
            jdbc.queryForList(
                "select indexname from pg_indexes where schemaname = ?", String.class, SCHEMA))
        .contains("timeline_event_media_media_idx")
        .doesNotContain("timeline_event_media_idx");
  }

  @Test
  void anImageInTheListCannotBeDeletedAndTheListGoesWithItsMilestone() {
    migrateTo("5");
    long mediaId =
        jdbc.queryForObject(
            "insert into " + SCHEMA + ".media (path, mime, width, height, size_bytes, alt_vi, alt_en)"
                + " values ('b.webp', 'image/webp', 1, 1, 1, 'b', 'b') returning id",
            Long.class);
    long eventId =
        jdbc.queryForObject(
            "insert into " + SCHEMA + ".timeline_event (year) values (2021) returning id",
            Long.class);
    jdbc.update(
        "insert into " + SCHEMA + ".timeline_event_media (timeline_event_id, media_id) values (?, ?)",
        eventId,
        mediaId);

    assertThatThrownBy(
            () -> jdbc.update("delete from " + SCHEMA + ".media where id = ?", mediaId))
        .isInstanceOf(DataIntegrityViolationException.class);
    jdbc.update("delete from " + SCHEMA + ".timeline_event where id = ?", eventId);
    assertThat(
            jdbc.queryForObject(
                "select count(*) from " + SCHEMA + ".timeline_event_media", Integer.class))
        .isZero();
  }

  private void migrateTo(String version) {
    Flyway.configure()
        .dataSource(dataSource)
        .schemas(SCHEMA)
        .target(version)
        .load()
        .migrate();
  }
}
