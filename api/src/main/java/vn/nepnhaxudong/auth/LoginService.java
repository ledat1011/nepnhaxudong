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
   *
   * <p>A user with two-factor login must also send a valid code. A missing code is refused without
   * counting (the password was right and the client has to ask the user for the code); a wrong code
   * counts as one failed attempt, like a wrong password.
   */
  @Transactional(noRollbackFor = ApiException.class)
  public AppUser authenticate(String email, String password, String totpCode) {
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
      throw registerFailure(user, now) ? new AccountLockedException() : new InvalidCredentialsException();
    }

    if (user.isTotpEnabled()) {
      if (totpCode == null || totpCode.isBlank()) {
        throw new TotpRequiredException();
      }
      if (!Totp.verify(user.getTotpSecret(), totpCode.trim(), now.getEpochSecond())) {
        throw registerFailure(user, now) ? new AccountLockedException() : new InvalidTotpCodeException();
      }
    }

    user.setFailedAttempts(0);
    user.setLockedUntil(null);
    return user;
  }

  /** Counts one failed attempt, locks the account at the limit and returns true when it is now locked. */
  private static boolean registerFailure(AppUser user, Instant now) {
    int attempts = user.getFailedAttempts() + 1;
    user.setFailedAttempts(attempts);
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      user.setLockedUntil(now.plus(LOCK_DURATION));
      return true;
    }
    return false;
  }

  /** The user of a session, or {@link SessionExpiredException} when the user was removed or disabled. */
  @Transactional(readOnly = true)
  public AppUser requireActive(long userId) {
    return users.findById(userId).filter(AppUser::isEnabled).orElseThrow(SessionExpiredException::new);
  }
}
