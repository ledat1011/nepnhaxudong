package vn.nepnhaxudong.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import vn.nepnhaxudong.MutableClock;
import vn.nepnhaxudong.TestClockConfig;
import vn.nepnhaxudong.TestcontainersConfig;

/**
 * Shared setup of the authentication tests. Every subclass uses the same Spring context (and so the
 * same database container); each test starts from an empty app_user table and a fresh clock.
 */
@SpringBootTest(
    webEnvironment = RANDOM_PORT,
    properties = {
      "bootstrap.admin.email=Admin@Example.com",
      "bootstrap.admin.password=first-password-1",
      // The test client talks plain HTTP, so the session cookie must not be Secure here.
      "server.servlet.session.cookie.secure=false"
    })
@AutoConfigureTestRestTemplate
@Import({TestcontainersConfig.class, TestClockConfig.class})
public abstract class AuthTestSupport {

  /**
   * Uploaded test images go to the system temp folder, never into the repository. The folder name
   * has a random part, so builds that run at the same time do not share it.
   */
  protected static final String MEDIA_DIR =
      System.getProperty("java.io.tmpdir") + "/nepnha-test-media-" + UUID.randomUUID();

  @DynamicPropertySource
  static void mediaFolder(DynamicPropertyRegistry registry) {
    registry.add("app.media.dir", () -> MEDIA_DIR);
  }

  static final String LOGIN_ERROR = "Email hoặc mật khẩu không đúng.";
  static final String LOCKED = "Tài khoản tạm khóa 15 phút vì đăng nhập sai nhiều lần.";

  @Autowired protected TestRestTemplate rest;
  @Autowired protected AppUserRepository users;
  @Autowired protected PasswordEncoder encoder;
  @Autowired protected MutableClock clock;

  @BeforeEach
  void resetState() {
    users.deleteAll();
    clock.set(Instant.now());
  }

  protected ApiClient newClient() {
    return new ApiClient(rest);
  }

  protected AppUser createUser(String email, String password, boolean mustChangePassword) {
    return users.save(
        AppUser.create(email, "Tester", encoder.encode(password), mustChangePassword));
  }

  /** Creates a user (email owner@example.com), logs in and fetches the CSRF token. */
  protected ApiClient loggedInClient() {
    createUser("owner@example.com", "correct-password-1", false);
    var client = newClient();
    assertThat(login(client, "owner@example.com", "correct-password-1").getStatusCode().value())
        .isEqualTo(200);
    client.fetchCsrf();
    return client;
  }

  protected ResponseEntity<String> login(ApiClient client, String email, String password) {
    return client.post("/auth/login", Map.of("email", email, "password", password));
  }
}
