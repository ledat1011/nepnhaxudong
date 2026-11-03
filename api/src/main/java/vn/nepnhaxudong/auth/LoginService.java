package vn.nepnhaxudong.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LoginService {

  /** Wrong passwords in a row that lock the account. */
  public static final int MAX_FAILED_ATTEMPTS = 5;

  public static final Duration LOCK_DURATION = Duration.ofMinutes(15);

  private final AppUserRepository users;
  private final LoginAttempts attempts;
  private final PasswordEncoder encoder;
  private final Clock clock;
  // Checked when the email is unknown or the user is disabled, so those answers take as long as a
  // wrong password and do not reveal which emails exist.
  private final String dummyHash;

  public LoginService(
      AppUserRepository users, LoginAttempts attempts, PasswordEncoder encoder, Clock clock) {
    this.users = users;
    this.attempts = attempts;
    this.encoder = encoder;
    this.clock = clock;
    this.dummyHash = encoder.encode("not-a-real-password");
  }

  /**
   * Checks the credentials and keeps the failed-attempt counter.
   *
   * <p>The password hash is slow, so it is computed while no database connection and no row lock is
   * held: the user is read without a lock (the read ends before the hash starts), the hash is
   * checked, and only then {@link LoginAttempts} records the result in a short transaction that
   * locks the row and reads the lock state again.
   *
   * <p>A user with two-factor login must also send a valid code. A missing code is refused without
   * counting (the password was right and the client has to ask the user for the code); a wrong code
   * counts as one failed attempt, like a wrong password.
   */
  public AppUser authenticate(String email, String password, String totpCode) {
    Instant now = clock.instant();
    AppUser user = users.findByEmail(AppUser.normalizeEmail(email)).orElse(null);
    if (user == null || !user.isEnabled()) {
      encoder.matches(password, dummyHash);
      throw new InvalidCredentialsException();
    }
    Instant lockedUntil = user.getLockedUntil();
    if (lockedUntil != null && now.isBefore(lockedUntil)) {
      throw new AccountLockedException();
    }
    return attempts.record(user.getId(), check(user, password, totpCode, now));
  }

  /** The slow part: no transaction is open here. */
  private CredentialCheck check(AppUser user, String password, String totpCode, Instant now) {
    if (!encoder.matches(password, user.getPasswordHash())) {
      return CredentialCheck.WRONG_PASSWORD;
    }
    if (user.isTotpEnabled()) {
      if (totpCode == null || totpCode.isBlank()) {
        return CredentialCheck.CODE_MISSING;
      }
      if (!Totp.verify(user.getTotpSecret(), totpCode.trim(), now.getEpochSecond())) {
        return CredentialCheck.WRONG_CODE;
      }
    }
    return CredentialCheck.PASSED;
  }

  /** The user of a session, or {@link SessionExpiredException} when the user was removed or disabled. */
  @Transactional(readOnly = true)
  public AppUser requireActive(long userId) {
    return users.findById(userId).filter(AppUser::isEnabled).orElseThrow(SessionExpiredException::new);
  }
}
