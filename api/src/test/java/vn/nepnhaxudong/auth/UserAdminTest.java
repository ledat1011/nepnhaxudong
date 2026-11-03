package vn.nepnhaxudong.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.JsonNode;

class UserAdminTest extends AuthTestSupport {

  private static final String ADMIN_EMAIL = "admin@example.com";
  private static final String ADMIN_PASSWORD = "correct-password-1";
  private static final String TEMP_PASSWORD = "temporary-password-1";
  private static final String TOTP_REQUIRED = "Cần mã xác thực 2 lớp.";

  @Autowired JdbcTemplate jdbc;

  // ---- user management -------------------------------------------------------------------

  @Test
  void listShowsEveryUserWithoutSecrets() {
    var client = loggedIn(ADMIN_EMAIL, ADMIN_PASSWORD);
    createUser("second@example.com", "second-password-1", true);

    var response = client.get("/admin/users");

    assertThat(response.getStatusCode().value()).isEqualTo(200);
    JsonNode list = ApiClient.json(response);
    assertThat(list.isArray()).isTrue();
    assertThat(list).hasSize(2);
    JsonNode first = list.get(0);
    assertThat(first.path("email").asString()).isEqualTo(ADMIN_EMAIL);
    assertThat(first.path("enabled").asBoolean()).isTrue();
    assertThat(first.path("totpEnabled").asBoolean()).isFalse();
    assertThat(first.path("mustChangePassword").asBoolean()).isFalse();
    assertThat(first.has("id")).isTrue();
    assertThat(first.has("displayName")).isTrue();
    assertThat(list.get(1).path("mustChangePassword").asBoolean()).isTrue();
    assertThat(response.getBody()).doesNotContainIgnoringCase("password_hash")
        .doesNotContainIgnoringCase("passwordHash")
        .doesNotContainIgnoringCase("totpSecret");
  }

  @Test
  void createdUserMustChangeThePasswordAtTheFirstLogin() {
    var client = loggedIn(ADMIN_EMAIL, ADMIN_PASSWORD);

    var created =
        client.post(
            "/admin/users",
            Map.of(
                "email", "New.Person@Example.com",
                "displayName", "Bác Hai",
                "temporaryPassword", TEMP_PASSWORD));

    assertThat(created.getStatusCode().value()).isEqualTo(201);
    JsonNode body = ApiClient.json(created);
    assertThat(body.path("email").asString()).isEqualTo("new.person@example.com");
    assertThat(body.path("displayName").asString()).isEqualTo("Bác Hai");
    assertThat(body.path("mustChangePassword").asBoolean()).isTrue();
    assertThat(body.path("enabled").asBoolean()).isTrue();
    assertThat(created.getBody()).doesNotContain(TEMP_PASSWORD);

    var stored = users.findByEmail("new.person@example.com").orElseThrow();
    assertThat(encoder.matches(TEMP_PASSWORD, stored.getPasswordHash())).isTrue();
    var newcomer = newClient();
    var login = login(newcomer, "new.person@example.com", TEMP_PASSWORD);
    assertThat(login.getStatusCode().value()).isEqualTo(200);
    assertThat(ApiClient.json(login).path("mustChangePassword").asBoolean()).isTrue();
    assertThat(newcomer.get("/admin/users").getStatusCode().value()).isEqualTo(403);
  }

  @Test
  void duplicateEmailIsRefusedEvenWithAnotherLetterCase() {
    var client = loggedIn(ADMIN_EMAIL, ADMIN_PASSWORD);

    var duplicate =
        client.post(
            "/admin/users",
            Map.of(
                "email", "ADMIN@example.com",
                "displayName", "Trùng",
                "temporaryPassword", TEMP_PASSWORD));

    assertThat(duplicate.getStatusCode().value()).isEqualTo(409);
    assertThat(ApiClient.json(duplicate).path("detail").asString()).isEqualTo("Email đã được dùng.");
    assertThat(users.count()).isEqualTo(1);
  }

