package vn.nepnhaxudong.auth;

/** Length limits of passwords. The maximum bounds the work of the Argon2 hash for one request. */
final class PasswordRules {

  static final int MIN_LENGTH = 12;
  static final int MAX_LENGTH = 256;

  private PasswordRules() {}
}
