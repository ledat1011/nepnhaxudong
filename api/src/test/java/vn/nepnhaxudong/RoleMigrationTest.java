package vn.nepnhaxudong;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * The upgrade to roles (V4): the first account becomes the owner ("Chủ"), every other account a
 * member ("Người nhà"), and an enabled owner always exists. Each test migrates its own schema up to
 * V2, adds accounts as they were before V4, and then runs the rest of the migrations.
 */
@SpringBootTest
@Import(TestcontainersConfig.class)
class RoleMigrationTest {

  private static final String SCHEMA = "role_migration_check";

  @Autowired DataSource dataSource;
  @Autowired JdbcTemplate jdbc;

  @AfterEach
  void dropSchema() {
    jdbc.execute("drop schema if exists " + SCHEMA + " cascade");
  }

  @Test
  void theFirstAccountBecomesTheOwnerAndTheOthersMembers() {
    migrate("2");
    insertUser("first@example.com", true);
    insertUser("second@example.com", true);
    insertUser("third@example.com", false);

    migrate("latest");

    assertThat(roles())
        .containsExactly(
            Map.of("email", "first@example.com", "role", "OWNER"),
            Map.of("email", "second@example.com", "role", "MEMBER"),
            Map.of("email", "third@example.com", "role", "MEMBER"));
    assertThat(
            jdbc.queryForObject(
                "select count(*) from " + SCHEMA + ".app_user where must_setup_totp", Integer.class))
        .isZero();
  }

  @Test
  void whenTheFirstAccountIsDisabledTheOldestEnabledOneBecomesAnOwnerToo() {
    migrate("2");
    insertUser("first@example.com", false);
    insertUser("second@example.com", true);
    insertUser("third@example.com", true);

    migrate("latest");

    assertThat(roles())
        .containsExactly(
            Map.of("email", "first@example.com", "role", "OWNER"),
            Map.of("email", "second@example.com", "role", "OWNER"),
            Map.of("email", "third@example.com", "role", "MEMBER"));
  }

  @Test
  void anEmptyTableStaysEmpty() {
    migrate("2");

    migrate("latest");

    assertThat(roles()).isEmpty();
  }

  private void migrate(String target) {
    Flyway.configure()
        .dataSource(dataSource)
        .schemas(SCHEMA)
        .createSchemas(true)
        .target(target)
        .load()
        .migrate();
  }

  private void insertUser(String email, boolean enabled) {
    jdbc.update(
        "insert into " + SCHEMA + ".app_user (email, display_name, password_hash, enabled) values (?, ?, ?, ?)",
        email,
        "Tester",
        "not-a-hash",
        enabled);
  }

  private List<Map<String, Object>> roles() {
    return jdbc.queryForList("select email, role from " + SCHEMA + ".app_user order by id");
  }
}