  @Test
  void createRejectsBadInputInVietnamese() {
    var client = loggedIn(ADMIN_EMAIL, ADMIN_PASSWORD);

    var shortPassword =
        client.post(
            "/admin/users",
            Map.of("email", "a@example.com", "displayName", "A", "temporaryPassword", "short"));
    assertThat(shortPassword.getStatusCode().value()).isEqualTo(400);
    assertThat(ApiClient.json(shortPassword).path("detail").asString())
        .isEqualTo("Mật khẩu tạm thời phải có ít nhất 12 ký tự.");

    var badEmail =
        client.post(
            "/admin/users",
            Map.of("email", "not-an-email", "displayName", "A", "temporaryPassword", TEMP_PASSWORD));
    assertThat(badEmail.getStatusCode().value()).isEqualTo(400);
    assertThat(ApiClient.json(badEmail).path("detail").asString()).isEqualTo("Email không hợp lệ.");

    var blankName =
        client.post(
            "/admin/users",
            Map.of("email", "a@example.com", "displayName", " ", "temporaryPassword", TEMP_PASSWORD));
    assertThat(blankName.getStatusCode().value()).isEqualTo(400);
    assertThat(users.count()).isEqualTo(1);
  }

  @Test
  void adminCannotDisableTheirOwnAccount() {
    var client = loggedIn(ADMIN_EMAIL, ADMIN_PASSWORD);
    long ownId = users.findByEmail(ADMIN_EMAIL).orElseThrow().getId();

    var response = client.post("/admin/users/" + ownId + "/disable", null);

    assertThat(response.getStatusCode().value()).isEqualTo(409);
    assertThat(ApiClient.json(response).path("detail").asString())
        .isEqualTo("Bạn không thể khóa tài khoản của chính mình.");
    assertThat(users.findById(ownId).orElseThrow().isEnabled()).isTrue();
  }

  @Test
  void disabledUserCannotLogInAndCanAfterEnable() {
    var admin = loggedIn(ADMIN_EMAIL, ADMIN_PASSWORD);
    long otherId = createUser("other@example.com", "other-password-1", false).getId();

    assertThat(admin.post("/admin/users/" + otherId + "/disable", null).getStatusCode().value())
        .isEqualTo(204);
    assertThat(users.findById(otherId).orElseThrow().isEnabled()).isFalse();
    var blocked = login(newClient(), "other@example.com", "other-password-1");
    assertThat(blocked.getStatusCode().value()).isEqualTo(401);
    assertThat(ApiClient.json(blocked).path("detail").asString()).isEqualTo(LOGIN_ERROR);

    assertThat(admin.post("/admin/users/" + otherId + "/enable", null).getStatusCode().value())
        .isEqualTo(204);
    assertThat(login(newClient(), "other@example.com", "other-password-1").getStatusCode().value())
        .isEqualTo(200);
  }

  @Test
  void resetPasswordForcesAChangeAndClearsTheLock() {
    var admin = loggedIn(ADMIN_EMAIL, ADMIN_PASSWORD);
    long otherId = createUser("other@example.com", "other-password-1", false).getId();
    for (int i = 0; i < LoginService.MAX_FAILED_ATTEMPTS; i++) {
      login(newClient(), "other@example.com", "wrong-password-x");
    }
    assertThat(users.findById(otherId).orElseThrow().getLockedUntil()).isNotNull();

    var reset =
        admin.post(
            "/admin/users/" + otherId + "/reset-password", Map.of("temporaryPassword", TEMP_PASSWORD));

    assertThat(reset.getStatusCode().value()).isEqualTo(204);
    var user = users.findById(otherId).orElseThrow();
    assertThat(user.isMustChangePassword()).isTrue();
    assertThat(user.getLockedUntil()).isNull();
    assertThat(user.getFailedAttempts()).isZero();
    assertThat(login(newClient(), "other@example.com", "other-password-1").getStatusCode().value())
        .isEqualTo(401);
    var other = newClient();
    var login = login(other, "other@example.com", TEMP_PASSWORD);
    assertThat(login.getStatusCode().value()).isEqualTo(200);
    assertThat(ApiClient.json(login).path("mustChangePassword").asBoolean()).isTrue();
    assertThat(other.get("/admin/users").getStatusCode().value()).isEqualTo(403);
  }

