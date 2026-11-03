package vn.nepnhaxudong.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.nepnhaxudong.common.ApiException;

@Service
public class LoginService {

  /** Wrong passwords in a row that lock the account. */
  public static final int MAX_FAILED_ATTEMPTS = 5;

  public static final Duration LOCK_DURATION = Duration.ofMinutes(15);

  private final AppUserRepository users;
  private final PasswordEncoder encoder;
  private final Clock clock;
  // Checked when the email is unknown or the user is disabled, so those answers take as long as a
  // wrong password and do not reveal which emails exist.
  private final String dummyHash;

  public LoginService(AppUserRepository users, PasswordEncoder encoder, Clock clock) {
    this.users = users;
    this.encoder = encoder;
    this.clock = clock;
    this.dummyHash = encoder.encode("not-a-real-password");
  }

  /**
   * Checks the credentials and keeps the failed-attempt counter. The business exceptions must not
   * roll the transaction back: the counter and the lock have to be saved when the login fails.
   */
  @Transactional(noRollbackFor = ApiException.class)
  public AppUser authenticate(String email, String password) {
    Instant now = clock.instant();
    AppUser user = users.findByEmailForUpdate(AppUser.normalizeEmail(email)).orElse(null);
    if (user == null || !user.isEnabled()) {
      encoder.matches(password, dummyHash);
      throw new InvalidCredentialsException();
    }

    Instant lockedUntil = user.getLockedUntil();
    if (lockedUntil != null) {
      if (now.isBefore(lockedUntil)) {
        throw new AccountLockedException();
      }
      // The lock has expired: counting starts again from zero.
      user.setLockedUntil(null);
      user.setFailedAttempts(0);
    }

    if (!encoder.matches(password, user.getPasswordHash())) {
      int attempts = user.getFailedAttempts() + 1;
      user.setFailedAttempts(attempts);
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        user.setLockedUntil(now.plus(LOCK_DURATION));
        throw new AccountLockedException();
      }
      throw new InvalidCredentialsException();
    }

    user.setFailedAttempts(0);
    user.setLockedUntil(null);
    return user;
  }

  /** The user of a session, or {@link SessionExpiredException} when the user was removed or disabled. */
  @Transactional(readOnly = true)
  public AppUser requireActive(long userId) {
    return users.findById(userId).filter(AppUser::isEnabled).orElseThrow(SessionExpiredException::new);
  }
}
