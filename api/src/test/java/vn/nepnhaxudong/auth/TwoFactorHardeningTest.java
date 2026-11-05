package vn.nepnhaxudong.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

/**
 * Rules that keep the two-factor login strong: a code works once (no replay), and the admin
 * "reset password" action cannot be used on your own account to drop your own two-factor login.
 */
class TwoFactorHardeningTest extends AuthTestSupport {

  private static final String EMAIL = "user@example.com";
  private static final String PASSWORD = "user-password-long-1";
  private static final String SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
  private static final String WRONG_CODE = "Mã xác thực không đúng.";

  @Test
  void aCodeThatWasUsedToSignInIsRefusedTheSecondTime() {
    clock.set(Instant.parse("2026-11-05T10:00:05Z"));
    createTotpUser();
    String code = Totp.code(SECRET, now());

    assertThat(loginWithCode(code).getStatusCode().value()).isEqualTo(200);

    var replay = loginWithCode(code);
    assertThat(replay.getStatusCode().value()).isEqualTo(401);
    assertThat(ApiClient.json(replay).path("code").asString()).isEqualTo("totp-invalid");
    assertThat(ApiClient.json(replay).path("detail").asString()).isEqualTo(WRONG_CODE);
    assertThat(users.findByEmail(EMAIL).orElseThrow().getFailedAttempts()).isEqualTo(1);

    // 30 seconds later the old code is still inside the drift window, but it was used: still refused.
    clock.set(Instant.parse("2026-11-05T10:00:35Z"));
    assertThat(loginWithCode(code).getStatusCode().value()).isEqualTo(401);
    // The code of the new step works once.
    assertThat(loginWithCode(Totp.code(SECRET, now())).getStatusCode().value()).isEqualTo(200);
  }

  @Test
  void aCodeOfAnEarlierStepIsRefusedAfterALaterOneWasUsed() {
    clock.set(Instant.parse("2026-11-05T10:00:05Z"));
    createTotpUser();
    String earlier = Totp.code(SECRET, now() - 30);

    assertThat(loginWithCode(Totp.code(SECRET, now())).getStatusCode().value()).isEqualTo(200);

    assertThat(loginWithCode(earlier).getStatusCode().value()).isEqualTo(401);
  }

  @Test
  void aNewSecretStartsWithoutAUsedStep() {
    clock.set(Instant.parse("2026-11-05T10:00:05Z"));
    var user = createTotpUser();
    assertThat(loginWithCode(Totp.code(SECRET, now())).getStatusCode().value()).isEqualTo(200);
    var client = newClient();
    loginWithCode(client, Totp.code(SECRET, now() + 30));
    client.fetchCsrf();
    // Switched off with a code, then a new secret in the same half-minute.
    assertThat(
            client.post("/admin/me/totp/disable", Map.of("code", Totp.code(SECRET, now()))).getStatusCode().value())
        .isEqualTo(204);
    String secret = ApiClient.json(client.post("/admin/me/totp/setup", null)).path("secret").asString();
    assertThat(
            client.post("/admin/me/totp/enable", Map.of("code", Totp.code(secret, now()))).getStatusCode().value())
        .isEqualTo(204);

    var login =
        newClient()
            .post(
                "/auth/login",
                Map.of("email", EMAIL, "password", PASSWORD, "totpCode", Totp.code(secret, now())));
    assertThat(login.getStatusCode().value()).isEqualTo(200);
    assertThat(user.getId()).isNotNull();
  }

  @Test
  void anOwnerCannotResetTheirOwnPasswordThroughTheAdminAction() {
    var owner = createOwner(EMAIL, PASSWORD, false);
    owner.setTotpSecret(SECRET);
    owner.setTotpEnabled(true);
    users.save(owner);
    var client = newClient();
    loginWithCode(client, Totp.code(SECRET, now()));
    client.fetchCsrf();

    var reset =
        client.post(
            "/admin/users/" + owner.getId() + "/reset-password",
            Map.of("temporaryPassword", "temporary-password-1"));

    assertThat(reset.getStatusCode().value()).isEqualTo(409);
    assertThat(ApiClient.json(reset).path("detail").asString())
        .isEqualTo("Hãy đổi mật khẩu của bạn ở mục Đổi mật khẩu.");
    var stored = users.findById(owner.getId()).orElseThrow();
    assertThat(stored.isTotpEnabled()).isTrue();
    assertThat(encoder.matches(PASSWORD, stored.getPasswordHash())).isTrue();
  }

  // ---- helpers -------------------------------------------------------------------------------

  private AppUser createTotpUser() {
    var user = createUser(EMAIL, PASSWORD, false);
    user.setTotpSecret(SECRET);
    user.setTotpEnabled(true);
    return users.save(user);
  }

  private ResponseEntity<String> loginWithCode(String code) {
    return loginWithCode(newClient(), code);
  }

  private ResponseEntity<String> loginWithCode(ApiClient client, String code) {
    return client.post("/auth/login", Map.of("email", EMAIL, "password", PASSWORD, "totpCode", code));
  }

  private long now() {
    return clock.instant().getEpochSecond();
  }
}