  @Test
  void resetPasswordChecksTheLengthOfTheTemporaryPassword() {
    var admin = loggedIn(ADMIN_EMAIL, ADMIN_PASSWORD);
    long otherId = createUser("other@example.com", "other-password-1", false).getId();

    var reset =
        admin.post("/admin/users/" + otherId + "/reset-password", Map.of("temporaryPassword", "short"));

    assertThat(reset.getStatusCode().value()).isEqualTo(400);
    assertThat(ApiClient.json(reset).path("detail").asString())
        .isEqualTo("Mật khẩu tạm thời phải có ít nhất 12 ký tự.");
  }

  @Test
  void unknownUserGivesNotFound() {
    var admin = loggedIn(ADMIN_EMAIL, ADMIN_PASSWORD);

    assertThat(admin.post("/admin/users/999999/disable", null).getStatusCode().value()).isEqualTo(404);
    assertThat(admin.post("/admin/users/999999/enable", null).getStatusCode().value()).isEqualTo(404);
    assertThat(
            admin
                .post("/admin/users/999999/reset-password", Map.of("temporaryPassword", TEMP_PASSWORD))
                .getStatusCode()
                .value())
        .isEqualTo(404);
  }

  @Test
  void anonymousUserCannotUseUserManagement() {
    var anonymous = newClient();
    anonymous.fetchCsrf();

    assertThat(anonymous.get("/admin/users").getStatusCode().value()).isEqualTo(401);
    assertThat(anonymous.post("/admin/users/1/disable", null).getStatusCode().value()).isEqualTo(401);
    assertThat(anonymous.post("/admin/me/totp/setup", null).getStatusCode().value()).isEqualTo(401);
  }

  // ---- R10 (a): sessions end when the password changes or the user is disabled / reset ----------

  @Test
  void changingThePasswordEndsTheOtherSessionsButKeepsTheCurrentOne() {
    createUser(ADMIN_EMAIL, ADMIN_PASSWORD, false);
    var current = newClient();
    var other = newClient();
    var bystander = loggedIn("bystander@example.com", "bystander-password-1");
    login(current, ADMIN_EMAIL, ADMIN_PASSWORD);
    login(other, ADMIN_EMAIL, ADMIN_PASSWORD);
    current.fetchCsrf();
    long userId = users.findByEmail(ADMIN_EMAIL).orElseThrow().getId();
    assertThat(sessionCount(userId)).isEqualTo(2);

    var change =
        current.post(
            "/auth/password",
            Map.of("currentPassword", ADMIN_PASSWORD, "newPassword", "a-much-longer-password"));

    assertThat(change.getStatusCode().value()).isEqualTo(204);
    assertThat(current.get("/auth/me").getStatusCode().value()).isEqualTo(200);
    assertThat(other.get("/auth/me").getStatusCode().value()).isEqualTo(401);
    assertThat(sessionCount(userId)).isEqualTo(1);
    assertThat(bystander.get("/auth/me").getStatusCode().value()).isEqualTo(200);
  }

  @Test
  void disablingAUserEndsAllTheirSessions() {
    var admin = loggedIn(ADMIN_EMAIL, ADMIN_PASSWORD);
    long targetId = createUser("target@example.com", "target-password-1", false).getId();
    var first = newClient();
    var second = newClient();
    login(first, "target@example.com", "target-password-1");
    login(second, "target@example.com", "target-password-1");
    assertThat(sessionCount(targetId)).isEqualTo(2);

    assertThat(admin.post("/admin/users/" + targetId + "/disable", null).getStatusCode().value())
        .isEqualTo(204);

    assertThat(sessionCount(targetId)).isZero();
    assertThat(first.get("/auth/me").getStatusCode().value()).isEqualTo(401);
    assertThat(second.get("/auth/me").getStatusCode().value()).isEqualTo(401);
    assertThat(admin.get("/auth/me").getStatusCode().value()).isEqualTo(200);
  }

