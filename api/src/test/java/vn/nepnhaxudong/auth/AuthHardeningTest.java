package vn.nepnhaxudong.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import tools.jackson.databind.JsonNode;

/** Tests of the security follow-ups: CSRF rotation, catch-all errors, bootstrap race, dead sessions. */
@ExtendWith(OutputCaptureExtension.class)
class AuthHardeningTest extends AuthTestSupport {

  private static final String EMAIL = "admin@example.com";
  private static final String PASSWORD = "correct-password-1";
  private static final String SERVER_ERROR = "Đã có lỗi xảy ra. Hãy thử lại sau.";

  @Autowired JdbcTemplate jdbc;

  // ---- R10 (c): CSRF token rotation ----------------------------------------------------------

  @Test
  void aCsrfTokenSeenBeforeLoginIsNotValidAfterIt() {
    createUser(EMAIL, PASSWORD, false);
    var client = newClient();
    String before = client.fetchCsrf().path("token").asString();

    assertThat(login(client, EMAIL, PASSWORD).getStatusCode().value()).isEqualTo(200);

    assertThat(client.cookie("XSRF-TOKEN")).isNotBlank().isNotEqualTo(before);
    client.useCsrfToken(before);
    var stale = client.post("/auth/logout", null);
    assertThat(stale.getStatusCode().value()).isEqualTo(403);
    // The new token works.
    String after = client.fetchCsrf().path("token").asString();
    assertThat(after).isNotEqualTo(before);
    assertThat(client.post("/auth/logout", null).getStatusCode().value()).isEqualTo(204);
  }

  @Test
  void theCsrfTokenIsRotatedAtLogout() {
    createUser(EMAIL, PASSWORD, false);
    var client = newClient();
    login(client, EMAIL, PASSWORD);
    String before = client.fetchCsrf().path("token").asString();

    assertThat(client.post("/auth/logout", null).getStatusCode().value()).isEqualTo(204);

    assertThat(client.cookie("XSRF-TOKEN")).isNotBlank().isNotEqualTo(before);
    client.useCsrfToken(before);
    assertThat(client.post("/auth/logout", null).getStatusCode().value()).isEqualTo(403);
    assertThat(client.fetchCsrf().path("token").asString()).isNotEqualTo(before);
  }

  // ---- R10 (d): catch-all error handler ------------------------------------------------------

  @Test
  void anUnexpectedExceptionGivesA500ProblemWithoutDetailsAndALogLine(CapturedOutput output) {
    var response = newClient().get("/public/test-probe/boom");

    assertThat(response.getStatusCode().value()).isEqualTo(500);
    assertThat(isProblemJson(response)).isTrue();
    JsonNode body = ApiClient.json(response);
    assertThat(body.path("detail").asString()).isEqualTo(SERVER_ERROR);
    assertThat(body.path("status").asInt()).isEqualTo(500);
    assertThat(response.getBody()).doesNotContain("must never reach the client");
    assertThat(output.getAll())
        .contains("WARN")
        .contains("IllegalStateException")
        .contains("must never reach the client");
  }

  @Test
  void theCatchAllDoesNotSwallowSpringsOwnClientErrors() {
    var client = newClient();

    var missingParam = client.get("/public/test-probe/needs-param");
    assertThat(missingParam.getStatusCode().value()).isEqualTo(400);
    assertThat(isProblemJson(missingParam)).isTrue();

    var teapot = client.get("/public/test-probe/status");
    assertThat(teapot.getStatusCode().value()).isEqualTo(418);

    var unknown = client.get("/public/test-probe/no-such-path");
    assertThat(unknown.getStatusCode().value()).isEqualTo(404);

    // POST on a GET-only path: a logged-in user with a valid CSRF token reaches Spring MVC, which
    // answers 405 (an anonymous user would be stopped by the authorization filter with 401).
    createUser(EMAIL, PASSWORD, false);
    var loggedIn = newClient();
    login(loggedIn, EMAIL, PASSWORD);
    loggedIn.fetchCsrf();
    var wrongMethod = loggedIn.post("/auth/csrf", null);
    assertThat(wrongMethod.getStatusCode().value()).isEqualTo(405);
    assertThat(isProblemJson(wrongMethod)).isTrue();

    var malformed = newClient();
    malformed.fetchCsrf();
    var unreadable = malformed.post("/auth/login", "{not json");
    assertThat(unreadable.getStatusCode().value()).isEqualTo(400);
  }

