package vn.nepnhaxudong.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Creates the first admin at startup when the app_user table is empty. The email and password come
 * from the environment variables BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD. The admin must
 * change the password at the first login. The first admin is an owner ("Chủ"), who manages the
 * family accounts. The password is never logged.
 */
@Component
public class BootstrapAdmin implements ApplicationRunner {

  private static final Logger LOG = LoggerFactory.getLogger(BootstrapAdmin.class);
  private static final String DISPLAY_NAME = "Quản trị viên";

  private final AppUserRepository users;
  private final PasswordEncoder encoder;
  private final String email;
  private final String password;

  public BootstrapAdmin(
      AppUserRepository users,
      PasswordEncoder encoder,
      @Value("${bootstrap.admin.email:}") String email,
      @Value("${bootstrap.admin.password:}") String password) {
    this.users = users;
    this.encoder = encoder;
    this.email = email;
    this.password = password;
  }

  @Override
  public void run(ApplicationArguments args) {
    createIfEmpty();
  }

  /**
   * Not transactional on purpose: {@code count} and {@code save} each run in their own repository
   * transaction, and a unique-email conflict (another instance was faster) is caught below.
   */
  public void createIfEmpty() {
    if (users.count() > 0) {
      return;
    }
    if (email.isBlank() || password.isBlank()) {
      LOG.warn(
          "No user exists and BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD are not set: "
              + "nobody can log in to the admin area.");
      return;
    }
    try {
      var admin = AppUser.create(email, DISPLAY_NAME, encoder.encode(password), true);
      admin.setRole(UserRole.OWNER);
      users.save(admin);
    } catch (DataIntegrityViolationException e) {
      LOG.warn(
          "The first admin {} already exists: another instance created it first.",
          AppUser.normalizeEmail(email));
      return;
    }
    LOG.info("Created the first admin user {}", AppUser.normalizeEmail(email));
  }
}