  @Test
  void resettingAPasswordEndsAllSessionsOfThatUser() {
    var admin = loggedIn(ADMIN_EMAIL, ADMIN_PASSWORD);
    long targetId = createUser("target@example.com", "target-password-1", false).getId();
    var first = newClient();
    var second = newClient();
    login(first, "target@example.com", "target-password-1");
    login(second, "target@example.com", "target-password-1");

    var reset =
        admin.post(
            "/admin/users/" + targetId + "/reset-password", Map.of("temporaryPassword", TEMP_PASSWORD));

    assertThat(reset.getStatusCode().value()).isEqualTo(204);
    assertThat(sessionCount(targetId)).isZero();
    assertThat(first.get("/auth/me").getStatusCode().value()).isEqualTo(401);
    assertThat(second.get("/auth/me").getStatusCode().value()).isEqualTo(401);
    assertThat(admin.get("/auth/me").getStatusCode().value()).isEqualTo(200);
  }

  // ---- R10 (b): TOTP at login --------------------------------------------------------------

  @Test
  void totpSetupReturnsASecretAndAnOtpauthUri() {
    var client = loggedIn(ADMIN_EMAIL, ADMIN_PASSWORD);

    var setup = client.post("/admin/me/totp/setup", null);

    assertThat(setup.getStatusCode().value()).isEqualTo(200);
    JsonNode body = ApiClient.json(setup);
    String secret = body.path("secret").asString();
    assertThat(secret).matches("[A-Z2-7]{32}");
    assertThat(body.path("otpauthUri").asString())
        .isEqualTo(
            "otpauth://totp/Nep%20Nha:" + ADMIN_EMAIL + "?secret=" + secret + "&issuer=Nep%20Nha");
    // Not enabled yet: the user can still log in without a code.
    assertThat(users.findByEmail(ADMIN_EMAIL).orElseThrow().isTotpEnabled()).isFalse();
    assertThat(login(newClient(), ADMIN_EMAIL, ADMIN_PASSWORD).getStatusCode().value()).isEqualTo(200);
  }

  @Test
  void enablingTotpNeedsASetupAndACorrectCode() {
    var client = loggedIn(ADMIN_EMAIL, ADMIN_PASSWORD);

    var withoutSetup = client.post("/admin/me/totp/enable", Map.of("code", "123456"));
    assertThat(withoutSetup.getStatusCode().value()).isEqualTo(409);

    String secret = setup(client);
    var wrong = client.post("/admin/me/totp/enable", Map.of("code", wrongCode(secret)));
    assertThat(wrong.getStatusCode().value()).isEqualTo(400);
    assertThat(ApiClient.json(wrong).path("detail").asString()).isEqualTo("Mã xác thực không đúng.");
    assertThat(users.findByEmail(ADMIN_EMAIL).orElseThrow().isTotpEnabled()).isFalse();

    var enabled = client.post("/admin/me/totp/enable", Map.of("code", currentCode(secret)));
    assertThat(enabled.getStatusCode().value()).isEqualTo(204);
    assertThat(users.findByEmail(ADMIN_EMAIL).orElseThrow().isTotpEnabled()).isTrue();

    // A second setup would replace the secret without proof of the old one.
    assertThat(client.post("/admin/me/totp/setup", null).getStatusCode().value()).isEqualTo(409);
  }

