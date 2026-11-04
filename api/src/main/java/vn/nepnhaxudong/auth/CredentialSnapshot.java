package vn.nepnhaxudong.auth;

import java.util.Objects;

/**
 * The stored credentials of a user as one login check read them: the password hash and the
 * two-factor state. {@link LoginAttempts} compares it with the locked row, so a login that was
 * checked against credentials that have changed since (a password reset or change, two-factor
 * login switched on or off) is refused and never gets a session.
 */
record CredentialSnapshot(String passwordHash, boolean totpEnabled, String totpSecret) {

  static CredentialSnapshot of(AppUser user) {
    return new CredentialSnapshot(user.getPasswordHash(), user.isTotpEnabled(), user.getTotpSecret());
  }

  boolean matches(AppUser user) {
    return passwordHash.equals(user.getPasswordHash())
        && totpEnabled == user.isTotpEnabled()
        && Objects.equals(totpSecret, user.getTotpSecret());
  }
}
