package vn.nepnhaxudong.auth;

import java.time.Clock;
import java.time.Instant;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import vn.nepnhaxudong.common.ApiException;

/**
 * Records the result of one login attempt in a short transaction. {@link LoginService} hashes the
 * password first, without a database connection, and then calls this class. The row of the user is
 * locked here and the lock state is read again, because another attempt may have locked the
 * account while this one was hashing.
 */
@Component
class LoginAttempts {

  private final AppUserRepository users;
  private final Clock clock;

  LoginAttempts(AppUserRepository users, Clock clock) {
    this.users = users;
    this.clock = clock;
  }

  /**
   * Saves the counter, the lock and the result. The business exceptions must not roll the
   * transaction back: the counter and the lock have to be saved when the login fails.
   *
   * @param checked the credentials that {@code check} was computed from (read without a lock)
   * @param totpStep the TOTP step the code matched, or {@link Totp#NO_STEP} without a code
   */
  @Transactional(noRollbackFor = ApiException.class)
  AppUser record(long userId, CredentialSnapshot checked, CredentialCheck check, long totpStep) {
    AppUser user = users.findByIdForUpdate(userId).orElse(null);
    if (user == null || !user.isEnabled()) {
      throw new InvalidCredentialsException();
    }
    Instant now = clock.instant();
    Instant lockedUntil = user.getLockedUntil();
    if (lockedUntil != null && now.isBefore(lockedUntil)) {
      throw new AccountLockedException();
    }
    // The password and the two-factor state were checked without a lock. When they changed since
    // (a reset or change of the password, two-factor login switched on or off), the result is about
    // old credentials: refuse, count nothing and create no session.
    if (!checked.matches(user)) {
      throw new InvalidCredentialsException();
    }
    if (lockedUntil != null) {
      // The lock has expired: counting starts again from zero.
      user.setLockedUntil(null);
      user.setFailedAttempts(0);
    }
    // A code works once: a code of the step used last time, or of an earlier step, is a replay. The
    // check runs under the row lock, so two parallel logins with the same code cannot both pass.
    if (check == CredentialCheck.PASSED
        && user.isTotpEnabled()
        && user.getTotpLastStep() != null
        && totpStep <= user.getTotpLastStep()) {
      check = CredentialCheck.WRONG_CODE;
    }
    switch (check) {
      case WRONG_PASSWORD:
        throw registerFailure(user, now) ? new AccountLockedException() : new InvalidCredentialsException();
      case CODE_MISSING:
        throw new TotpRequiredException();
      case WRONG_CODE:
        throw registerFailure(user, now) ? new AccountLockedException() : new InvalidTotpCodeException();
      case PASSED:
        user.setFailedAttempts(0);
        user.setLockedUntil(null);
        if (user.isTotpEnabled()) {
          user.setTotpLastStep(totpStep);
        }
        return user;
      default:
        throw new IllegalStateException("Unknown check " + check);
    }
  }

  /** Counts one failed attempt, locks the account at the limit and returns true when it is now locked. */
  private static boolean registerFailure(AppUser user, Instant now) {
    int attempts = user.getFailedAttempts() + 1;
    user.setFailedAttempts(attempts);
    if (attempts >= LoginService.MAX_FAILED_ATTEMPTS) {
      user.setLockedUntil(now.plus(LoginService.LOCK_DURATION));
      return true;
    }
    return false;
  }
}