  @Test
  void loginNeedsTheCodeOnceTotpIsEnabled() {
    String secret = enableTotpFor(ADMIN_EMAIL, ADMIN_PASSWORD);

    var missing = login(newClient(), ADMIN_EMAIL, ADMIN_PASSWORD);
    assertThat(missing.getStatusCode().value()).isEqualTo(401);
    assertThat(ApiClient.json(missing).path("detail").asString()).isEqualTo(TOTP_REQUIRED);

    var blank = loginWithCode(newClient(), ADMIN_EMAIL, ADMIN_PASSWORD, "  ");
    assertThat(blank.getStatusCode().value()).isEqualTo(401);
    assertThat(ApiClient.json(blank).path("detail").asString()).isEqualTo(TOTP_REQUIRED);

    var client = newClient();
    var ok = loginWithCode(client, ADMIN_EMAIL, ADMIN_PASSWORD, currentCode(secret));
    assertThat(ok.getStatusCode().value()).isEqualTo(200);
    assertThat(client.get("/auth/me").getStatusCode().value()).isEqualTo(200);
  }

  @Test
  void aMissingCodeDoesNotCountButAWrongCodeDoes() {
    String secret = enableTotpFor(ADMIN_EMAIL, ADMIN_PASSWORD);
    assertThat(failedAttempts()).isZero();

    login(newClient(), ADMIN_EMAIL, ADMIN_PASSWORD);
    login(newClient(), ADMIN_EMAIL, ADMIN_PASSWORD);
    assertThat(failedAttempts()).isZero();

    var wrong = loginWithCode(newClient(), ADMIN_EMAIL, ADMIN_PASSWORD, wrongCode(secret));
    assertThat(wrong.getStatusCode().value()).isEqualTo(401);
    assertThat(ApiClient.json(wrong).path("detail").asString()).isEqualTo("Mã xác thực không đúng.");
    assertThat(failedAttempts()).isEqualTo(1);

    // A wrong code with a wrong password is also one failed attempt, not two.
    loginWithCode(newClient(), ADMIN_EMAIL, "wrong-password-x", wrongCode(secret));
    assertThat(failedAttempts()).isEqualTo(2);

    var ok = loginWithCode(newClient(), ADMIN_EMAIL, ADMIN_PASSWORD, currentCode(secret));
    assertThat(ok.getStatusCode().value()).isEqualTo(200);
    assertThat(failedAttempts()).isZero();
  }

  @Test
  void fiveWrongCodesLockTheAccount() {
    String secret = enableTotpFor(ADMIN_EMAIL, ADMIN_PASSWORD);

    for (int i = 1; i < LoginService.MAX_FAILED_ATTEMPTS; i++) {
      var wrong = loginWithCode(newClient(), ADMIN_EMAIL, ADMIN_PASSWORD, wrongCode(secret));
      assertThat(wrong.getStatusCode().value()).isEqualTo(401);
    }
    var last = loginWithCode(newClient(), ADMIN_EMAIL, ADMIN_PASSWORD, wrongCode(secret));
    assertThat(last.getStatusCode().value()).isEqualTo(423);

    var locked = loginWithCode(newClient(), ADMIN_EMAIL, ADMIN_PASSWORD, currentCode(secret));
    assertThat(locked.getStatusCode().value()).isEqualTo(423);
  }

  @Test
  void aCodeOfTheNeighbouringStepIsAccepted() {
    clock.set(Instant.parse("2026-11-03T10:00:15Z"));
    String secret = enableTotpFor(ADMIN_EMAIL, ADMIN_PASSWORD);
    String previousStep = Totp.code(secret, clock.instant().getEpochSecond() - 30);

    var ok = loginWithCode(newClient(), ADMIN_EMAIL, ADMIN_PASSWORD, previousStep);

    assertThat(ok.getStatusCode().value()).isEqualTo(200);
  }

