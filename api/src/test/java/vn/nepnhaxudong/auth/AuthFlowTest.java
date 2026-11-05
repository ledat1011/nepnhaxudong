package vn.nepnhaxudong.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import tools.jackson.databind.JsonNode;

class AuthFlowTest extends AuthTestSupport {

  private static final String ADMIN_EMAIL = "admin@example.com";
  private static final String ADMIN_PASSWORD = "first-password-1";
  private static final String NEW_PASSWORD = "a-much-longer-password";

  @Autowired BootstrapAdmin bootstrapAdmin;

  @Test
  void bootstrapCreatesExactlyOneAdminFromTheVariablesAndNotAgain() {
    assertThat(users.count()).isZero();

    bootstrapAdmin.createIfEmpty();
    bootstrapAdmin.createIfEmpty();

    assertThat(users.findAll()).hasSize(1);
    AppUser admin = users.findByEmail(ADMIN_EMAIL).orElseThrow();
    assertThat(admin.isMustChangePassword()).isTrue();
    assertThat(encoder.matches(ADMIN_PASSWORD, admin.getPasswordHash())).isTrue();
    // The first admin manages the family accounts.
    assertThat(admin.getRole()).isEqualTo(UserRole.OWNER);
  }

  @Test
  void bootstrapDoesNothingWithoutVariablesOrWhenAUserExists() {
    var withoutVariables = new BootstrapAdmin(users, encoder, "", "");
    withoutVariables.createIfEmpty();
    assertThat(users.count()).isZero();

    createUser("someone@example.com", "some-long-password", false);
    bootstrapAdmin.createIfEmpty();
    assertThat(users.count()).isEqualTo(1);
  }

  @Test
  void firstLoginShowsMustChangePasswordAndBlocksTheAdminArea() {
    bootstrapAdmin.createIfEmpty();
    var client = newClient();

    ResponseEntity<String> login = login(client, ADMIN_EMAIL, ADMIN_PASSWORD);

    assertThat(login.getStatusCode().value()).isEqualTo(200);
    JsonNode body = ApiClient.json(login);
    assertThat(body.path("email").asString()).isEqualTo(ADMIN_EMAIL);
    assertThat(body.path("mustChangePassword").asBoolean()).isTrue();
    assertThat(body.has("id")).isTrue();
    assertThat(body.has("displayName")).isTrue();
    assertThat(login.getBody()).doesNotContain("passwordHash").doesNotContain("password_hash");

    ResponseEntity<String> admin = client.get("/admin/users");
    assertThat(admin.getStatusCode().value()).isEqualTo(403);
    assertThat(isProblemJson(admin)).isTrue();
    assertThat(ApiClient.json(admin).path("detail").asString())
        .isEqualTo("Bạn cần đổi mật khẩu trước.");
  }

  @Test
  void sessionCookieIsHttpOnlyLaxAndLastsThirtyDays() {
    createUser(ADMIN_EMAIL, ADMIN_PASSWORD, false);

    ResponseEntity<String> login = login(newClient(), ADMIN_EMAIL, ADMIN_PASSWORD);

    String cookie =
        login.getHeaders().get(HttpHeaders.SET_COOKIE).stream()
            .filter(c -> c.startsWith("NEPNHA_SESSION="))
            .findFirst()
            .orElseThrow();
    assertThat(cookie).contains("HttpOnly").contains("SameSite=Lax").contains("Max-Age=2592000");
  }

  @Test
  void loginChangesTheSessionId() {
    createUser(ADMIN_EMAIL, ADMIN_PASSWORD, false);
    var client = newClient();
    login(client, ADMIN_EMAIL, ADMIN_PASSWORD);
    String first = client.cookie("NEPNHA_SESSION");

    login(client, ADMIN_EMAIL, ADMIN_PASSWORD);

    assertThat(client.cookie("NEPNHA_SESSION")).isNotNull().isNotEqualTo(first);
  }

  @Test
  void changingThePasswordNeedsCsrfAndClearsTheFlag() {
    bootstrapAdmin.createIfEmpty();
    var client = newClient();
    login(client, ADMIN_EMAIL, ADMIN_PASSWORD);
    client.fetchCsrf();

    var change =
        client.post(
            "/auth/password",
            Map.of("currentPassword", ADMIN_PASSWORD, "newPassword", NEW_PASSWORD));

    assertThat(change.getStatusCode().value()).isEqualTo(204);
    var me = client.get("/auth/me");
    assertThat(me.getStatusCode().value()).isEqualTo(200);
    assertThat(ApiClient.json(me).path("mustChangePassword").asBoolean()).isFalse();
    assertThat(client.get("/admin/users").getStatusCode().value()).isNotEqualTo(403);

    var again = newClient();
    assertThat(login(again, ADMIN_EMAIL, ADMIN_PASSWORD).getStatusCode().value()).isEqualTo(401);
    assertThat(login(again, ADMIN_EMAIL, NEW_PASSWORD).getStatusCode().value()).isEqualTo(200);
  }

