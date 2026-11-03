package vn.nepnhaxudong.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import org.junit.jupiter.api.Test;

class LockoutTest extends AuthTestSupport {

  private static final String EMAIL = "admin@example.com";
  private static final String PASSWORD = "correct-password-1";

  @Test
  void fifthWrongPasswordLocksTheAccountForFifteenMinutes() {
    createUser(EMAIL, PASSWORD, false);
    var client = newClient();

    for (int attempt = 1; attempt <= 4; attempt++) {
      var wrong = login(client, EMAIL, "wrong-password-" + attempt);
      assertThat(wrong.getStatusCode().value()).isEqualTo(401);
      assertThat(ApiClient.json(wrong).path("detail").asString()).isEqualTo(LOGIN_ERROR);
    }
    assertThat(users.findByEmail(EMAIL).orElseThrow().getFailedAttempts()).isEqualTo(4);

    var fifth = login(client, EMAIL, "wrong-password-5");
    assertThat(fifth.getStatusCode().value()).isEqualTo(423);
    assertThat(ApiClient.json(fifth).path("detail").asString()).isEqualTo(LOCKED);

    // A correct password does not help while the lock lasts.
    assertThat(login(client, EMAIL, PASSWORD).getStatusCode().value()).isEqualTo(423);

    clock.advance(Duration.ofMinutes(14).plusSeconds(59));
    assertThat(login(client, EMAIL, PASSWORD).getStatusCode().value()).isEqualTo(423);

    clock.advance(Duration.ofSeconds(2));
    var ok = login(client, EMAIL, PASSWORD);
    assertThat(ok.getStatusCode().value()).isEqualTo(200);
    var user = users.findByEmail(EMAIL).orElseThrow();
    assertThat(user.getFailedAttempts()).isZero();
    assertThat(user.getLockedUntil()).isNull();
  }

  @Test
  void countingStartsAgainFromZeroAfterTheLockExpires() {
    createUser(EMAIL, PASSWORD, false);
    var client = newClient();
    for (int attempt = 1; attempt <= 5; attempt++) {
      login(client, EMAIL, "wrong-password");
    }
    clock.advance(Duration.ofMinutes(16));

    var wrong = login(client, EMAIL, "wrong-password");

    assertThat(wrong.getStatusCode().value()).isEqualTo(401);
    assertThat(users.findByEmail(EMAIL).orElseThrow().getFailedAttempts()).isEqualTo(1);
  }

  @Test
  void successfulLoginResetsTheCounter() {
    createUser(EMAIL, PASSWORD, false);
    var client = newClient();
    for (int attempt = 1; attempt <= 3; attempt++) {
      login(client, EMAIL, "wrong-password");
    }

    assertThat(login(client, EMAIL, PASSWORD).getStatusCode().value()).isEqualTo(200);

    assertThat(users.findByEmail(EMAIL).orElseThrow().getFailedAttempts()).isZero();
  }

  @Test
  void unknownEmailGivesTheSameMessageAndCreatesNothing() {
    var unknown = login(newClient(), "nobody@example.com", "whatever-password");

    assertThat(unknown.getStatusCode().value()).isEqualTo(401);
    assertThat(ApiClient.json(unknown).path("detail").asString()).isEqualTo(LOGIN_ERROR);
    assertThat(users.count()).isZero();

    createUser(EMAIL, PASSWORD, false);
    var known = login(newClient(), EMAIL, "wrong-password");
    assertThat(known.getBody()).isEqualTo(unknown.getBody());
  }
}