  @Test
  void disablingTotpNeedsACorrectCodeAndRemovesTheSecret() {
    String secret = enableTotpFor(ADMIN_EMAIL, ADMIN_PASSWORD);
    var client = newClient();
    loginWithCode(client, ADMIN_EMAIL, ADMIN_PASSWORD, currentCode(secret));
    client.fetchCsrf();

    var wrong = client.post("/admin/me/totp/disable", Map.of("code", wrongCode(secret)));
    assertThat(wrong.getStatusCode().value()).isEqualTo(400);
    assertThat(users.findByEmail(ADMIN_EMAIL).orElseThrow().isTotpEnabled()).isTrue();

    var disabled = client.post("/admin/me/totp/disable", Map.of("code", currentCode(secret)));
    assertThat(disabled.getStatusCode().value()).isEqualTo(204);
    var user = users.findByEmail(ADMIN_EMAIL).orElseThrow();
    assertThat(user.isTotpEnabled()).isFalse();
    assertThat(user.getTotpSecret()).isNull();
    assertThat(login(newClient(), ADMIN_EMAIL, ADMIN_PASSWORD).getStatusCode().value()).isEqualTo(200);
    assertThat(client.post("/admin/me/totp/disable", Map.of("code", "123456")).getStatusCode().value())
        .isEqualTo(409);
  }

  @Test
  void theListShowsWhoUsesTotp() {
    enableTotpFor(ADMIN_EMAIL, ADMIN_PASSWORD);
    var other = loggedIn("plain@example.com", "plain-password-1");

    JsonNode list = ApiClient.json(other.get("/admin/users"));

    boolean adminHasTotp = false;
    boolean plainHasTotp = true;
    for (JsonNode user : list) {
      if (ADMIN_EMAIL.equals(user.path("email").asString())) {
        adminHasTotp = user.path("totpEnabled").asBoolean();
      } else {
        plainHasTotp = user.path("totpEnabled").asBoolean();
      }
    }
    assertThat(adminHasTotp).isTrue();
    assertThat(plainHasTotp).isFalse();
  }

  // ---- helpers ---------------------------------------------------------------------------

  /** A user with an ordinary password, logged in, with a CSRF token ready. */
  private ApiClient loggedIn(String email, String password) {
    createUser(email, password, false);
    var client = newClient();
    assertThat(login(client, email, password).getStatusCode().value()).isEqualTo(200);
    client.fetchCsrf();
    return client;
  }

  private ResponseEntity<String> loginWithCode(
      ApiClient client, String email, String password, String code) {
    return client.post("/auth/login", Map.of("email", email, "password", password, "totpCode", code));
  }

  /** Creates the user, runs setup and enable through the API and returns the secret. */
  private String enableTotpFor(String email, String password) {
    var client = loggedIn(email, password);
    String secret = setup(client);
    var enabled = client.post("/admin/me/totp/enable", Map.of("code", currentCode(secret)));
    assertThat(enabled.getStatusCode().value()).isEqualTo(204);
    return secret;
  }

  private static String setup(ApiClient client) {
    return ApiClient.json(client.post("/admin/me/totp/setup", null)).path("secret").asString();
  }

  private String currentCode(String secret) {
    return Totp.code(secret, clock.instant().getEpochSecond());
  }

  /** A six-digit code that is not valid at the clock's time or one step either side. */
  private String wrongCode(String secret) {
    long now = clock.instant().getEpochSecond();
    Set<String> valid =
        Set.of(Totp.code(secret, now - 30), Totp.code(secret, now), Totp.code(secret, now + 30));
    for (int candidate = 0; ; candidate++) {
      String code = String.format("%06d", candidate);
      if (!valid.contains(code)) {
        return code;
      }
    }
  }

  private int failedAttempts() {
    return users.findByEmail(ADMIN_EMAIL).orElseThrow().getFailedAttempts();
  }

  private int sessionCount(long userId) {
    Integer count =
        jdbc.queryForObject(
            "select count(*) from spring_session where principal_name = ?",
            Integer.class,
            Long.toString(userId));
    return count == null ? 0 : count;
  }
}