  @Test
  void newPasswordMustBeLongAndDifferent() {
    createUser(ADMIN_EMAIL, ADMIN_PASSWORD, false);
    var client = newClient();
    login(client, ADMIN_EMAIL, ADMIN_PASSWORD);
    client.fetchCsrf();

    var tooShort =
        client.post(
            "/auth/password", Map.of("currentPassword", ADMIN_PASSWORD, "newPassword", "short"));
    assertThat(tooShort.getStatusCode().value()).isEqualTo(400);
    assertThat(ApiClient.json(tooShort).path("detail").asString())
        .isEqualTo("Mật khẩu mới phải có ít nhất 12 ký tự.");

    var same =
        client.post(
            "/auth/password",
            Map.of("currentPassword", ADMIN_PASSWORD, "newPassword", ADMIN_PASSWORD));
    assertThat(same.getStatusCode().value()).isEqualTo(400);
    assertThat(ApiClient.json(same).path("detail").asString())
        .isEqualTo("Mật khẩu mới phải khác mật khẩu hiện tại.");

    var wrongCurrent =
        client.post(
            "/auth/password",
            Map.of("currentPassword", "not-the-password", "newPassword", NEW_PASSWORD));
    assertThat(wrongCurrent.getStatusCode().value()).isEqualTo(400);
    assertThat(ApiClient.json(wrongCurrent).path("detail").asString())
        .isEqualTo("Mật khẩu hiện tại không đúng.");
  }

  @Test
  void writeRequestsWithoutAValidCsrfTokenAreRejected() {
    createUser(ADMIN_EMAIL, ADMIN_PASSWORD, false);
    var client = newClient();
    login(client, ADMIN_EMAIL, ADMIN_PASSWORD);
    var body = Map.of("currentPassword", ADMIN_PASSWORD, "newPassword", NEW_PASSWORD);

    var missing = client.post("/auth/password", body);
    assertThat(missing.getStatusCode().value()).isEqualTo(403);
    assertThat(isProblemJson(missing)).isTrue();

    client.fetchCsrf();
    assertThat(client.cookie("XSRF-TOKEN")).isNotBlank();
    client.useCsrfToken("wrong-token");
    assertThat(client.post("/auth/password", body).getStatusCode().value()).isEqualTo(403);

    // The token from /auth/csrf is the one the cookie holds, and it is accepted.
    JsonNode csrf = client.fetchCsrf();
    assertThat(csrf.path("headerName").asString()).isEqualTo("X-XSRF-TOKEN");
    assertThat(csrf.path("token").asString()).isEqualTo(client.cookie("XSRF-TOKEN"));
    assertThat(client.post("/auth/password", body).getStatusCode().value()).isEqualTo(204);
  }

  @Test
  void logoutEndsTheSession() {
    createUser(ADMIN_EMAIL, ADMIN_PASSWORD, false);
    var client = newClient();
    login(client, ADMIN_EMAIL, ADMIN_PASSWORD);
    client.fetchCsrf();
    assertThat(client.get("/auth/me").getStatusCode().value()).isEqualTo(200);
    String sessionBefore = client.cookie("NEPNHA_SESSION");

    var logout = client.post("/auth/logout", null);

    assertThat(logout.getStatusCode().value()).isEqualTo(204);
    var me = client.get("/auth/me");
    assertThat(me.getStatusCode().value()).isEqualTo(401);
    assertThat(isProblemJson(me)).isTrue();

    // Even with the old cookie, the session is gone on the server.
    var stale = newClient();
    stale.useCookie("NEPNHA_SESSION", sessionBefore);
    assertThat(stale.get("/auth/me").getStatusCode().value()).isEqualTo(401);
  }

  @Test
  void emailIsCaseInsensitiveAtLogin() {
    createUser(ADMIN_EMAIL, ADMIN_PASSWORD, false);

    var response = login(newClient(), "  ADMIN@Example.COM ", ADMIN_PASSWORD);

    assertThat(response.getStatusCode().value()).isEqualTo(200);
    assertThat(ApiClient.json(response).path("email").asString()).isEqualTo(ADMIN_EMAIL);
  }

  @Test
  void disabledUserGetsTheSameMessageAsAWrongPassword() {
    var user = createUser(ADMIN_EMAIL, ADMIN_PASSWORD, false);
    user.setEnabled(false);
    users.save(user);

    var response = login(newClient(), ADMIN_EMAIL, ADMIN_PASSWORD);

    assertThat(response.getStatusCode().value()).isEqualTo(401);
    assertThat(ApiClient.json(response).path("detail").asString()).isEqualTo(LOGIN_ERROR);
  }

  @Test
  void invalidLoginBodyGivesAVietnameseValidationProblem() {
    var response = newClient().post("/auth/login", Map.of("email", "", "password", "x"));

    assertThat(response.getStatusCode().value()).isEqualTo(400);
    assertThat(isProblemJson(response)).isTrue();
    assertThat(ApiClient.json(response).path("detail").asString()).contains("Email");
  }

  @Test
  void healthIsOpenAndEverythingElseNeedsALogin() {
    var client = newClient();
    assertThat(client.get("/actuator/health").getStatusCode().value()).isEqualTo(200);
    assertThat(client.get("/actuator/info").getStatusCode().value()).isNotEqualTo(200);
    assertThat(client.get("/actuator/env").getStatusCode().value()).isNotEqualTo(200);
    var admin = client.get("/admin/users");
    assertThat(admin.getStatusCode().value()).isEqualTo(401);
    assertThat(isProblemJson(admin)).isTrue();
    assertThat(client.get("/auth/me").getStatusCode().value()).isEqualTo(401);
  }

  private static boolean isProblemJson(ResponseEntity<String> response) {
    MediaType type = response.getHeaders().getContentType();
    return type != null && type.isCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
  }
}
