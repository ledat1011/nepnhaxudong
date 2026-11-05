package vn.nepnhaxudong;

import static org.assertj.core.api.Assertions.assertThat;

import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Migration V3 adds the "Hiện trên web" switch. The products that exist before it stay on the
 * website; a product created after it is hidden until someone shows it. The check runs the real
 * migrations in a schema of its own, so the shared test schema is not touched.
 */
@SpringBootTest
@Import(TestcontainersConfig.class)
class ProductVisibleMigrationTest {

  private static final String SCHEMA = "v3_check";

  @Autowired DataSource dataSource;
  @Autowired JdbcTemplate jdbc;

  @AfterEach
  void dropSchema() {
    jdbc.execute("drop schema if exists " + SCHEMA + " cascade");
  }

  @Test
  void productsThatExistBeforeV3StayVisibleAndNewOnesAreHidden() {
    migrateTo("2");
    jdbc.update("insert into " + SCHEMA + ".product (sort_order) values (0)");

    migrateTo("3");
    jdbc.update("insert into " + SCHEMA + ".product (sort_order) values (1)");

    assertThat(
            jdbc.queryForList(
                "select visible from " + SCHEMA + ".product order by sort_order", Boolean.class))
        .containsExactly(true, false);
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
