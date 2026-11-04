package vn.nepnhaxudong.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Account changes are written to the audit log (entity type {@code app_user}). The snapshot never
 * holds the password hash or the TOTP secret, and an account change cannot be restored.
 */
class AccountAuditTest extends AuthTestSupport {

  private static final String ADMIN_EMAIL = "admin@example.com";
  private static final String ADMIN_PASSWORD = "correct-password-1";
  private static final String TEMP_PASSWORD = "temporary-password-1";

  @Autowired JdbcTemplate jdbc;

  @BeforeEach
  void emptyLog() {
    jdbc.update("delete from audit_log");
  }

  @Test
  void aCreatedAccountIsAuditedWithoutSecrets() {
    var client = loggedIn();
    long actor = users.findByEmail(ADMIN_EMAIL).orElseThrow().getId();

    var created =
        client.post(
            "/admin/users",
            Map.of(
                "email", "new.person@example.com",
                "displayName", "Bác Hai",
                "temporaryPassword", TEMP_PASSWORD));
    assertThat(created.getStatusCode().value()).isEqualTo(201);
    long id = ApiClient.json(created).path("id").asLong();

    var line = onlyLine();
    assertThat(line.get("entity_type")).isEqualTo("app_user");
    assertThat(line.get("entity_id")).isEqualTo(id);
    assertThat(line.get("action")).isEqualTo("CREATE");
    assertThat(line.get("user_id")).isEqualTo(actor);
    assertThat(line.get("before_json")).isNull();
    JsonNode after = json(line.get("after_json"));
    assertThat(after.path("email").asString()).isEqualTo("new.person@example.com");
    assertThat(after.path("displayName").asString()).isEqualTo("Bác Hai");
    assertThat(after.path("enabled").asBoolean()).isTrue();
    assertThat(after.path("mustChangePassword").asBoolean()).isTrue();
    assertNoSecrets(line);
  }

  @Test
  void disablingAndEnablingAnAccountAreAudited() {
    var client = loggedIn();
    long other = createUser("second@example.com", "second-password-1", false).getId();

    assertThat(client.post("/admin/users/" + other + "/disable", null).getStatusCode().value())
        .isEqualTo(204);
    assertThat(client.post("/admin/users/" + other + "/enable", null).getStatusCode().value())
        .isEqualTo(204);

    var lines = lines();
    assertThat(lines).hasSize(2);
    assertThat(lines).allSatisfy(line -> assertThat(line.get("action")).isEqualTo("UPDATE"));
    assertThat(json(lines.get(0).get("before_json")).path("enabled").asBoolean()).isTrue();
    assertThat(json(lines.get(0).get("after_json")).path("enabled").asBoolean()).isFalse();
    assertThat(json(lines.get(1).get("before_json")).path("enabled").asBoolean()).isFalse();
    assertThat(json(lines.get(1).get("after_json")).path("enabled").asBoolean()).isTrue();
    lines.forEach(AccountAuditTest::assertNoSecrets);
  }

  @Test
  void aPasswordResetIsAuditedWithoutThePassword() {
    var client = loggedIn();
    long other = createUser("second@example.com", "second-password-1", false).getId();

    var reset =
        client.post(
            "/admin/users/" + other + "/reset-password", Map.of("temporaryPassword", TEMP_PASSWORD));
    assertThat(reset.getStatusCode().value()).isEqualTo(204);

    var line = onlyLine();
    assertThat(line.get("action")).isEqualTo("UPDATE");
    assertThat(json(line.get("before_json")).path("mustChangePassword").asBoolean()).isFalse();
    assertThat(json(line.get("after_json")).path("mustChangePassword").asBoolean()).isTrue();
    assertNoSecrets(line);
    assertThat(String.valueOf(line.get("after_json"))).doesNotContain(TEMP_PASSWORD);
  }

