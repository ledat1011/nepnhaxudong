package vn.nepnhaxudong.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import tools.jackson.databind.JsonNode;
import vn.nepnhaxudong.auth.ApiClient;
import vn.nepnhaxudong.auth.AuthTestSupport;
import vn.nepnhaxudong.auth.Totp;

/** Every refusal the admin web must tell apart carries a machine-readable {@code code}. */
class ProblemCodeTest extends AuthTestSupport {

  private static final String EMAIL = "owner@example.com";
  private static final String PASSWORD = "correct-password-1";
  private static final String SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

  @Test
  void loginWithoutTheTotpCodeAnswersTotpRequiredAndKeepsTheDetail() {
    createTotpUser();

    var response = login(newClient(), EMAIL, PASSWORD);

    assertProblem(response, 401, "totp-required");
    assertThat(ApiClient.json(response).path("detail").asString())
        .isEqualTo("Cần mã xác thực 2 lớp.");
  }

  @Test
  void aWrongTotpCodeAnswersTotpInvalid() {
    createTotpUser();

    var response =
        newClient()
            .post(
                "/auth/login",
                Map.of("email", EMAIL, "password", PASSWORD, "totpCode", wrongCode()));

    assertProblem(response, 401, "totp-invalid");
    assertThat(ApiClient.json(response).path("detail").asString())
        .isEqualTo("Mã xác thực không đúng.");
  }

  @Test
  void aWrongPasswordAnswersInvalidCredentials() {
    createUser(EMAIL, PASSWORD, false);

    var response = login(newClient(), EMAIL, "wrong-password-1");

    assertProblem(response, 401, "invalid-credentials");
    assertThat(ApiClient.json(response).path("detail").asString()).isEqualTo("Email hoặc mật khẩu không đúng.");
  }

  @Test
  void theFifthWrongPasswordAnswersAccountLocked() {
    createUser(EMAIL, PASSWORD, false);
    var client = newClient();
    for (int attempt = 1; attempt <= 4; attempt++) {
      login(client, EMAIL, "wrong-password-" + attempt);
    }

    var response = login(client, EMAIL, "wrong-password-5");

    assertProblem(response, 423, "account-locked");
    assertThat(ApiClient.json(response).path("detail").asString()).isEqualTo("Tài khoản tạm khóa 15 phút vì đăng nhập sai nhiều lần.");
  }

  @Test
  void theAdminAreaWithoutLoginAnswersSessionExpired() {
    var response = newClient().get("/admin/products");

    assertProblem(response, 401, "session-expired");
  }

  @Test
  void aUserWhoMustChangeThePasswordAnswersMustChangePassword() {
    createUser(EMAIL, PASSWORD, true);
    var client = newClient();
    assertThat(login(client, EMAIL, PASSWORD).getStatusCode().value()).isEqualTo(200);

    var response = client.get("/admin/products");

    assertProblem(response, 403, "must-change-password");
    assertThat(ApiClient.json(response).path("detail").asString())
        .isEqualTo("Bạn cần đổi mật khẩu trước.");
  }

  @Test
  void aWriteWithoutTheCsrfHeaderAnswersCsrfInvalid() {
    var client = loggedInClient();
    client.useCsrfToken(null);

    var response = client.post("/admin/timeline", Map.of());

    assertProblem(response, 403, "csrf-invalid");
  }

  @Test
  void aValidationErrorHasNoCode() {
    var client = loggedInClient();

    var response = client.post("/admin/timeline", Map.of());

    assertThat(response.getStatusCode().value()).isEqualTo(400);
    assertThat(ApiClient.json(response).has("code")).isFalse();
  }

  private void createTotpUser() {
    var user = createUser(EMAIL, PASSWORD, false);
    user.setTotpSecret(SECRET);
    user.setTotpEnabled(true);
    users.save(user);
  }

  private String wrongCode() {
    long now = clock.instant().getEpochSecond();
    for (int candidate = 0; ; candidate++) {
      String code = String.format("%06d", candidate);
      if (!code.equals(Totp.code(SECRET, now - 30))
          && !code.equals(Totp.code(SECRET, now))
          && !code.equals(Totp.code(SECRET, now + 30))) {
        return code;
      }
    }
  }

  private static void assertProblem(ResponseEntity<String> response, int status, String code) {
    assertThat(response.getStatusCode().value()).isEqualTo(status);
    JsonNode json = ApiClient.json(response);
    assertThat(json.path("code").asString()).isEqualTo(code);
    assertThat(json.path("status").asInt()).isEqualTo(status);
  }
}