  @Test
  void theCatchAllDoesNotTurnSecurityExceptionsInto500() {
    var denied = newClient().get("/public/test-probe/denied");

    assertThat(denied.getStatusCode().value()).isEqualTo(401);
    assertThat(isProblemJson(denied)).isTrue();
    assertThat(ApiClient.json(denied).path("detail").asString()).isEqualTo("Bạn cần đăng nhập.");
  }

  @Test
  void businessErrorsStillUseTheirOwnStatus() {
    createUser(EMAIL, PASSWORD, false);

    var wrong = login(newClient(), EMAIL, "wrong-password-x");

    assertThat(wrong.getStatusCode().value()).isEqualTo(401);
    assertThat(ApiClient.json(wrong).path("detail").asString()).isEqualTo(LOGIN_ERROR);
  }

  // ---- R10 (e): BootstrapAdmin race and dead sessions in the admin filter --------------------

  @Test
  void bootstrapSurvivesAnotherInstanceCreatingTheAdminFirst(CapturedOutput output) {
    var repository = mock(AppUserRepository.class);
    when(repository.count()).thenReturn(0L);
    when(repository.save(any(AppUser.class)))
        .thenThrow(new DataIntegrityViolationException("duplicate key value"));
    var passwordEncoder = mock(PasswordEncoder.class);
    when(passwordEncoder.encode(any())).thenReturn("encoded");
    var bootstrap = new BootstrapAdmin(repository, passwordEncoder, "first@example.com", "first-password-1");

    assertThatCode(bootstrap::createIfEmpty).doesNotThrowAnyException();

    assertThat(output.getAll()).contains("WARN").contains("another instance");
    assertThat(output.getAll()).doesNotContain("first-password-1");
  }

  @Test
  void bootstrapDoesNotSaveWhenAUserExists() {
    var repository = mock(AppUserRepository.class);
    when(repository.count()).thenReturn(1L);

    new BootstrapAdmin(repository, mock(PasswordEncoder.class), "first@example.com", "first-password-1")
        .createIfEmpty();

    verify(repository, never()).save(any(AppUser.class));
  }

  @Test
  void theAdminFilterEndsTheSessionOfADisabledUser() {
    var user = createUser(EMAIL, PASSWORD, false);
    var client = newClient();
    login(client, EMAIL, PASSWORD);
    assertThat(sessionCount(user.getId())).isEqualTo(1);
    // Changed behind the session's back (not through the admin endpoints).
    user.setEnabled(false);
    users.save(user);

    var response = client.get("/admin/users");

    assertThat(response.getStatusCode().value()).isEqualTo(401);
    assertThat(isProblemJson(response)).isTrue();
    assertThat(sessionCount(user.getId())).isZero();
    assertThat(client.get("/auth/me").getStatusCode().value()).isEqualTo(401);
  }

  @Test
  void theAdminFilterEndsTheSessionOfADeletedUser() {
    var user = createUser(EMAIL, PASSWORD, false);
    long id = user.getId();
    var client = newClient();
    login(client, EMAIL, PASSWORD);
    users.deleteById(id);

    var response = client.get("/admin/users");

    assertThat(response.getStatusCode().value()).isEqualTo(401);
    assertThat(sessionCount(id)).isZero();
  }

  private int sessionCount(long userId) {
    Integer count =
        jdbc.queryForObject(
            "select count(*) from spring_session where principal_name = ?",
            Integer.class,
            Long.toString(userId));
    return count == null ? 0 : count;
  }

  private static boolean isProblemJson(ResponseEntity<String> response) {
    MediaType type = response.getHeaders().getContentType();
    return type != null && type.isCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
  }
}