  @Test
  void enablingAndDisablingTwoFactorLoginAreAuditedWithoutTheSecret() {
    var client = loggedIn();
    String secret =
        ApiClient.json(client.post("/admin/me/totp/setup", null)).path("secret").asString();
    // Setting the secret up does not change what the account shows, so it is not a line.
    assertThat(lines()).isEmpty();

    assertThat(
            client
                .post("/admin/me/totp/enable", Map.of("code", Totp.code(secret, now())))
                .getStatusCode()
                .value())
        .isEqualTo(204);
    assertThat(
            client
                .post("/admin/me/totp/disable", Map.of("code", Totp.code(secret, now())))
                .getStatusCode()
                .value())
        .isEqualTo(204);

    var lines = lines();
    assertThat(lines).hasSize(2);
    assertThat(json(lines.get(0).get("before_json")).path("totpEnabled").asBoolean()).isFalse();
    assertThat(json(lines.get(0).get("after_json")).path("totpEnabled").asBoolean()).isTrue();
    assertThat(json(lines.get(1).get("before_json")).path("totpEnabled").asBoolean()).isTrue();
    assertThat(json(lines.get(1).get("after_json")).path("totpEnabled").asBoolean()).isFalse();
    lines.forEach(AccountAuditTest::assertNoSecrets);
    assertThat(lines.toString()).doesNotContain(secret);
  }

  @Test
  void aFailedChangeLeavesNoLine() {
    var client = loggedIn();

    var duplicate =
        client.post(
            "/admin/users",
            Map.of(
                "email", ADMIN_EMAIL,
                "displayName", "Trùng",
                "temporaryPassword", TEMP_PASSWORD));

    assertThat(duplicate.getStatusCode().value()).isEqualTo(409);
    assertThat(lines()).isEmpty();
  }

  @Test
  void anAccountChangeCannotBeRestored() {
    var client = loggedIn();
    long other = createUser("second@example.com", "second-password-1", false).getId();
    client.post("/admin/users/" + other + "/disable", null);
    long updateLine = ((Number) onlyLine().get("id")).longValue();

    var response = client.post("/admin/audit/" + updateLine + "/restore", Map.of());

    assertThat(response.getStatusCode().value()).isEqualTo(409);
    assertThat(response.getHeaders().getContentType().toString())
        .startsWith("application/problem+json");
    assertThat(ApiClient.json(response).path("detail").asString())
        .isEqualTo("Không thể khôi phục thay đổi tài khoản.");
    assertThat(users.findById(other).orElseThrow().isEnabled()).isFalse();
    assertThat(lines()).hasSize(1);
  }

  @Test
  void theAuditListShowsTheAccountLinesWithoutSecrets() {
    var client = loggedIn();
    client.post(
        "/admin/users",
        Map.of(
            "email", "new.person@example.com",
            "displayName", "Bác Hai",
            "temporaryPassword", TEMP_PASSWORD));

    var response = client.get("/admin/audit?entityType=app_user");

    assertThat(response.getStatusCode().value()).isEqualTo(200);
    assertThat(ApiClient.json(response)).hasSize(1);
    assertThat(response.getBody())
        .doesNotContainIgnoringCase("passwordHash")
        .doesNotContainIgnoringCase("password_hash")
        .doesNotContainIgnoringCase("totpSecret")
        .doesNotContain("argon2")
        .doesNotContain(TEMP_PASSWORD);
  }

  // ---- helpers -------------------------------------------------------------------------------

  private ApiClient loggedIn() {
    createUser(ADMIN_EMAIL, ADMIN_PASSWORD, false);
    var client = newClient();
    assertThat(login(client, ADMIN_EMAIL, ADMIN_PASSWORD).getStatusCode().value()).isEqualTo(200);
    client.fetchCsrf();
    return client;
  }

  private long now() {
    return clock.instant().getEpochSecond();
  }

  private List<Map<String, Object>> lines() {
    return jdbc.queryForList(
        "select id, user_id, entity_type, entity_id, action, before_json::text as before_json,"
            + " after_json::text as after_json from audit_log where entity_type = 'app_user'"
            + " order by id");
  }

  private Map<String, Object> onlyLine() {
    var lines = lines();
    assertThat(lines).hasSize(1);
    return lines.get(0);
  }

  private static JsonNode json(Object text) {
    return JsonMapper.builder().build().readTree(String.valueOf(text));
  }

  /** The snapshot is the admin summary: no password hash, no TOTP secret. */
  private static void assertNoSecrets(Map<String, Object> line) {
    String all = line.get("before_json") + " " + line.get("after_json");
    assertThat(all)
        .doesNotContainIgnoringCase("passwordHash")
        .doesNotContainIgnoringCase("password_hash")
        .doesNotContainIgnoringCase("totpSecret")
        .doesNotContainIgnoringCase("totp_secret")
        .doesNotContain("argon2")
        .doesNotContain("$");
  }
}
