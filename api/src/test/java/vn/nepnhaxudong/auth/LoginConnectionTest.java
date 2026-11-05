package vn.nepnhaxudong.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.zaxxer.hikari.HikariDataSource;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;


/**
 * A login must not hold a database connection while it hashes the password. The pool is small, the
 * hash is held at a gate, and a flood of logins must still leave the connections free. This context
 * also uses the production setting of the session cookie (Secure).
 */
@Import(BlockingPasswordEncoder.class)
@TestPropertySource(
    properties = {
      "spring.datasource.hikari.maximum-pool-size=4",
      "spring.datasource.hikari.connection-timeout=1000",
      "server.servlet.session.cookie.secure=true"
    })
class LoginConnectionTest extends AuthTestSupport {

  private static final int LOGINS = 8;

  @Autowired BlockingPasswordEncoder blocking;
  @Autowired DataSource dataSource;
  @Autowired UserAdminService userAdminService;
  @Autowired TotpService totpService;
  @Autowired JdbcTemplate jdbc;

  @Test
  void noConnectionIsHeldWhileThePasswordIsHashed() throws Exception {
    createUser("owner@example.com", "correct-password-1", false);
    blocking.close();
    ExecutorService executor = Executors.newFixedThreadPool(LOGINS);
    try {
      List<CompletableFuture<ResponseEntity<String>>> logins = new ArrayList<>();
      for (int i = 0; i < LOGINS; i++) {
        // Unknown emails and a wrong password of a known user: both hash while they wait.
        String email = i % 2 == 0 ? "nobody" + i + "@example.com" : "owner@example.com";
        logins.add(
            CompletableFuture.supplyAsync(
                () -> login(newClient(), email, "wrong-password-x"), executor));
      }

      awaitWaiting(LOGINS);
      // More logins wait than the pool has connections, and the pool is idle.
      var pool = dataSource.unwrap(HikariDataSource.class).getHikariPoolMXBean();
      assertThat(pool.getActiveConnections()).isZero();
      // The public pages still answer.
      assertThat(newClient().get("/public/vi/home").getStatusCode().value()).isEqualTo(200);

      blocking.open();
      for (var login : logins) {
        assertThat(login.get().getStatusCode().value()).isEqualTo(401);
      }
    } finally {
      blocking.open();
      executor.shutdownNow();
    }
  }

  @Test
  void parallelWrongPasswordsCountFiveAndThenOnlyRefuse() throws Exception {
    createUser("owner@example.com", "correct-password-1", false);
    ExecutorService executor = Executors.newFixedThreadPool(LOGINS);
    try {
      List<CompletableFuture<ResponseEntity<String>>> logins = new ArrayList<>();
      for (int i = 0; i < LOGINS; i++) {
        logins.add(
            CompletableFuture.supplyAsync(
                () -> login(newClient(), "owner@example.com", "wrong-password-x"), executor));
      }
      int unauthorized = 0;
      int locked = 0;
      for (var login : logins) {
        int status = login.get().getStatusCode().value();
        if (status == 401) {
          unauthorized++;
        } else if (status == 423) {
          locked++;
        }
      }

      // Four plain refusals, the fifth wrong password locks, the attempts after it are refused.
      assertThat(unauthorized).isEqualTo(LoginService.MAX_FAILED_ATTEMPTS - 1);
      assertThat(locked).isEqualTo(LOGINS - unauthorized);
      var user = users.findByEmail("owner@example.com").orElseThrow();
      assertThat(user.getFailedAttempts()).isEqualTo(LoginService.MAX_FAILED_ATTEMPTS);
      assertThat(user.getLockedUntil()).isNotNull();
    } finally {
      executor.shutdownNow();
    }
  }

  @Test
  void theSessionCookieIsSecureByDefault() {
    createUser("owner@example.com", "correct-password-1", false);

    var response =
        rest.postForEntity(
            "/auth/login",
            new HttpEntity<>(
                Map.of("email", "owner@example.com", "password", "correct-password-1")),
            String.class);

    assertThat(response.getStatusCode().value()).isEqualTo(200);
    String sessionCookie =
        response.getHeaders().get(HttpHeaders.SET_COOKIE).stream()
            .filter(line -> line.startsWith("NEPNHA_SESSION="))
            .findFirst()
            .orElseThrow();
    assertThat(sessionCookie).contains("Secure").contains("HttpOnly").contains("SameSite=Lax");
  }

  @Test
  void aLoginWithTheOldPasswordIsRefusedWhenAnAdminResetsItDuringTheHash() throws Exception {
    var user = createUser("owner@example.com", "correct-password-1", false);
    var admin = createOwner("admin@example.com", "admin-password-1", false);
    int sessionsBefore = sessions();
    blocking.close();
    ExecutorService executor = Executors.newSingleThreadExecutor();
    try {
      var login =
          CompletableFuture.supplyAsync(
              () -> login(newClient(), "owner@example.com", "correct-password-1"), executor);
      awaitWaiting(1);

      userAdminService.resetPassword(admin.getId(), user.getId(), "temporary-password-1");
      blocking.open();

      var response = login.get();
      assertThat(response.getStatusCode().value()).isEqualTo(401);
      assertNoSession(response, sessionsBefore);
      assertThat(users.findById(user.getId()).orElseThrow().getFailedAttempts()).isZero();
    } finally {
      blocking.open();
      executor.shutdownNow();
    }
  }

  @Test
  void aLoginWithoutACodeIsRefusedWhenTwoFactorLoginIsSwitchedOnDuringTheHash() throws Exception {
    var user = createUser("owner@example.com", "correct-password-1", false);
    int sessionsBefore = sessions();
    blocking.close();
    ExecutorService executor = Executors.newSingleThreadExecutor();
    try {
      var login =
          CompletableFuture.supplyAsync(
              () -> login(newClient(), "owner@example.com", "correct-password-1"), executor);
      awaitWaiting(1);

      String secret = totpService.setup(user.getId()).secret();
      totpService.enable(user.getId(), Totp.code(secret, clock.instant().getEpochSecond()));
      blocking.open();

      var response = login.get();
      assertThat(response.getStatusCode().value()).isEqualTo(401);
      assertNoSession(response, sessionsBefore);
      assertThat(users.findById(user.getId()).orElseThrow().getFailedAttempts()).isZero();
    } finally {
      blocking.open();
      executor.shutdownNow();
    }
  }

  private int sessions() {
    return jdbc.queryForObject("select count(*) from spring_session", Integer.class);
  }

  private void assertNoSession(ResponseEntity<String> response, int sessionsBefore) {
    var cookies = response.getHeaders().get(HttpHeaders.SET_COOKIE);
    assertThat(cookies == null ? List.<String>of() : cookies)
        .noneMatch(line -> line.startsWith("NEPNHA_SESSION="));
    assertThat(sessions()).isEqualTo(sessionsBefore);
  }

  private void awaitWaiting(int expected) throws InterruptedException {
    long deadline = System.nanoTime() + Duration.ofSeconds(8).toNanos();
    while (blocking.waiting() < expected && System.nanoTime() < deadline) {
      Thread.sleep(50);
    }
    assertThat(blocking.waiting()).isEqualTo(expected);
  }
}
